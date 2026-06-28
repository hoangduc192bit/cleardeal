import type { Address } from "viem";

export interface MarketplaceStream {
  id: string;
  name: string;
  providerName: string;
  providerWallet: Address;
  category: string;
  description: string;
  signals: string[];
  ratePerSecond: bigint;
  trustScore: number;
  freshness: string;
  status: "Online" | "Preview";
  bestFor: string;
  onchainEnabled: boolean;
  avatar: string;
}

const demoWallet1 = "0x211F3A615BAD89cCce98ba0E46aFd9Ed0786FdE5";
const demoWallet2 = "0x8f0c1014e7dcd26cebb15eb1c8e5640243171b3e";
const demoWallet3 = "0x3b6a8b1633d8ba4aeef87a0ddb4ea0e93bc8e88e";
const demoWallet4 = "0xfac1e2651f5f7ae29edb8261ee0dfdf498edcbbe";

export const streamCatalog: MarketplaceStream[] = [
  {
    id: "pulse-price-feed",
    name: "Pulse Price Feed",
    providerName: "Pulse Price Feed Agent",
    providerWallet: demoWallet1,
    category: "Market Prices",
    description: "BTC, ETH, and SOL live price data",
    signals: ["BTC", "ETH", "SOL"],
    ratePerSecond: 100n,
    trustScore: 92,
    freshness: "5 sec",
    status: "Online",
    bestFor: "Market risk monitoring",
    onchainEnabled: true,
    avatar: "/agents/pulse-price.png",
  },
  {
    id: "market-sentiment",
    name: "Market Sentiment Stream",
    providerName: "Mood Signal Agent",
    providerWallet: demoWallet2,
    category: "Sentiment",
    description: "Sentiment score and short market mood",
    signals: ["Sentiment", "Market mood"],
    ratePerSecond: 200n,
    trustScore: 88,
    freshness: "30 sec",
    status: "Online",
    bestFor: "Trading context",
    onchainEnabled: true,
    avatar: "/agents/market-sentiment.png",
  },
  {
    id: "stablecoin-yield",
    name: "Stablecoin Yield Stream",
    providerName: "Yield Radar Agent",
    providerWallet: demoWallet3,
    category: "Yield",
    description: "USDC and EURC yield and rate tracking",
    signals: ["USDC APY", "EURC APY"],
    ratePerSecond: 150n,
    trustScore: 90,
    freshness: "15 sec",
    status: "Online",
    bestFor: "Treasury allocation",
    onchainEnabled: true,
    avatar: "/agents/stablecoin-yield.png",
  },
  {
    id: "wallet-risk",
    name: "Wallet Risk Stream",
    providerName: "Wallet Guard Agent",
    providerWallet: demoWallet4,
    category: "Risk Scoring",
    description: "Wallet risk and behavior scoring",
    signals: ["Risk score", "Behavior"],
    ratePerSecond: 300n,
    trustScore: 94,
    freshness: "60 sec",
    status: "Online",
    bestFor: "Counterparty screening",
    onchainEnabled: true,
    avatar: "/agents/wallet-risk.png",
  },
];

export const pulseStream = streamCatalog[0];

export function getMarketplaceStream(id: string | null | undefined) {
  return streamCatalog.find((stream) => stream.id === id) ?? pulseStream;
}
