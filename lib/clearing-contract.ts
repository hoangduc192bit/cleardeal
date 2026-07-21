import { isAddress, parseAbi, type Address } from "viem";

export const clearingHouseAbi = parseAbi([
  "function createCycle((address arbitrator,bytes32 metadataHash,uint64 evidenceDeadline,uint64 fundingDeadline,uint8 verifierThreshold) params,address[] participants,address[] verifiers,(address payer,address provider,uint256 amount,uint256 bondAmount,bytes32 specHash)[] obligationInputs) returns (uint256 cycleId)",
  "function postBond(uint256 cycleId,uint256 obligationId)",
  "function submitEvidence(uint256 cycleId,uint256 obligationId,bytes32 evidenceHash)",
  "function castVote(uint256 cycleId,uint256 obligationId,bool approved)",
  "function resolveObligation(uint256 cycleId,uint256 obligationId,bool passed)",
  "function closeCycle(uint256 cycleId)",
  "function fundNetPosition(uint256 cycleId)",
  "function settleCycle(uint256 cycleId)",
  "function defaultCycle(uint256 cycleId)",
  "function roleCycleCount(address account) view returns (uint256)",
  "function getCycleIds(address account,uint256 offset,uint256 limit) view returns (uint256[] result)",
  "function getParticipants(uint256 cycleId) view returns (address[])",
  "function getVerifiers(uint256 cycleId) view returns (address[])",
  "function cycles(uint256 cycleId) view returns (address creator,address arbitrator,bytes32 metadataHash,uint64 createdAt,uint64 evidenceDeadline,uint64 fundingDeadline,uint32 participantCount,uint32 verifierCount,uint32 obligationCount,uint32 finalizedCount,uint8 verifierThreshold,uint8 status,uint256 totalGross,uint256 clearedGross,uint256 totalNetDebit,uint256 fundedNet)",
  "function obligations(uint256 cycleId,uint256 obligationId) view returns (address payer,address provider,uint256 amount,uint256 bondAmount,bytes32 specHash,bytes32 evidenceHash,uint16 approveVotes,uint16 rejectVotes,bool bondPosted,uint8 status)",
  "function isParticipant(uint256 cycleId,address account) view returns (bool)",
  "function isVerifier(uint256 cycleId,address account) view returns (bool)",
  "function verifierVotes(uint256 cycleId,uint256 obligationId,address verifier) view returns (uint8)",
  "function netPositions(uint256 cycleId,address participant) view returns (int256)",
  "function netFunding(uint256 cycleId,address participant) view returns (uint256)",
  "function riskPassports(address account) view returns (uint64 passedObligations,uint64 failedObligations,uint64 fundedCycles,uint64 defaultedCycles,uint256 clearedVolume,uint256 slashedBond,uint256 netReceived)",
  "function usdc() view returns (address)",
  "event CycleCreated(uint256 indexed cycleId,address indexed creator,bytes32 indexed metadataHash,uint256 totalGross,uint256 obligationCount)",
  "event BondPosted(uint256 indexed cycleId,uint256 indexed obligationId,address indexed provider,uint256 amount)",
  "event EvidenceSubmitted(uint256 indexed cycleId,uint256 indexed obligationId,bytes32 evidenceHash)",
  "event VerificationVote(uint256 indexed cycleId,uint256 indexed obligationId,address indexed verifier,bool approved,uint256 approveVotes,uint256 rejectVotes)",
  "event ObligationFinalized(uint256 indexed cycleId,uint256 indexed obligationId,bool passed,address indexed decidedBy)",
  "event CycleCleared(uint256 indexed cycleId,uint256 clearedGross,uint256 totalNetDebit,uint256 liquiditySaved)",
  "event NetPositionFunded(uint256 indexed cycleId,address indexed participant,uint256 amount)",
  "event CycleSettled(uint256 indexed cycleId,uint256 clearedGross,uint256 totalNetDebit,uint256 liquiditySaved)",
  "event CycleDefaulted(uint256 indexed cycleId,uint256 requiredFunding,uint256 receivedFunding)",
]);

const configuredAddress = process.env.NEXT_PUBLIC_CLEARING_HOUSE_ADDRESS?.trim();
const configuredBlock = process.env.NEXT_PUBLIC_CLEARING_DEPLOYMENT_BLOCK?.trim();

export const clearingHouseAddress: Address | undefined =
  configuredAddress && isAddress(configuredAddress) ? configuredAddress : undefined;

export const clearingHouseConfigured = Boolean(clearingHouseAddress);
export const clearingDeploymentBlock = configuredBlock && /^\d+$/.test(configuredBlock)
  ? BigInt(configuredBlock)
  : undefined;
