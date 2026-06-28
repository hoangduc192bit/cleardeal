import type { Address } from "viem";

export type ToolCapability =
  | "summarize"
  | "analyze"
  | "research"
  | "web-intel"
  | "sentiment"
  | "generate"
  | "compare"
  | "score";

export type ToolCategory = "Analysis" | "Research" | "Writing" | "Data" | "Risk" | "Generation";

export interface ToolInputField {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required: boolean;
  example?: unknown;
}

export interface Tool {
  id: string;
  name: string;
  providerName: string;
  providerWallet: Address;
  category: ToolCategory;
  description: string;
  capabilities: ToolCapability[];
  pricePerCall: string;        // USDC string e.g. "0.02"
  pricePerCallMicro: bigint;   // USDC 6 decimals
  platformFeeMicro: bigint;    // 10% of pricePerCallMicro
  estimatedLatencyMs: number;
  trustScore: number;
  status: "live" | "preview";
  isNative: boolean;
  endpoint: string;
  inputSchema: Record<string, ToolInputField>;
  outputDescription: string;
  usageExample: {
    input: Record<string, unknown>;
    outputSummary: string;
  };
}

// ArcStream Labs — native tool provider wallet (receives 90% of tool fees)
const ARCSTREAM_NATIVE_WALLET = (
  process.env.NEXT_PUBLIC_ARCSTREAM_NATIVE_WALLET ??
  "0x211F3A615BAD89cCce98ba0E46aFd9Ed0786FdE5"
) as Address;

// Protocol fee wallet — receives 10% of every tool call
export const ARCSTREAM_FEE_WALLET = (
  process.env.NEXT_PUBLIC_ARCSTREAM_FEE_WALLET ??
  "0x8f0c1014e7dcd26cebb15eb1c8e5640243171b3e"
) as Address;

export const PLATFORM_FEE_BPS = 1000n; // 10%

export function calcPlatformFee(pricePerCallMicro: bigint): bigint {
  return (pricePerCallMicro * PLATFORM_FEE_BPS) / 10000n;
}

