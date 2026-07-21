import { isAddress, type Address } from "viem";

export const ARC_TESTNET_USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

const configuredAddress = process.env.NEXT_PUBLIC_CLEARDEAL_ESCROW_ADDRESS?.trim();
const configuredUsdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS?.trim();

export const clearDealEscrowAddress: Address | undefined =
  configuredAddress && isAddress(configuredAddress) ? configuredAddress : undefined;

export const clearDealUsdcAddress: Address =
  configuredUsdcAddress && isAddress(configuredUsdcAddress)
    ? configuredUsdcAddress
    : ARC_TESTNET_USDC_ADDRESS;

export const clearDealEscrowConfigured = Boolean(clearDealEscrowAddress);

const configuredDeploymentBlock = process.env.NEXT_PUBLIC_CLEARDEAL_DEPLOYMENT_BLOCK?.trim();
export const clearDealDeploymentBlock = configuredDeploymentBlock && /^\d+$/.test(configuredDeploymentBlock)
  ? BigInt(configuredDeploymentBlock)
  : 52_593_658n;

export const clearDealEscrowAbi = [
  {
    type: "function",
    name: "createDeal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "seller", type: "address" },
      { name: "arbitrator", type: "address" },
      { name: "metadataHash", type: "bytes32" },
      { name: "refundDeadline", type: "uint64" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "dueDates", type: "uint64[]" },
    ],
    outputs: [{ name: "dealId", type: "uint256" }],
  },
  { type: "function", name: "fundDeal", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }], outputs: [] },
  { type: "function", name: "submitMilestone", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }, { name: "milestoneId", type: "uint256" }, { name: "deliverableHash", type: "bytes32" }], outputs: [] },
  { type: "function", name: "releaseMilestone", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }, { name: "milestoneId", type: "uint256" }], outputs: [] },
  { type: "function", name: "requestRefund", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }], outputs: [] },
  { type: "function", name: "approveRefund", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimExpiredRefund", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }], outputs: [] },
  { type: "function", name: "openDispute", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }, { name: "reasonHash", type: "bytes32" }], outputs: [] },
  { type: "function", name: "resolveDispute", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }, { name: "sellerAward", type: "uint256" }, { name: "resolutionHash", type: "bytes32" }], outputs: [] },
  { type: "function", name: "participantDealCount", stateMutability: "view", inputs: [{ name: "participant", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "getDealIds", stateMutability: "view", inputs: [{ name: "participant", type: "address" }, { name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }], outputs: [{ name: "result", type: "uint256[]" }] },
  {
    type: "function",
    name: "deals",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "buyer", type: "address" },
      { name: "seller", type: "address" },
      { name: "arbitrator", type: "address" },
      { name: "totalAmount", type: "uint256" },
      { name: "releasedAmount", type: "uint256" },
      { name: "metadataHash", type: "bytes32" },
      { name: "createdAt", type: "uint64" },
      { name: "refundDeadline", type: "uint64" },
      { name: "milestoneCount", type: "uint32" },
      { name: "status", type: "uint8" },
      { name: "refundRequested", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "milestones",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    outputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "dueAt", type: "uint64" },
      { name: "deliverableHash", type: "bytes32" },
      { name: "status", type: "uint8" },
    ],
  },
  { type: "function", name: "usdc", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "event", name: "DealCreated", inputs: [{ name: "dealId", type: "uint256", indexed: true }, { name: "buyer", type: "address", indexed: true }, { name: "seller", type: "address", indexed: true }, { name: "totalAmount", type: "uint256", indexed: false }, { name: "metadataHash", type: "bytes32", indexed: false }] },
  { type: "event", name: "DealFunded", inputs: [{ name: "dealId", type: "uint256", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "MilestoneSubmitted", inputs: [{ name: "dealId", type: "uint256", indexed: true }, { name: "milestoneId", type: "uint256", indexed: true }, { name: "deliverableHash", type: "bytes32", indexed: false }] },
  { type: "event", name: "MilestoneReleased", inputs: [{ name: "dealId", type: "uint256", indexed: true }, { name: "milestoneId", type: "uint256", indexed: true }, { name: "recipient", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "RefundRequested", inputs: [{ name: "dealId", type: "uint256", indexed: true }] },
  { type: "event", name: "DealRefunded", inputs: [{ name: "dealId", type: "uint256", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "DisputeOpened", inputs: [{ name: "dealId", type: "uint256", indexed: true }, { name: "openedBy", type: "address", indexed: true }, { name: "reasonHash", type: "bytes32", indexed: false }] },
  { type: "event", name: "DisputeResolved", inputs: [{ name: "dealId", type: "uint256", indexed: true }, { name: "sellerAward", type: "uint256", indexed: false }, { name: "buyerRefund", type: "uint256", indexed: false }, { name: "resolutionHash", type: "bytes32", indexed: false }] },
] as const;
