// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ClearDealEscrow
/// @notice USDC milestone escrow for buyer/seller agreements.
contract ClearDealEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum DealStatus { Draft, Funded, Completed, Refunded, Disputed, Resolved }
    enum MilestoneStatus { Pending, Submitted, Released, Refunded }

    struct Deal {
        address buyer;
        address seller;
        address arbitrator;
        uint256 totalAmount;
        uint256 releasedAmount;
        bytes32 metadataHash;
        uint64 createdAt;
        uint64 refundDeadline;
        uint32 milestoneCount;
        DealStatus status;
        bool refundRequested;
    }

    struct Milestone {
        address recipient;
        uint256 amount;
        uint64 dueAt;
        bytes32 deliverableHash;
        MilestoneStatus status;
    }

    error Unauthorized();
    error InvalidAddress();
    error InvalidArrayLength();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidMetadata();
    error InvalidState();
    error InvalidMilestone();
    error RefundNotRequested();

    IERC20 public immutable usdc;
    uint256 public nextDealId;

    mapping(uint256 => Deal) public deals;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(address => uint256[]) private participantDealIds;

    event DealCreated(uint256 indexed dealId, address indexed buyer, address indexed seller, uint256 totalAmount, bytes32 metadataHash);
    event DealFunded(uint256 indexed dealId, uint256 amount);
    event MilestoneSubmitted(uint256 indexed dealId, uint256 indexed milestoneId, bytes32 deliverableHash);
    event MilestoneReleased(uint256 indexed dealId, uint256 indexed milestoneId, address indexed recipient, uint256 amount);
    event RefundRequested(uint256 indexed dealId);
    event DealRefunded(uint256 indexed dealId, uint256 amount);
    event DisputeOpened(uint256 indexed dealId, address indexed openedBy, bytes32 reasonHash);
    event DisputeResolved(uint256 indexed dealId, uint256 sellerAward, uint256 buyerRefund, bytes32 resolutionHash);

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert InvalidAddress();
        usdc = IERC20(usdcAddress);
    }

    function createDeal(
        address seller,
        address arbitrator,
        bytes32 metadataHash,
        uint64 refundDeadline,
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
        if (count == 0 || count > 20 || recipients.length != count || dueDates.length != count) revert InvalidArrayLength();
        if (metadataHash == bytes32(0)) revert InvalidMetadata();
        if (refundDeadline <= block.timestamp) revert InvalidDeadline();

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
            metadataHash: metadataHash,
            createdAt: uint64(block.timestamp),
            refundDeadline: refundDeadline,
            milestoneCount: uint32(count),
            status: DealStatus.Draft,
            refundRequested: false
        });
        participantDealIds[msg.sender].push(dealId);
        participantDealIds[seller].push(dealId);
        participantDealIds[arbitrator].push(dealId);
        emit DealCreated(dealId, msg.sender, seller, total, metadataHash);
    }

    function participantDealCount(address participant) external view returns (uint256) {
        return participantDealIds[participant].length;
    }

    function getDealIds(address participant, uint256 offset, uint256 limit) external view returns (uint256[] memory result) {
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
        milestone.deliverableHash = deliverableHash;
        milestone.status = MilestoneStatus.Submitted;
        emit MilestoneSubmitted(dealId, milestoneId, deliverableHash);
    }

    function releaseMilestone(uint256 dealId, uint256 milestoneId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer) revert Unauthorized();
        if (deal.status != DealStatus.Funded) revert InvalidState();
        Milestone storage milestone = _milestone(deal, dealId, milestoneId);
        if (milestone.status != MilestoneStatus.Submitted) revert InvalidState();

        milestone.status = MilestoneStatus.Released;
        deal.releasedAmount += milestone.amount;
        if (deal.releasedAmount == deal.totalAmount) deal.status = DealStatus.Completed;
        usdc.safeTransfer(milestone.recipient, milestone.amount);
        emit MilestoneReleased(dealId, milestoneId, milestone.recipient, milestone.amount);
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
        _refundRemaining(dealId, deal);
    }

    function claimExpiredRefund(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer) revert Unauthorized();
        if (deal.status != DealStatus.Funded) revert InvalidState();
        if (block.timestamp <= deal.refundDeadline) revert InvalidDeadline();
        _refundRemaining(dealId, deal);
    }

    function openDispute(uint256 dealId, bytes32 reasonHash) external {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.buyer && msg.sender != deal.seller) revert Unauthorized();
        if (deal.status != DealStatus.Funded || reasonHash == bytes32(0)) revert InvalidState();
        deal.status = DealStatus.Disputed;
        emit DisputeOpened(dealId, msg.sender, reasonHash);
    }

    function resolveDispute(uint256 dealId, uint256 sellerAward, bytes32 resolutionHash) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.arbitrator) revert Unauthorized();
        if (deal.status != DealStatus.Disputed || resolutionHash == bytes32(0)) revert InvalidState();
        uint256 remaining = deal.totalAmount - deal.releasedAmount;
        if (sellerAward > remaining) revert InvalidAmount();
        uint256 buyerRefund = remaining - sellerAward;

        deal.status = DealStatus.Resolved;
        deal.releasedAmount += sellerAward;
        _markUnreleasedRefunded(dealId, deal.milestoneCount);
        if (sellerAward != 0) usdc.safeTransfer(deal.seller, sellerAward);
        if (buyerRefund != 0) usdc.safeTransfer(deal.buyer, buyerRefund);
        emit DisputeResolved(dealId, sellerAward, buyerRefund, resolutionHash);
    }

    function _refundRemaining(uint256 dealId, Deal storage deal) private {
        uint256 refund = deal.totalAmount - deal.releasedAmount;
        deal.status = DealStatus.Refunded;
        _markUnreleasedRefunded(dealId, deal.milestoneCount);
        if (refund != 0) usdc.safeTransfer(deal.buyer, refund);
        emit DealRefunded(dealId, refund);
    }

    function _markUnreleasedRefunded(uint256 dealId, uint256 count) private {
        for (uint256 index; index < count; ++index) {
            Milestone storage milestone = milestones[dealId][index];
            if (milestone.status != MilestoneStatus.Released) milestone.status = MilestoneStatus.Refunded;
        }
    }

    function _milestone(Deal storage deal, uint256 dealId, uint256 milestoneId) private view returns (Milestone storage milestone) {
        if (milestoneId >= deal.milestoneCount) revert InvalidMilestone();
        milestone = milestones[dealId][milestoneId];
    }
}