export const toolCatalog: Tool[] = [
  {
    id: "summarize",
    name: "Text Summarizer",
    providerName: "ArcStream Labs",
    providerWallet: ARCSTREAM_NATIVE_WALLET,
    category: "Writing",
    description: "Condenses long text into a clear summary with key points. Ideal for processing research, reports, or any long-form content.",
    capabilities: ["summarize"],
    pricePerCall: "0.02",
    pricePerCallMicro: 20000n,
    platformFeeMicro: 2000n,
    estimatedLatencyMs: 1200,
    trustScore: 98,
    status: "live",
    isNative: true,
    endpoint: "/api/tools/summarize",
    inputSchema: {
      text: { type: "string", description: "The text to summarize", required: true, example: "Long article text..." },
      maxWords: { type: "number", description: "Maximum words in summary (default: 150)", required: false, example: 100 },
    },
    outputDescription: "{ summary: string, keyPoints: string[], wordCount: number }",
    usageExample: {
      input: { text: "Anthropic released Claude 4...", maxWords: 80 },
      outputSummary: "Returns concise summary + bullet key points",
    },
  },
  {
    id: "analyze",
    name: "Competitor Analyzer",
    providerName: "ArcStream Labs",
    providerWallet: ARCSTREAM_NATIVE_WALLET,
    category: "Analysis",
    description: "Deep competitive analysis for any company or product. Returns strengths, weaknesses, market positioning, and strategic threats.",
    capabilities: ["analyze", "research", "compare"],
    pricePerCall: "0.05",
    pricePerCallMicro: 50000n,
    platformFeeMicro: 5000n,
    estimatedLatencyMs: 2500,
    trustScore: 95,
    status: "live",
    isNative: true,
    endpoint: "/api/tools/analyze",
    inputSchema: {
      company: { type: "string", description: "Company or product name to analyze", required: true, example: "Stripe" },
      industry: { type: "string", description: "Industry context for better analysis", required: false, example: "fintech payments" },
      focus: { type: "string", description: "Specific angle: 'pricing' | 'product' | 'market' | 'full'", required: false, example: "full" },
    },
    outputDescription: "{ strengths: string[], weaknesses: string[], positioning: string, threats: string[], opportunities: string[] }",
    usageExample: {
      input: { company: "OpenAI", industry: "AI infrastructure", focus: "product" },
      outputSummary: "Returns structured SWOT-style analysis with market positioning",
    },
  },
  {
    id: "web-intel",
    name: "Web Intelligence",
    providerName: "ArcStream Labs",
    providerWallet: ARCSTREAM_NATIVE_WALLET,
    category: "Research",
    description: "Fetches and extracts structured intelligence from any public URL. Returns content summary, key facts, and relevant data points.",
    capabilities: ["web-intel", "research"],
    pricePerCall: "0.03",
    pricePerCallMicro: 30000n,
    platformFeeMicro: 3000n,
    estimatedLatencyMs: 3000,
    trustScore: 91,
    status: "live",
    isNative: true,
    endpoint: "/api/tools/web-intel",
    inputSchema: {
      url: { type: "string", description: "Public URL to fetch and analyze", required: true, example: "https://stripe.com/pricing" },
      query: { type: "string", description: "Specific question or focus for extraction", required: false, example: "What are the pricing tiers?" },
    },
    outputDescription: "{ title: string, content: string, keyFacts: string[], summary: string, fetchedAt: number }",
    usageExample: {
      input: { url: "https://openai.com/api/pricing", query: "What models are available?" },
      outputSummary: "Returns page summary + extracted key facts relevant to query",
    },
  },
  {
    id: "sentiment",
    name: "Sentiment Scorer",
    providerName: "ArcStream Labs",
    providerWallet: ARCSTREAM_NATIVE_WALLET,
    category: "Analysis",
    description: "Scores sentiment of any text with reasoning. Returns score (-1 to 1), label, confidence, and explanation. Useful for market signals and brand monitoring.",
    capabilities: ["sentiment", "score"],
    pricePerCall: "0.02",
    pricePerCallMicro: 20000n,
    platformFeeMicro: 2000n,
    estimatedLatencyMs: 900,
    trustScore: 97,
    status: "live",
    isNative: true,
    endpoint: "/api/tools/sentiment",
    inputSchema: {
      text: { type: "string", description: "Text to score for sentiment", required: true, example: "Bitcoin surged 15% after ETF approval..." },
      context: { type: "string", description: "Domain context: 'finance' | 'brand' | 'general'", required: false, example: "finance" },
    },
    outputDescription: "{ score: number, label: 'positive'|'negative'|'neutral', confidence: number, reasoning: string }",
    usageExample: {
      input: { text: "The Fed raised rates again causing market turbulence", context: "finance" },
      outputSummary: "Returns score -0.7 (negative), with explanation of bearish signal",
    },
  },
  {
    id: "report-writer",
    name: "Report Writer",
    providerName: "ArcStream Labs",
    providerWallet: ARCSTREAM_NATIVE_WALLET,
    category: "Generation",
    description: "Synthesizes raw data and findings into a polished structured report. Takes multiple data points and produces executive-ready output.",
    capabilities: ["generate", "summarize"],
    pricePerCall: "0.04",
    pricePerCallMicro: 40000n,
    platformFeeMicro: 4000n,
    estimatedLatencyMs: 2000,
    trustScore: 96,
    status: "live",
    isNative: true,
    endpoint: "/api/tools/report-writer",
    inputSchema: {
      topic: { type: "string", description: "Report topic or title", required: true, example: "Competitive analysis: DeFi lending protocols" },
      findings: { type: "array", description: "Array of finding strings or objects to synthesize", required: true, example: ["Finding 1...", "Finding 2..."] },
      format: { type: "string", description: "'brief' (1 page) | 'detailed' (multi-section)", required: false, example: "brief" },
    },
    outputDescription: "{ title: string, executiveSummary: string, sections: { heading: string, content: string }[], conclusion: string, generatedAt: number }",
    usageExample: {
      input: { topic: "Arc chain vs Base comparison", findings: ["Arc uses USDC gas...", "Base has larger TVL..."], format: "brief" },
      outputSummary: "Returns structured report with exec summary, sections, and conclusion",
    },
  },
];

export function getToolById(id: string): Tool | undefined {
  return toolCatalog.find((t) => t.id === id);
}

export function queryTools(params: {
  capability?: string;
  category?: string;
  maxPrice?: string;
  isNative?: boolean;
}): Tool[] {
  return toolCatalog.filter((tool) => {
    if (tool.status !== "live") return false;
    if (params.capability && !tool.capabilities.includes(params.capability as ToolCapability)) return false;
    if (params.category && tool.category !== params.category) return false;
    if (params.maxPrice && parseFloat(tool.pricePerCall) > parseFloat(params.maxPrice)) return false;
    if (params.isNative !== undefined && tool.isNative !== params.isNative) return false;
    return true;
  });
}
