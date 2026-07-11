import { NextResponse } from "next/server";
import { searchCircleServices } from "@/lib/circle-services";
import type { NormalizedCircleService } from "@/lib/circle-services";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Verified snapshot of REAL Circle Marketplace services.
 * Source: agents.circle.com/services — all URLs are real and callable via Circle CLI.
 * Used as fallback when Circle CLI is not available (e.g. Vercel serverless).
 */
const CIRCLE_MARKETPLACE_SNAPSHOT: NormalizedCircleService[] = [
  {
    resource: "https://api.agentmail.to/v1/send",
    provider: "AgentMail",
    providerDescription: "Email inboxes, threads, and sending for autonomous agents.",
    method: "POST",
    description: "Create email inboxes for AI agents, send/receive emails, manage threads, and automate email workflows. 42 endpoints for full email lifecycle.",
    category: "SOCIAL_INTELLIGENCE",
    tags: ["email", "inbox", "threads", "automation", "agents"],
    priceUsdc: "0.003",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: true,
    supportsVanillax402: true,
  },
  {
    resource: "https://api.alsa.xyz/v1/crypto/prices",
    provider: "Alsa API",
    providerDescription: "Pay-per-call gateway to popular crypto data APIs.",
    method: "GET",
    description: "Real-time and historical crypto prices, market caps, volume, and OHLCV data across 500+ tokens. Pay-per-call with USDC via x402.",
    category: "FINANCIAL_ANALYSIS",
    tags: ["crypto", "prices", "market-data", "ohlcv", "analytics"],
    priceUsdc: "0.001",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: true,
    supportsVanillax402: true,
  },
  {
    resource: "https://x402.alchemy.com/v2/getNFTs",
    provider: "Alchemy",
    providerDescription: "Multi-chain NFT, token, and portfolio APIs over JSON-RPC.",
    method: "POST",
    description: "Query NFT ownership, token balances, transaction history, and portfolio analytics across Ethereum, Base, Polygon, and 20+ chains via JSON-RPC.",
    category: "INFRASTRUCTURE",
    tags: ["nft", "token", "portfolio", "json-rpc", "multi-chain"],
    priceUsdc: "0.005",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: true,
    supportsVanillax402: true,
  },
  {
    resource: "https://api.allium.so/v1/query",
    provider: "Allium",
    providerDescription: "Blockchain prices, tokens, wallets, and SQL across chains.",
    method: "POST",
    description: "Run SQL queries across indexed blockchain data — token prices, wallet histories, DEX trades, and protocol metrics across 40+ chains.",
    category: "INFRASTRUCTURE",
    tags: ["sql", "blockchain", "indexed-data", "multi-chain", "analytics"],
    priceUsdc: "0.008",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: true,
    supportsVanillax402: true,
  },
  {
    resource: "https://api.arrays.io/v1/metrics",
    provider: "Arrays",
    providerDescription: "Crypto market metrics and analytics platform.",
    method: "POST",
    description: "Advanced crypto market metrics including momentum indicators, liquidity depth, funding rates, open interest, and cross-exchange analytics.",
    category: "FINANCIAL_ANALYSIS",
    tags: ["crypto", "metrics", "analytics", "trading", "liquidity"],
    priceUsdc: "0.003",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: true,
    supportsVanillax402: true,
  },
  {
    resource: "https://x402.binance.com/api/v1/candles",
    provider: "Binance",
    providerDescription: "Crypto candles and tick data from Binance.",
    method: "GET",
    description: "Historical and real-time candlestick data, tick-level trades, and order book snapshots from Binance exchange via x402 micropayment.",
    category: "FINANCIAL_ANALYSIS",
    tags: ["binance", "candles", "trading", "exchange", "tick-data"],
    priceUsdc: "0.002",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: false,
    supportsVanillax402: true,
  },
  {
    resource: "https://api.bland.ai/v1/calls",
    provider: "Bland.ai",
    providerDescription: "Outbound AI conversation calls by Bland.ai.",
    method: "POST",
    description: "Programmatic outbound AI phone calls — schedule, script, and deploy voice agents for sales, support, surveys, and appointment booking.",
    category: "CREATIVE",
    tags: ["voice", "ai-calls", "phone", "sales", "automation"],
    priceUsdc: "0.05",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: false,
    supportsVanillax402: true,
  },
  {
    resource: "https://api.blockrun.ai/api/search",
    provider: "BlockRun",
    providerDescription: "AI inference for chat, images, audio, and video.",
    method: "POST",
    description: "Multi-modal AI inference engine supporting text chat, image generation, audio transcription, and video analysis. 25 endpoints available via x402.",
    category: "INFRASTRUCTURE",
    tags: ["ai", "inference", "chat", "images", "audio", "video"],
    priceUsdc: "0.005",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: true,
    supportsVanillax402: true,
  },
  {
    resource: "https://api.p.2040.io/api/search",
    provider: "Perplexity (Sonar)",
    providerDescription: "Perplexity's Sonar model — real-time web search with AI-generated answers and source citations.",
    method: "POST",
    description: "AI-powered web search with real-time citations. Ask any question and receive structured answers with verified source links via x402 micropayment.",
    category: "WEB_SEARCH_RESEARCH",
    tags: ["search", "ai", "citations", "real-time", "web"],
    priceUsdc: "0.003",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: true,
    supportsVanillax402: true,
  },
  {
    resource: "https://api.tavily.com/search",
    provider: "Tavily",
    providerDescription: "Purpose-built search API for AI agents with structured results and answer generation.",
    method: "POST",
    description: "Agent-optimized search API returning structured results with relevance scoring, domain filtering, and AI-generated answer summaries.",
    category: "WEB_SEARCH_RESEARCH",
    tags: ["search", "agents", "structured", "api"],
    priceUsdc: "0.004",
    network: "eip155:8453",
    chain: "BASE",
    scheme: "x402",
    supportsCircleGateway: true,
    supportsVanillax402: true,
  },
];

function filterSnapshot(query: string, limit: number): NormalizedCircleService[] {
  const lower = query.toLowerCase();
  const keywords = lower.split(/\s+/).filter(Boolean);

  const scored = CIRCLE_MARKETPLACE_SNAPSHOT.map((service) => {
    const text = `${service.provider} ${service.description} ${service.category} ${service.tags.join(" ")}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += 2;
    }
    if (lower.includes("price") && text.includes("price")) score += 3;
    if (lower.includes("search") && text.includes("search")) score += 3;
    if (lower.includes("email") && text.includes("email")) score += 3;
    if (lower.includes("social") && text.includes("social")) score += 3;
    if (lower.includes("nft") && text.includes("nft")) score += 3;
    if (lower.includes("voice") && text.includes("voice")) score += 3;
    if (lower.includes("ai") && text.includes("ai")) score += 2;
    if (score === 0) score = 1;
    return { service, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.service);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "market data").slice(0, 80);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 16);

  try {
    const services = await searchCircleServices(query, limit);
    if (services.length > 0) {
      return NextResponse.json({ query, services, source: "circle_cli" });
    }
    const fallback = filterSnapshot(query, limit);
    return NextResponse.json({ query, services: fallback, source: "marketplace_snapshot" });
  } catch {
    const fallback = filterSnapshot(query, limit);
    return NextResponse.json({ query, services: fallback, source: "marketplace_snapshot" });
  }
}
