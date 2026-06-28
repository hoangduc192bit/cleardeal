import type { Address } from "viem";

import { demoAgents } from "@/lib/demo-agents";

export interface PaidStreamConfig {
  id: string;
  price: string;
  endpoint: string;
  wallet: Address;
  name: string;
}

export const paidStreamConfigs: Record<string, PaidStreamConfig> = {
  "pulse-price-feed": {
    id: "pulse-price-feed",
    price: "0.0001",
    endpoint: "/api/x402/pulse-price",
    wallet: demoAgents[0].wallet as Address,
    name: "Pulse Price Feed",
  },
  "market-sentiment": {
    id: "market-sentiment",
    price: "0.0002",
    endpoint: "/api/x402/market-sentiment",
    wallet: demoAgents[1].wallet as Address,
    name: "Market Sentiment",
  },
  "stablecoin-yield": {
    id: "stablecoin-yield",
    price: "0.00015",
    endpoint: "/api/x402/stablecoin-yield",
    wallet: demoAgents[2].wallet as Address,
    name: "Stablecoin Yield",
  },
  "wallet-risk": {
    id: "wallet-risk",
    price: "0.0003",
    endpoint: "/api/x402/wallet-risk",
    wallet: demoAgents[3].wallet as Address,
    name: "Wallet Risk",
  },
};

export function getPaidStreamConfig(streamId: string | null | undefined) {
  return paidStreamConfigs[streamId ?? ""] ?? paidStreamConfigs["pulse-price-feed"];
}
