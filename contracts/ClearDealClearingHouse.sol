// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ClearDealClearingHouse
/// @notice Verification-gated USDC clearing with provider performance bonds and net settlement.
/// @dev Arc Testnet release. This contract has not been professionally audited.
contract ClearDealClearingHouse is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_PARTICIPANTS = 20;
    uint256 public constant MAX_VERIFIERS = 10;
    uint256 public constant MAX_OBLIGATIONS = 20;

    enum CycleStatus { Active, Funding, Settled, Defaulted }
    enum ObligationStatus { AwaitingBond, Bonded, Submitted, Passed, Failed }

    struct CycleParams {
        address arbitrator;
        bytes32 metadataHash;
        uint64 evidenceDeadline;
        uint64 fundingDeadline;
        uint8 verifierThreshold;
    }

    struct ObligationInput {
        address payer;
        address provider;
        uint256 amount;
        uint256 bondAmount;
        bytes32 specHash;
    }

    struct Cycle {
        address creator;
        address arbitrator;
        bytes32 metadataHash;
        uint64 createdAt;
        uint64 evidenceDeadline;
        uint64 fundingDeadline;
        uint32 participantCount;
        uint32 verifierCount;
        uint32 obligationCount;
        uint32 finalizedCount;
        uint8 verifierThreshold;
        CycleStatus status;
        uint256 totalGross;
        uint256 clearedGross;
        uint256 totalNetDebit;
        uint256 fundedNet;
    }

    struct Obligation {
        address payer;
        address provider;
        uint256 amount;
        uint256 bondAmount;
        bytes32 specHash;
        bytes32 evidenceHash;
        uint16 approveVotes;
        uint16 rejectVotes;
        bool bondPosted;
        ObligationStatus status;
    }

    struct RiskPassport {
        uint64 passedObligations;
        uint64 failedObligations;
        uint64 fundedCycles;
        uint64 defaultedCycles;
        uint256 clearedVolume;
        uint256 slashedBond;
        uint256 netReceived;
    }

    error Unauthorized();
    error InvalidAddress();
    error InvalidArrayLength();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidHash();
    error InvalidState();
    error DuplicateAddress();
    error AlreadyVoted();
    error NothingToFund();
    error FundingIncomplete();

    IERC20 public immutable usdc;
    uint256 public nextCycleId;

    mapping(uint256 => Cycle) public cycles;
    mapping(uint256 => mapping(uint256 => Obligation)) public obligations;
    mapping(uint256 => address[]) private cycleParticipants;
    mapping(uint256 => address[]) private cycleVerifiers;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => bool)) public isVerifier;
    mapping(uint256 => mapping(uint256 => mapping(address => uint8))) public verifierVotes;
    mapping(uint256 => mapping(address => int256)) public netPositions;
    mapping(uint256 => mapping(address => uint256)) public netFunding;
    mapping(address => uint256[]) private roleCycleIds;
    mapping(address => RiskPassport) public riskPassports;

    event CycleCreated(
        uint256 indexed cycleId,
        address indexed creator,
        bytes32 indexed metadataHash,
        uint256 totalGross,
        uint256 obligationCount
    );
    event BondPosted(uint256 indexed cycleId, uint256 indexed obligationId, address indexed provider, uint256 amount);
    event EvidenceSubmitted(uint256 indexed cycleId, uint256 indexed obligationId, bytes32 evidenceHash);
    event VerificationVote(
        uint256 indexed cycleId,
        uint256 indexed obligationId,
        address indexed verifier,
        bool approved,
        uint256 approveVotes,
        uint256 rejectVotes
    );
    event ObligationFinalized(uint256 indexed cycleId, uint256 indexed obligationId, bool passed, address indexed decidedBy);
    event CycleCleared(uint256 indexed cycleId, uint256 clearedGross, uint256 totalNetDebit, uint256 liquiditySaved);
    event NetPositionFunded(uint256 indexed cycleId, address indexed participant, uint256 amount);
    event CycleSettled(uint256 indexed cycleId, uint256 clearedGross, uint256 totalNetDebit, uint256 liquiditySaved);
    event CycleDefaulted(uint256 indexed cycleId, uint256 requiredFunding, uint256 receivedFunding);

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert InvalidAddress();
        usdc = IERC20(usdcAddress);
    }

    function createCycle(
        CycleParams calldata params,
        address[] calldata participants,
        address[] calldata verifiers,
        ObligationInput[] calldata obligationInputs
    ) external returns (uint256 cycleId) {
        uint256 participantCount = participants.length;
        uint256 verifierCount = verifiers.length;
        uint256 obligationCount = obligationInputs.length;
        if (
            participantCount < 2 || participantCount > MAX_PARTICIPANTS ||
            verifierCount == 0 || verifierCount > MAX_VERIFIERS ||
            obligationCount == 0 || obligationCount > MAX_OBLIGATIONS
        ) revert InvalidArrayLength();
        if (params.arbitrator == address(0)) revert InvalidAddress();
        if (params.metadataHash == bytes32(0)) revert InvalidHash();
        if (params.evidenceDeadline <= block.timestamp || params.fundingDeadline <= params.evidenceDeadline) {
            revert InvalidDeadline();
        }
        if (params.verifierThreshold == 0 || params.verifierThreshold > verifierCount) revert InvalidAmount();

        cycleId = nextCycleId++;
        bool creatorIncluded;
        for (uint256 index; index < participantCount; ++index) {
            address participant = participants[index];
            if (participant == address(0) || participant == params.arbitrator) revert InvalidAddress();
            if (isParticipant[cycleId][participant]) revert DuplicateAddress();
            isParticipant[cycleId][participant] = true;
            cycleParticipants[cycleId].push(participant);
            roleCycleIds[participant].push(cycleId);
            if (participant == msg.sender) creatorIncluded = true;
        }
        if (!creatorIncluded) revert Unauthorized();

        roleCycleIds[params.arbitrator].push(cycleId);
        for (uint256 index; index < verifierCount; ++index) {
            address verifier = verifiers[index];
            if (
                verifier == address(0) || verifier == params.arbitrator ||
                isParticipant[cycleId][verifier]
            ) revert InvalidAddress();
            if (isVerifier[cycleId][verifier]) revert DuplicateAddress();
            isVerifier[cycleId][verifier] = true;
            cycleVerifiers[cycleId].push(verifier);
            roleCycleIds[verifier].push(cycleId);
        }

        uint256 totalGross;
        for (uint256 index; index < obligationCount; ++index) {
            ObligationInput calldata input = obligationInputs[index];
            if (
                input.payer == input.provider ||
                !isParticipant[cycleId][input.payer] ||
                !isParticipant[cycleId][input.provider]
            ) revert InvalidAddress();
            if (input.amount == 0 || input.bondAmount == 0) revert InvalidAmount();
            if (input.specHash == bytes32(0)) revert InvalidHash();
            totalGross += input.amount;
            obligations[cycleId][index] = Obligation({
                payer: input.payer,
                provider: input.provider,
                amount: input.amount,
                bondAmount: input.bondAmount,
                specHash: input.specHash,
                evidenceHash: bytes32(0),
                approveVotes: 0,
                rejectVotes: 0,
                bondPosted: false,
                status: ObligationStatus.AwaitingBond
            });
        }

        cycles[cycleId] = Cycle({
            creator: msg.sender,
            arbitrator: params.arbitrator,
            metadataHash: params.metadataHash,
            createdAt: uint64(block.timestamp),
            evidenceDeadline: params.evidenceDeadline,
            fundingDeadline: params.fundingDeadline,
            participantCount: uint32(participantCount),
            verifierCount: uint32(verifierCount),
            obligationCount: uint32(obligationCount),
            finalizedCount: 0,
            verifierThreshold: params.verifierThreshold,
            status: CycleStatus.Active,
            totalGross: totalGross,
            clearedGross: 0,
            totalNetDebit: 0,
            fundedNet: 0
        });
        emit CycleCreated(cycleId, msg.sender, params.metadataHash, totalGross, obligationCount);
    }

    function roleCycleCount(address account) external view returns (uint256) {
        return roleCycleIds[account].length;
    }

    function getCycleIds(address account, uint256 offset, uint256 limit) external view returns (uint256[] memory result) {
        uint256 count = roleCycleIds[account].length;
        if (offset >= count || limit == 0) return new uint256[](0);
        uint256 end = offset + limit;
        if (end > count) end = count;
        result = new uint256[](end - offset);
        for (uint256 index = offset; index < end; ++index) result[index - offset] = roleCycleIds[account][index];
    }

    function getParticipants(uint256 cycleId) external view returns (address[] memory) {
        return cycleParticipants[cycleId];
    }

    function getVerifiers(uint256 cycleId) external view returns (address[] memory) {
        return cycleVerifiers[cycleId];
    }

    function postBond(uint256 cycleId, uint256 obligationId) external nonReentrant {
        Cycle storage cycle = cycles[cycleId];
        Obligation storage obligation = _obligation(cycle, cycleId, obligationId);
        if (cycle.status != CycleStatus.Active || block.timestamp > cycle.evidenceDeadline) revert InvalidState();
        if (msg.sender != obligation.provider) revert Unauthorized();
        if (obligation.status != ObligationStatus.AwaitingBond) revert InvalidState();
        obligation.bondPosted = true;
        obligation.status = ObligationStatus.Bonded;
        usdc.safeTransferFrom(msg.sender, address(this), obligation.bondAmount);
        emit BondPosted(cycleId, obligationId, msg.sender, obligation.bondAmount);
    }

    function submitEvidence(uint256 cycleId, uint256 obligationId, bytes32 evidenceHash) external {
        Cycle storage cycle = cycles[cycleId];
        Obligation storage obligation = _obligation(cycle, cycleId, obligationId);
        if (cycle.status != CycleStatus.Active || block.timestamp > cycle.evidenceDeadline) revert InvalidState();
        if (msg.sender != obligation.provider) revert Unauthorized();
        if (obligation.status != ObligationStatus.Bonded || evidenceHash == bytes32(0)) revert InvalidState();
        obligation.evidenceHash = evidenceHash;
        obligation.status = ObligationStatus.Submitted;
        emit EvidenceSubmitted(cycleId, obligationId, evidenceHash);
    }

    function castVote(uint256 cycleId, uint256 obligationId, bool approved) external {
        Cycle storage cycle = cycles[cycleId];
        Obligation storage obligation = _obligation(cycle, cycleId, obligationId);
        if (cycle.status != CycleStatus.Active || block.timestamp > cycle.evidenceDeadline) revert InvalidState();
        if (!isVerifier[cycleId][msg.sender]) revert Unauthorized();
        if (obligation.status != ObligationStatus.Submitted) revert InvalidState();
        if (verifierVotes[cycleId][obligationId][msg.sender] != 0) revert AlreadyVoted();

        if (approved) {
            verifierVotes[cycleId][obligationId][msg.sender] = 1;
            obligation.approveVotes += 1;
        } else {
            verifierVotes[cycleId][obligationId][msg.sender] = 2;
            obligation.rejectVotes += 1;
        }
        emit VerificationVote(
            cycleId,
            obligationId,
            msg.sender,
            approved,
            obligation.approveVotes,
            obligation.rejectVotes
        );

        if (obligation.approveVotes >= cycle.verifierThreshold) _finalize(cycleId, obligationId, cycle, obligation, true);
        else if (obligation.rejectVotes >= cycle.verifierThreshold) _finalize(cycleId, obligationId, cycle, obligation, false);
    }

    function resolveObligation(uint256 cycleId, uint256 obligationId, bool passed) external {
        Cycle storage cycle = cycles[cycleId];
        Obligation storage obligation = _obligation(cycle, cycleId, obligationId);
        if (cycle.status != CycleStatus.Active || msg.sender != cycle.arbitrator) revert Unauthorized();
        if (obligation.status != ObligationStatus.Submitted) revert InvalidState();
        _finalize(cycleId, obligationId, cycle, obligation, passed);
    }

    function closeCycle(uint256 cycleId) external nonReentrant {
        Cycle storage cycle = cycles[cycleId];
        if (cycle.status != CycleStatus.Active) revert InvalidState();
        if (cycle.finalizedCount != cycle.obligationCount && block.timestamp <= cycle.evidenceDeadline) revert InvalidDeadline();

        uint256 obligationCount = cycle.obligationCount;
        uint256 clearedGross;
        for (uint256 index; index < obligationCount; ++index) {
            Obligation storage obligation = obligations[cycleId][index];
            if (
                obligation.status == ObligationStatus.AwaitingBond ||
                obligation.status == ObligationStatus.Bonded ||
                obligation.status == ObligationStatus.Submitted
            ) {
                obligation.status = ObligationStatus.Failed;
                cycle.finalizedCount += 1;
                emit ObligationFinalized(cycleId, index, false, msg.sender);
            }
            if (obligation.status == ObligationStatus.Passed) {
                netPositions[cycleId][obligation.payer] -= int256(obligation.amount);
                netPositions[cycleId][obligation.provider] += int256(obligation.amount);
                clearedGross += obligation.amount;
            }
        }

        address[] storage participants = cycleParticipants[cycleId];
        uint256 totalNetDebit;
        for (uint256 index; index < participants.length; ++index) {
            int256 position = netPositions[cycleId][participants[index]];
            if (position < 0) totalNetDebit += uint256(-position);
        }
        cycle.clearedGross = clearedGross;
        cycle.totalNetDebit = totalNetDebit;
        cycle.status = CycleStatus.Funding;
        emit CycleCleared(cycleId, clearedGross, totalNetDebit, clearedGross - totalNetDebit);
        if (totalNetDebit == 0) _settleCycle(cycleId, cycle);
    }

    function fundNetPosition(uint256 cycleId) external nonReentrant {
        Cycle storage cycle = cycles[cycleId];
        if (cycle.status != CycleStatus.Funding || block.timestamp > cycle.fundingDeadline) revert InvalidState();
        int256 position = netPositions[cycleId][msg.sender];
        if (position >= 0 || netFunding[cycleId][msg.sender] != 0) revert NothingToFund();
        uint256 amount = uint256(-position);
        netFunding[cycleId][msg.sender] = amount;
        cycle.fundedNet += amount;
        riskPassports[msg.sender].fundedCycles += 1;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit NetPositionFunded(cycleId, msg.sender, amount);
    }

    function settleCycle(uint256 cycleId) external nonReentrant {
        Cycle storage cycle = cycles[cycleId];
        if (cycle.status != CycleStatus.Funding) revert InvalidState();
        if (cycle.fundedNet != cycle.totalNetDebit) revert FundingIncomplete();
        _settleCycle(cycleId, cycle);
    }

    function defaultCycle(uint256 cycleId) external nonReentrant {
        Cycle storage cycle = cycles[cycleId];
        if (cycle.status != CycleStatus.Funding || block.timestamp <= cycle.fundingDeadline) revert InvalidDeadline();
        if (cycle.fundedNet == cycle.totalNetDebit) revert InvalidState();
        cycle.status = CycleStatus.Defaulted;

        address[] storage participants = cycleParticipants[cycleId];
        for (uint256 index; index < participants.length; ++index) {
            address participant = participants[index];
            uint256 funded = netFunding[cycleId][participant];
            if (funded != 0) {
                netFunding[cycleId][participant] = 0;
                usdc.safeTransfer(participant, funded);
            } else if (netPositions[cycleId][participant] < 0) {
                riskPassports[participant].defaultedCycles += 1;
            }
        }
        _distributeBonds(cycleId, cycle.obligationCount);
        emit CycleDefaulted(cycleId, cycle.totalNetDebit, cycle.fundedNet);
    }

    function _settleCycle(uint256 cycleId, Cycle storage cycle) private {
        cycle.status = CycleStatus.Settled;
        address[] storage participants = cycleParticipants[cycleId];
        for (uint256 index; index < participants.length; ++index) {
            address participant = participants[index];
            int256 position = netPositions[cycleId][participant];
            if (position > 0) {
                uint256 amount = uint256(position);
                riskPassports[participant].netReceived += amount;
                usdc.safeTransfer(participant, amount);
            }
        }
        _distributeBonds(cycleId, cycle.obligationCount);
        emit CycleSettled(cycleId, cycle.clearedGross, cycle.totalNetDebit, cycle.clearedGross - cycle.totalNetDebit);
    }

    function _distributeBonds(uint256 cycleId, uint256 obligationCount) private {
        for (uint256 index; index < obligationCount; ++index) {
            Obligation storage obligation = obligations[cycleId][index];
            RiskPassport storage passport = riskPassports[obligation.provider];
            if (obligation.status == ObligationStatus.Passed) {
                passport.passedObligations += 1;
                passport.clearedVolume += obligation.amount;
                if (obligation.bondAmount != 0) usdc.safeTransfer(obligation.provider, obligation.bondAmount);
            } else {
                passport.failedObligations += 1;
                if (obligation.bondPosted && obligation.bondAmount != 0) {
                    passport.slashedBond += obligation.bondAmount;
                    usdc.safeTransfer(obligation.payer, obligation.bondAmount);
                }
            }
        }
    }

    function _finalize(
        uint256 cycleId,
        uint256 obligationId,
        Cycle storage cycle,
        Obligation storage obligation,
        bool passed
    ) private {
        obligation.status = passed ? ObligationStatus.Passed : ObligationStatus.Failed;
        cycle.finalizedCount += 1;
        emit ObligationFinalized(cycleId, obligationId, passed, msg.sender);
    }

    function _obligation(
        Cycle storage cycle,
        uint256 cycleId,
        uint256 obligationId
    ) private view returns (Obligation storage obligation) {
        if (obligationId >= cycle.obligationCount) revert InvalidArrayLength();
        obligation = obligations[cycleId][obligationId];
    }
}
