// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ClearDealTreasury
/// @notice Approval-gated vendor payments in USDC for company expense requests.
/// @dev Arc Testnet release. This contract has not been professionally audited.
contract ClearDealTreasury is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum ExpenseStatus {
        Requested,
        ManagerApproved,
        ReadyForFinance,
        Paid,
        Rejected,
        Cancelled
    }

    struct Expense {
        address requester;
        address manager;
        address finance;
        address vendor;
        bytes32 metadataHash;
        bytes32 evidenceHash;
        bytes32 memoId;
        uint64 createdAt;
        uint256 approvedBudget;
        uint256 payoutAmount;
        ExpenseStatus status;
    }

    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidHash();
    error InvalidState();

    IERC20 public immutable usdc;
    uint256 public nextExpenseId;

    mapping(uint256 => Expense) public expenses;
    mapping(address => uint256[]) private roleExpenseIds;

    event ExpenseRequested(
        uint256 indexed expenseId,
        address indexed requester,
        address indexed vendor,
        bytes32 metadataHash,
        bytes32 memoId,
        uint256 approvedBudget
    );
    event ManagerDecision(
        uint256 indexed expenseId,
        address indexed manager,
        bool approved
    );
    event ExpenseEvidenceSubmitted(
        uint256 indexed expenseId,
        address indexed requester,
        bytes32 evidenceHash,
        uint256 payoutAmount
    );
    event ExpenseRejected(
        uint256 indexed expenseId,
        address indexed decidedBy
    );
    event ExpenseCancelled(
        uint256 indexed expenseId,
        address indexed requester
    );
    event ExpensePaid(
        uint256 indexed expenseId,
        address indexed finance,
        address indexed vendor,
        uint256 amount,
        bytes32 memoId
    );

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert InvalidAddress();
        usdc = IERC20(usdcAddress);
    }

    function createExpense(
        address manager,
        address finance,
        address vendor,
        uint256 approvedBudget,
        bytes32 metadataHash,
        bytes32 memoId
    ) external returns (uint256 expenseId) {
        if (
            manager == address(0) ||
            finance == address(0) ||
            vendor == address(0) ||
            vendor == msg.sender ||
            vendor == manager ||
            vendor == finance ||
            manager == msg.sender
        ) revert InvalidAddress();
        if (approvedBudget == 0) revert InvalidAmount();
        if (metadataHash == bytes32(0) || memoId == bytes32(0)) {
            revert InvalidHash();
        }

        expenseId = nextExpenseId++;
        expenses[expenseId] = Expense({
            requester: msg.sender,
            manager: manager,
            finance: finance,
            vendor: vendor,
            metadataHash: metadataHash,
            evidenceHash: bytes32(0),
            memoId: memoId,
            createdAt: uint64(block.timestamp),
            approvedBudget: approvedBudget,
            payoutAmount: 0,
            status: ExpenseStatus.Requested
        });

        _indexRole(msg.sender, expenseId);
        _indexRole(manager, expenseId);
        if (finance != manager) _indexRole(finance, expenseId);
        _indexRole(vendor, expenseId);

        emit ExpenseRequested(
            expenseId,
            msg.sender,
            vendor,
            metadataHash,
            memoId,
            approvedBudget
        );
    }

    function roleExpenseCount(address account) external view returns (uint256) {
        return roleExpenseIds[account].length;
    }

    function getExpenseIds(
        address account,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory result) {
        uint256 count = roleExpenseIds[account].length;
        if (offset >= count || limit == 0) return new uint256[](0);
        uint256 end = offset + limit;
        if (end > count) end = count;
        result = new uint256[](end - offset);
        for (uint256 index = offset; index < end; ++index) {
            result[index - offset] = roleExpenseIds[account][index];
        }
    }

    function managerDecision(uint256 expenseId, bool approved) external {
        Expense storage expense = _expense(expenseId);
        if (msg.sender != expense.manager) revert Unauthorized();
        if (expense.status != ExpenseStatus.Requested) revert InvalidState();

        if (approved) {
            expense.status = ExpenseStatus.ManagerApproved;
            emit ManagerDecision(expenseId, msg.sender, true);
        } else {
            expense.status = ExpenseStatus.Rejected;
            emit ManagerDecision(expenseId, msg.sender, false);
            emit ExpenseRejected(expenseId, msg.sender);
        }
    }

    function submitEvidence(
        uint256 expenseId,
        bytes32 evidenceHash,
        uint256 payoutAmount
    ) external {
        Expense storage expense = _expense(expenseId);
        if (msg.sender != expense.requester) revert Unauthorized();
        if (expense.status != ExpenseStatus.ManagerApproved) {
            revert InvalidState();
        }
        if (evidenceHash == bytes32(0)) revert InvalidHash();
        if (payoutAmount == 0 || payoutAmount > expense.approvedBudget) {
            revert InvalidAmount();
        }

        expense.evidenceHash = evidenceHash;
        expense.payoutAmount = payoutAmount;
        expense.status = ExpenseStatus.ReadyForFinance;
        emit ExpenseEvidenceSubmitted(
            expenseId,
            msg.sender,
            evidenceHash,
            payoutAmount
        );
    }

    function rejectByFinance(uint256 expenseId) external {
        Expense storage expense = _expense(expenseId);
        if (msg.sender != expense.finance) revert Unauthorized();
        if (expense.status != ExpenseStatus.ReadyForFinance) {
            revert InvalidState();
        }
        expense.status = ExpenseStatus.Rejected;
        emit ExpenseRejected(expenseId, msg.sender);
    }

    function cancelExpense(uint256 expenseId) external {
        Expense storage expense = _expense(expenseId);
        if (msg.sender != expense.requester) revert Unauthorized();
        if (expense.status != ExpenseStatus.Requested) revert InvalidState();
        expense.status = ExpenseStatus.Cancelled;
        emit ExpenseCancelled(expenseId, msg.sender);
    }

    function payExpense(uint256 expenseId) external nonReentrant {
        Expense storage expense = _expense(expenseId);
        if (msg.sender != expense.finance) revert Unauthorized();
        if (expense.status != ExpenseStatus.ReadyForFinance) {
            revert InvalidState();
        }

        expense.status = ExpenseStatus.Paid;
        usdc.safeTransferFrom(
            msg.sender,
            expense.vendor,
            expense.payoutAmount
        );
        emit ExpensePaid(
            expenseId,
            msg.sender,
            expense.vendor,
            expense.payoutAmount,
            expense.memoId
        );
    }

    function _expense(
        uint256 expenseId
    ) private view returns (Expense storage expense) {
        expense = expenses[expenseId];
        if (expense.requester == address(0)) revert InvalidState();
    }

    function _indexRole(address account, uint256 expenseId) private {
        roleExpenseIds[account].push(expenseId);
    }
}
