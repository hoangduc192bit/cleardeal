// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StreamPayment
 * @author ArcStream
 * @notice Handles per-second USDC streaming payments between subscribers and data providers.
 * @dev Subscribers deposit USDC into escrow. On stopStream(), owed amount is sent to
 *      the provider and remaining balance is refunded to the subscriber.
 */
contract StreamPayment is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    /// @notice The USDC token contract used for all payments
    IERC20 public immutable usdc;

    /// @notice Represents an active or historical subscription
    struct Subscription {
        address subscriber;
        address agentWallet;
        uint256 pricePerSecond;
        uint256 startTime;
        uint256 depositAmount;
        bool isActive;
    }

    /// @notice Subscription storage keyed by keccak256(subscriber, agentWallet)
    mapping(bytes32 => Subscription) public subscriptions;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a new stream subscription starts
    event StreamStarted(
        address indexed subscriber,
        address indexed agent,
        uint256 deposit,
        uint256 pricePerSecond,
        uint256 startTime
    );

    /// @notice Emitted when a subscription is stopped
    event StreamStopped(
        address indexed subscriber,
        address indexed agent,
        uint256 paid,
        uint256 refund
    );

    /// @notice Emitted when USDC payment is settled to a provider
    event PaymentSettled(address indexed agent, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ZeroAddress();
    error ZeroPrice();
    error ZeroDeposit();
    error AlreadySubscribed();
    error NoActiveStream();

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param _usdc Address of the USDC ERC20 token
     */
    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
    }

    // ─── External Functions ───────────────────────────────────────────────────

    /**
     * @notice Start a USDC stream to a data provider
     * @param agentWallet The provider's wallet address
     * @param pricePerSecond USDC amount paid per second (in 6-decimal units)
     * @param depositAmount Total USDC deposited upfront into escrow
     */
    function startStream(
        address agentWallet,
        uint256 pricePerSecond,
        uint256 depositAmount
    ) external nonReentrant whenNotPaused {
        if (agentWallet == address(0)) revert ZeroAddress();
        if (pricePerSecond == 0) revert ZeroPrice();
        if (depositAmount == 0) revert ZeroDeposit();

        bytes32 key = _subscriptionKey(msg.sender, agentWallet);
        if (subscriptions[key].isActive) revert AlreadySubscribed();

        usdc.safeTransferFrom(msg.sender, address(this), depositAmount);

        subscriptions[key] = Subscription({
            subscriber: msg.sender,
            agentWallet: agentWallet,
            pricePerSecond: pricePerSecond,
            startTime: block.timestamp,
            depositAmount: depositAmount,
            isActive: true
        });

        emit StreamStarted(msg.sender, agentWallet, depositAmount, pricePerSecond, block.timestamp);
    }

    /**
     * @notice Stop an active stream, settle payment to provider and refund remainder
     * @param agentWallet The provider's wallet address to stop streaming to
     */
    function stopStream(address agentWallet) external nonReentrant {
        bytes32 key = _subscriptionKey(msg.sender, agentWallet);
        Subscription storage sub = subscriptions[key];
        if (!sub.isActive) revert NoActiveStream();

        uint256 elapsed = block.timestamp - sub.startTime;
        uint256 owed = elapsed * sub.pricePerSecond;
        uint256 toPay = owed > sub.depositAmount ? sub.depositAmount : owed;
        uint256 toRefund = sub.depositAmount - toPay;

        // CEI: Update state BEFORE external calls to prevent reentrancy
        sub.isActive = false;

        if (toPay > 0) {
            usdc.safeTransfer(sub.agentWallet, toPay);
            emit PaymentSettled(sub.agentWallet, toPay);
        }
        if (toRefund > 0) {
            usdc.safeTransfer(sub.subscriber, toRefund);
        }

        emit StreamStopped(msg.sender, agentWallet, toPay, toRefund);
    }

    /**
     * @notice View remaining USDC balance for an active subscription
     * @param subscriber The subscriber's address
     * @param agentWallet The provider's address
     * @return Remaining USDC balance in 6-decimal units
     */
    function getRemainingBalance(
        address subscriber,
        address agentWallet
    ) external view returns (uint256) {
        Subscription memory sub = subscriptions[_subscriptionKey(subscriber, agentWallet)];
        if (!sub.isActive) return 0;
        uint256 used = (block.timestamp - sub.startTime) * sub.pricePerSecond;
        if (used >= sub.depositAmount) return 0;
        return sub.depositAmount - used;
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /// @notice Pause the contract in case of emergency (owner only)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract (owner only)
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency token rescue — only for tokens accidentally sent to this contract.
     * @dev Explicitly CANNOT withdraw USDC (the payment token) to prevent rug pulls.
     *      USDC in this contract belongs to active subscriber escrows.
     * @param token ERC20 token to rescue (must NOT be USDC)
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(usdc), "Cannot rescue payment token");
        IERC20(token).safeTransfer(owner(), amount);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _subscriptionKey(
        address subscriber,
        address agentWallet
    ) private pure returns (bytes32) {
        return keccak256(abi.encode(subscriber, agentWallet));
    }
}
