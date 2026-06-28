// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentBudgetGuard
 * @author ArcStream
 * @notice On-chain daily USDC spending cap for agent wallets.
 * @dev The agent wallet approves this contract, then calls spend(). The guard
 *      checks the configured cap and transfers USDC directly to the provider.
 *      x402 verification still sees a normal USDC Transfer(provider, amount)
 *      in the transaction receipt.
 */
contract AgentBudgetGuard is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    struct BudgetPolicy {
        uint256 dailyLimit;
        uint256 spentToday;
        uint64 dayStartedAt;
        bool active;
    }

    mapping(address agent => BudgetPolicy policy) public policies;
    mapping(address agent => mapping(bytes32 paymentId => bool used)) public usedPaymentIds;

    event BudgetPolicySet(address indexed agent, uint256 dailyLimit, bool active);
    event AgentPayment(
        address indexed agent,
        address indexed provider,
        uint256 amount,
        uint256 spentToday,
        uint256 dailyLimit,
        bytes32 indexed paymentId
    );

    error ZeroAddress();
    error ZeroAmount();
    error PolicyInactive();
    error DailyLimitExceeded();
    error PaymentAlreadyUsed();

    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
    }

    function setPolicy(address agent, uint256 dailyLimit, bool active) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();

        BudgetPolicy storage policy = policies[agent];
        policy.dailyLimit = dailyLimit;
        policy.active = active;
        if (policy.dayStartedAt == 0) {
            policy.dayStartedAt = uint64(block.timestamp);
        }

        emit BudgetPolicySet(agent, dailyLimit, active);
    }

    function spend(
        address provider,
        uint256 amount,
        bytes32 paymentId
    ) external nonReentrant whenNotPaused {
        if (provider == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (usedPaymentIds[msg.sender][paymentId]) revert PaymentAlreadyUsed();

        BudgetPolicy storage policy = policies[msg.sender];
        if (!policy.active) revert PolicyInactive();

        if (_shouldResetDay(policy.dayStartedAt)) {
            policy.spentToday = 0;
            policy.dayStartedAt = uint64(block.timestamp);
        }

        uint256 nextSpent = policy.spentToday + amount;
        if (nextSpent > policy.dailyLimit) revert DailyLimitExceeded();

        usedPaymentIds[msg.sender][paymentId] = true;
        policy.spentToday = nextSpent;

        usdc.safeTransferFrom(msg.sender, provider, amount);

        emit AgentPayment(
            msg.sender,
            provider,
            amount,
            nextSpent,
            policy.dailyLimit,
            paymentId
        );
    }

    function remainingToday(address agent) external view returns (uint256) {
        BudgetPolicy memory policy = policies[agent];
        if (!policy.active) return 0;
        if (_shouldResetDay(policy.dayStartedAt)) return policy.dailyLimit;
        if (policy.spentToday >= policy.dailyLimit) return 0;
        return policy.dailyLimit - policy.spentToday;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _shouldResetDay(uint64 dayStartedAt) private view returns (bool) {
        return dayStartedAt == 0 || block.timestamp >= uint256(dayStartedAt) + 1 days;
    }
}
