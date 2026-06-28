// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @author ArcStream
 * @notice Permissionless on-chain registry for ArcStream data providers.
 * @dev Providers call registerAgent() to list their data stream. The owner can
 *      deactivate agents in case of abuse.
 */
contract AgentRegistry is Ownable {
    /// @notice Data about a registered agent/provider
    struct DataAgent {
        address wallet;
        string name;
        string streamType;
        string description;
        uint256 pricePerSecond;
        bool isActive;
    }

    /// @notice Mapping from agent ID to agent data
    mapping(uint256 => DataAgent) public agents;

    /// @notice Total number of agents ever registered
    uint256 public agentCount;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a new agent is registered
    event AgentRegistered(uint256 indexed agentId, address indexed wallet, string name);

    /// @notice Emitted when an agent is deactivated
    event AgentDeactivated(uint256 indexed agentId);

    /// @notice Emitted when an agent is reactivated
    event AgentReactivated(uint256 indexed agentId);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error EmptyName();
    error EmptyStreamType();
    error ZeroPrice();
    error AgentNotFound();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── External Functions ───────────────────────────────────────────────────

    /**
     * @notice Register a new data agent on-chain
     * @param name Human-readable name for the data stream
     * @param streamType Category identifier (e.g. "price-feed", "sentiment")
     * @param description Short description of the data provided
     * @param pricePerSecond USDC amount per second (6-decimal units)
     * @return id The assigned agent ID
     */
    function registerAgent(
        string calldata name,
        string calldata streamType,
        string calldata description,
        uint256 pricePerSecond
    ) external returns (uint256 id) {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(streamType).length == 0) revert EmptyStreamType();
        if (pricePerSecond == 0) revert ZeroPrice();

        id = agentCount;
        unchecked { ++agentCount; } // Safe: agentCount will never overflow uint256

        agents[id] = DataAgent({
            wallet: msg.sender,
            name: name,
            streamType: streamType,
            description: description,
            pricePerSecond: pricePerSecond,
            isActive: true
        });

        emit AgentRegistered(id, msg.sender, name);
    }

    /**
     * @notice Get a single agent by ID
     * @param id Agent ID to look up
     * @return Agent struct data
     */
    function getAgent(uint256 id) external view returns (DataAgent memory) {
        if (id >= agentCount) revert AgentNotFound();
        return agents[id];
    }

    /**
     * @notice Get all registered agents (paginated to avoid DoS)
     * @param offset Starting index
     * @param limit Maximum number of agents to return
     * @return result Array of agent structs
     */
    function getAgents(
        uint256 offset,
        uint256 limit
    ) external view returns (DataAgent[] memory result) {
        uint256 total = agentCount;
        if (offset >= total) return new DataAgent[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        result = new DataAgent[](end - offset);
        for (uint256 i = offset; i < end; ) {
            result[i - offset] = agents[i];
            unchecked { ++i; }
        }
    }

    /**
     * @notice Get ALL agents — use getAgents() for large registries
     * @dev May hit gas limit if agentCount is very large
     */
    function getAllAgents() external view returns (DataAgent[] memory all) {
        all = new DataAgent[](agentCount);
        for (uint256 i; i < agentCount; ) {
            all[i] = agents[i];
            unchecked { ++i; }
        }
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /**
     * @notice Deactivate an agent (owner only, for abuse prevention)
     * @param id Agent ID to deactivate
     */
    function deactivateAgent(uint256 id) external onlyOwner {
        if (id >= agentCount) revert AgentNotFound();
        agents[id].isActive = false;
        emit AgentDeactivated(id);
    }

    /**
     * @notice Reactivate a previously deactivated agent (owner only)
     * @param id Agent ID to reactivate
     */
    function reactivateAgent(uint256 id) external onlyOwner {
        if (id >= agentCount) revert AgentNotFound();
        agents[id].isActive = true;
        emit AgentReactivated(id);
    }
}
