// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ClearDealEscrowV2
/// @notice USDC milestone escrow with bounded reviews, automatic release, and milestone-level disputes.
contract ClearDealEscrowV2 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint32 public constant MIN_REVIEW_PERIOD = 1 hours;
    uint32 public constant MAX_REVIEW_PERIOD = 30 days;
    uint8 public constant MAX_ALLOWED_REVISIONS = 10;

    enum DealStatus {
        Draft,
        Funded,
        Completed,
        Refunded
    }

    enum MilestoneStatus {
        Pending,
        Submitted,
        Released,
        Refunded,
        Disputed,
        Resolved
    }

    struct Deal {
        address buyer;
        address seller;
        address arbitrator;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 refundedAmount;
        bytes32 metadataHash;
        uint64 createdAt;
        uint64 refundDeadline;
        uint32 reviewPeriod;
        uint32 milestoneCount;
        uint8 maxRevisions;
        DealStatus status;
        bool refundRequested;
    }

    struct Milestone {
        address recipient;
        uint256 amount;
        uint64 dueAt;
        uint64 submittedAt;
        uint64 reviewDeadline;
        uint8 revisionCount;
        bytes32 deliverableHash;
        MilestoneStatus status;
    }

    error Unauthorized();
    error InvalidAddress();
    error InvalidArrayLength();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidMetadata();
    error InvalidReviewPolicy();
    error InvalidState();
    error InvalidMilestone();
    error RefundNotRequested();
    error ReviewPeriodActive();
    error RevisionLimitReached();
    error NothingToRefund();

    IERC20 public immutable usdc;
    uint256 public nextDealId;

    mapping(uint256 => Deal) public deals;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(address => uint256[]) private participantDealIds;

    event DealCreated(
        uint256 indexed dealId,
        address indexed buyer,
        address indexed seller,
        uint256 totalAmount,
        bytes32 metadataHash,
        uint32 reviewPeriod,
        uint8 maxRevisions
    );
    event DealFunded(uint256 indexed dealId, uint256 amount);
    event MilestoneSubmitted(
        uint256 indexed dealId,
        uint256 indexed milestoneId,
        bytes32 deliverableHash,
        uint64 submittedAt,
        uint64 reviewDeadline,
        uint8 revisionCount
    );
    event ChangesRequested(
        uint256 indexed dealId,
        uint256 indexed milestoneId,
        address indexed requestedBy,
        bytes32 reasonHash,
        uint8 revisionCount
    );
    event MilestoneReleased(
        uint256 indexed dealId,
        uint256 indexed milestoneId,
        address indexed recipient,
        uint256 amount,
        bool automatic
    );
    event MilestoneDisputed(
        uint256 indexed dealId,
        uint256 indexed milestoneId,
        address indexed openedBy,
        bytes32 reasonHash
    );
    event MilestoneResolved(
        uint256 indexed dealId,
        uint256 indexed milestoneId,
        uint256 sellerAward,
        uint256 buyerRefund,
        bytes32 resolutionHash
    );
    event RefundRequested(uint256 indexed dealId);
    event DealRefunded(uint256 indexed dealId, uint256 amount);

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert InvalidAddress();
        usdc = IERC20(usdcAddress);
    }

    function createDeal(
        address seller,
        address arbitrator,
        bytes32 metadataHash,
        uint64 refundDeadline,
        uint32 reviewPeriod,
        uint8 maxRevisions,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint64[] calldata dueDates
    ) external returns (uint256 dealId) {
        uint256 count = amounts.length;
        if (
            seller == address(0) ||
            arbitrator == address(0) ||
            seller == msg.sender ||
            arbitrator == msg.sender ||
            arbitrator == seller
        ) revert InvalidAddress();
        if (count == 0 || count > 20 || recipients.length != count || dueDates.length != count) {
            revert InvalidArrayLength();
        }
        if (metadataHash == bytes32(0)) revert InvalidMetadata();
        if (refundDeadline <= block.timestamp) revert InvalidDeadline();
        if (
            reviewPeriod < MIN_REVIEW_PERIOD ||
            reviewPeriod > MAX_REVIEW_PERIOD ||
            maxRevisions > MAX_ALLOWED_REVISIONS
        ) revert InvalidReviewPolicy();

        uint256 total;
        dealId = nextDealId++;
        for (uint256 index; index < count; ++index) {
            if (recipients[index] == address(0)) revert InvalidAddress();
            if (amounts[index] == 0) revert InvalidAmount();
            if (dueDates[index] <= block.timestamp || dueDates[index] > refundDeadline) revert InvalidDeadline();
            total += amounts[index];
            milestones[dealId][index] = Milestone({
                recipient: recipients[index],
                amount: amounts[index],
                dueAt: dueDates[index],
                submittedAt: 0,
                reviewDeadline: 0,
                revisionCount: 0,
                deliverableHash: bytes32(0),
                status: MilestoneStatus.Pending
            });
        }

        deals[dealId] = Deal({
            buyer: msg.sender,
            seller: seller,
            arbitrator: arbitrator,
            totalAmount: total,
            releasedAmount: 0,
            refundedAmount: 0,
            metadataHash: metadataHash,
            createdAt: uint64(block.timestamp),
            refundDeadline: refundDeadline,
            reviewPeriod: reviewPeriod,
            milestoneCount: uint32(count),
            maxRevisions: maxRevisions,
            status: DealStatus.Draft,
            refundRequested: false
        });
        participantDealIds[msg.sender].push(dealId);
        participantDealIds[seller].push(dealId);
        participantDealIds[arbitrator].push(dealId);
        emit DealCreated(dealId, msg.sender, seller, total, metadataHash, reviewPeriod, maxRevisions);
    }

    function participantDealCount(address participant) external view returns (uint256) {
        return participantDealIds[participant].length;
    }

    function getDealIds(
        address participant,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory result) {
        uint256 count = participantDealIds[participant].length;
        if (offset >= count || limit == 0) return new uint256[](0);
        uint256 end = offset + limit;
        if (end > count) end = count;
        result = new uint256[](end - offset);
        for (uint256 index = offset; index < end; ++index) {
            result[index - offset] = participantDealIds[participant][index];
        }
    }

    function fundDeal(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer) revert Unauthorized();
        if (deal.status != DealStatus.Draft) revert InvalidState();
        deal.status = DealStatus.Funded;
        usdc.safeTransferFrom(msg.sender, address(this), deal.totalAmount);
        emit DealFunded(dealId, deal.totalAmount);
    }

    function submitMilestone(uint256 dealId, uint256 milestoneId, bytes32 deliverableHash) external {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.seller) revert Unauthorized();
        if (deal.status != DealStatus.Funded) revert InvalidState();
        Milestone storage milestone = _milestone(deal, dealId, milestoneId);
        if (milestone.status != MilestoneStatus.Pending || deliverableHash == bytes32(0)) revert InvalidState();

        uint64 submittedAt = uint64(block.timestamp);
        uint64 reviewDeadline = submittedAt + deal.reviewPeriod;
        milestone.deliverableHash = deliverableHash;
        milestone.submittedAt = submittedAt;
        milestone.reviewDeadline = reviewDeadline;
        milestone.status = MilestoneStatus.Submitted;
        emit MilestoneSubmitted(
            dealId,
            milestoneId,
            deliverableHash,
            submittedAt,
            reviewDeadline,
            milestone.revisionCount
        );
    }

    function requestChanges(uint256 dealId, uint256 milestoneId, bytes32 reasonHash) external {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer) revert Unauthorized();
        if (deal.status != DealStatus.Funded || reasonHash == bytes32(0)) revert InvalidState();
        Milestone storage milestone = _milestone(deal, dealId, milestoneId);
        if (milestone.status != MilestoneStatus.Submitted) revert InvalidState();
        if (block.timestamp >= milestone.reviewDeadline) revert InvalidDeadline();
        if (milestone.revisionCount >= deal.maxRevisions) revert RevisionLimitReached();

        unchecked {
            milestone.revisionCount += 1;
        }
        milestone.deliverableHash = bytes32(0);
        milestone.submittedAt = 0;
        milestone.reviewDeadline = 0;
        milestone.status = MilestoneStatus.Pending;
        emit ChangesRequested(dealId, milestoneId, msg.sender, reasonHash, milestone.revisionCount);
    }

    function releaseMilestone(uint256 dealId, uint256 milestoneId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer) revert Unauthorized();
        _releaseMilestone(deal, dealId, milestoneId, false);
    }

    function finalizeMilestone(uint256 dealId, uint256 milestoneId) external nonReentrant {
        Deal storage deal = deals[dealId];
        Milestone storage milestone = _milestone(deal, dealId, milestoneId);
        if (milestone.status != MilestoneStatus.Submitted) revert InvalidState();
        if (block.timestamp < milestone.reviewDeadline) revert ReviewPeriodActive();
        _releaseMilestone(deal, dealId, milestoneId, true);
    }

    function openMilestoneDispute(uint256 dealId, uint256 milestoneId, bytes32 reasonHash) external {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer && msg.sender != deal.seller) revert Unauthorized();
        if (deal.status != DealStatus.Funded || reasonHash == bytes32(0)) revert InvalidState();
        Milestone storage milestone = _milestone(deal, dealId, milestoneId);
        if (milestone.status != MilestoneStatus.Submitted) revert InvalidState();
        if (block.timestamp >= milestone.reviewDeadline) revert InvalidDeadline();
        milestone.status = MilestoneStatus.Disputed;
        emit MilestoneDisputed(dealId, milestoneId, msg.sender, reasonHash);
    }

    function resolveMilestoneDispute(
        uint256 dealId,
        uint256 milestoneId,
        uint256 sellerAward,
        bytes32 resolutionHash
    ) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.arbitrator) revert Unauthorized();
        if (deal.status != DealStatus.Funded || resolutionHash == bytes32(0)) revert InvalidState();
        Milestone storage milestone = _milestone(deal, dealId, milestoneId);
        if (milestone.status != MilestoneStatus.Disputed) revert InvalidState();
        if (sellerAward > milestone.amount) revert InvalidAmount();

        uint256 buyerRefund = milestone.amount - sellerAward;
        milestone.status = MilestoneStatus.Resolved;
        deal.releasedAmount += sellerAward;
        deal.refundedAmount += buyerRefund;
        _completeIfSettled(deal);

        if (sellerAward != 0) usdc.safeTransfer(milestone.recipient, sellerAward);
        if (buyerRefund != 0) usdc.safeTransfer(deal.buyer, buyerRefund);
        emit MilestoneResolved(dealId, milestoneId, sellerAward, buyerRefund, resolutionHash);
    }

    function requestRefund(uint256 dealId) external {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer) revert Unauthorized();
        if (deal.status != DealStatus.Funded) revert InvalidState();
        deal.refundRequested = true;
        emit RefundRequested(dealId);
    }

    function approveRefund(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.seller) revert Unauthorized();
        if (deal.status != DealStatus.Funded) revert InvalidState();
        if (!deal.refundRequested) revert RefundNotRequested();
        uint256 refund = _markRefundable(dealId, deal, false);
        if (refund == 0) revert NothingToRefund();
        deal.refundedAmount += refund;
        _completeIfSettled(deal);
        usdc.safeTransfer(deal.buyer, refund);
        emit DealRefunded(dealId, refund);
    }

    /// @notice After the overall deadline, only never-submitted milestones can be reclaimed.
    /// Submitted or disputed work remains protected by its review/dispute flow.
    function claimExpiredRefund(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer) revert Unauthorized();
        if (deal.status != DealStatus.Funded) revert InvalidState();
        if (block.timestamp <= deal.refundDeadline) revert InvalidDeadline();
        uint256 refund = _markRefundable(dealId, deal, true);
        if (refund == 0) revert NothingToRefund();
        deal.refundedAmount += refund;
        _completeIfSettled(deal);
        usdc.safeTransfer(deal.buyer, refund);
        emit DealRefunded(dealId, refund);
    }

    function _releaseMilestone(
        Deal storage deal,
        uint256 dealId,
        uint256 milestoneId,
        bool automatic
    ) private {
        if (deal.status != DealStatus.Funded) revert InvalidState();
        Milestone storage milestone = _milestone(deal, dealId, milestoneId);
        if (milestone.status != MilestoneStatus.Submitted) revert InvalidState();

        milestone.status = MilestoneStatus.Released;
        deal.releasedAmount += milestone.amount;
        _completeIfSettled(deal);
        usdc.safeTransfer(milestone.recipient, milestone.amount);
        emit MilestoneReleased(dealId, milestoneId, milestone.recipient, milestone.amount, automatic);
    }

    function _markRefundable(
        uint256 dealId,
        Deal storage deal,
        bool pendingOnly
    ) private returns (uint256 refund) {
        for (uint256 index; index < deal.milestoneCount; ++index) {
            Milestone storage milestone = milestones[dealId][index];
            bool refundable = milestone.status == MilestoneStatus.Pending;
            if (!pendingOnly) {
                refundable =
                    refundable ||
                    milestone.status == MilestoneStatus.Submitted ||
                    milestone.status == MilestoneStatus.Disputed;
            }
            if (refundable) {
                milestone.status = MilestoneStatus.Refunded;
                refund += milestone.amount;
            }
        }
    }

    function _completeIfSettled(Deal storage deal) private {
        if (deal.releasedAmount + deal.refundedAmount != deal.totalAmount) return;
        deal.status = deal.releasedAmount == 0 ? DealStatus.Refunded : DealStatus.Completed;
    }

    function _milestone(
        Deal storage deal,
        uint256 dealId,
        uint256 milestoneId
    ) private view returns (Milestone storage milestone) {
        if (milestoneId >= deal.milestoneCount) revert InvalidMilestone();
        milestone = milestones[dealId][milestoneId];
    }
}
