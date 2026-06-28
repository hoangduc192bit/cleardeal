import { createPublicClient, http, type Address } from "viem";

import { arcTestnet } from "@/config/chain";

export const agentRegistryAddress =
  (process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as Address | undefined) ??
  "0x522a52526697A6F99401F7A83007d52A3f35B22c";

export const streamPaymentAddress =
  (process.env.NEXT_PUBLIC_STREAM_PAYMENT_ADDRESS as Address | undefined) ??
  "0x06161b24F05EB35dD76F7D6F0d0fCb1D91A0810f";

export const agentBudgetGuardAddress =
  process.env.NEXT_PUBLIC_AGENT_BUDGET_GUARD_ADDRESS as Address | undefined;

export const usdcAddress =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS as Address | undefined) ??
  "0x3600000000000000000000000000000000000000";

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(arcTestnet.rpcUrls.default.http[0]),
});

export const agentRegistryAbi = [
  {
    type: "function",
    name: "agentCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAllAgents",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "wallet", type: "address" },
          { name: "name", type: "string" },
          { name: "streamType", type: "string" },
          { name: "description", type: "string" },
          { name: "pricePerSecond", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "registerAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "streamType", type: "string" },
      { name: "description", type: "string" },
      { name: "pricePerSecond", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "wallet", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
    ],
  },
] as const;

export const streamPaymentAbi = [
  {
    type: "function",
    name: "subscriptions",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "subscriber", type: "address" },
      { name: "agentWallet", type: "address" },
      { name: "pricePerSecond", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "depositAmount", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "startStream",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentWallet", type: "address" },
      { name: "pricePerSecond", type: "uint256" },
      { name: "depositAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "stopStream",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentWallet", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getRemainingBalance",
    stateMutability: "view",
    inputs: [
      { name: "subscriber", type: "address" },
      { name: "agentWallet", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "StreamStarted",
    inputs: [
      { name: "subscriber", type: "address", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "deposit", type: "uint256", indexed: false },
      { name: "pricePerSecond", type: "uint256", indexed: false },
      { name: "startTime", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StreamStopped",
    inputs: [
      { name: "subscriber", type: "address", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "paid", type: "uint256", indexed: false },
      { name: "refund", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PaymentSettled",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const agentBudgetGuardAbi = [
  {
    type: "function",
    name: "policies",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [
      { name: "dailyLimit", type: "uint256" },
      { name: "spentToday", type: "uint256" },
      { name: "dayStartedAt", type: "uint64" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "remainingToday",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "spend",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "paymentId", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "dailyLimit", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
] as const;
