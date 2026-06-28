import { verifyTransactionOnChain } from "@/lib/x402/verify";
import { verifyDemoPaymentHeader } from "@/lib/x402/demo";
import { hashX402Data } from "@/lib/x402/hash";
import { generateStructured } from "@/lib/gemini";
import { getToolById } from "@/lib/tool-catalog";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOOL_ID = "sentiment";
const X402_PAYMENT_HEADER = "x-arcstream-payment-tx";
const X402_DEMO_HEADER = "x-arcstream-demo-payment";

interface SentimentOutput {
  score: number;
  label: "positive" | "negative" | "neutral";
  confidence: number;
  reasoning: string;
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, { key: `x402:tool:${TOOL_ID}`, limit: 30, windowSeconds: 60 });
  if (limited) return limited;

  const tool = getToolById(TOOL_ID)!;

  const txHash = request.headers.get(X402_PAYMENT_HEADER);
  const demoHeader = request.headers.get(X402_DEMO_HEADER);
  let isPaymentValid = false;

  if (txHash) {
    isPaymentValid = await verifyTransactionOnChain(txHash, tool.pricePerCall, tool.providerWallet);
  } else if (demoHeader) {
    isPaymentValid = verifyDemoPaymentHeader(demoHeader);
  }

  if (!isPaymentValid) {
    return Response.json(
      {
        error: "payment_required",
        price: tool.pricePerCall,
        currency: "USDC",
        network: "Arc Testnet",
        toolId: TOOL_ID,
        providerWallet: tool.providerWallet,
        instructions: `Transfer ${tool.pricePerCall} USDC to ${tool.providerWallet} on Arc Testnet, then retry with ${X402_PAYMENT_HEADER} header.`,
      },
      { status: 402 },
    );
  }

  let body: { text?: string; context?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return Response.json({ error: "missing_required_field", field: "text" }, { status: 400 });
  }

  const context = body.context ?? "general";
  const prompt = `Analyze the sentiment of this text in the context of ${context}.

Text: "${body.text.slice(0, 2000)}"

Return JSON:
{
  "score": <number between -1.0 (very negative) and 1.0 (very positive)>,
  "label": "<positive|negative|neutral>",
  "confidence": <number between 0.0 and 1.0>,
  "reasoning": "One sentence explanation"
}`;

  const fallback: SentimentOutput = {
    score: 0,
    label: "neutral",
    confidence: 0,
    reasoning: "Sentiment analysis unavailable - Gemini API not configured.",
  };

  const output = await generateStructured<SentimentOutput>(prompt, fallback);
  const payload = { ...output, toolId: TOOL_ID, analyzedAt: Date.now() };

  return Response.json({
    toolId: TOOL_ID,
    provider: tool.providerName,
    receipt: txHash ? `x402-onchain-${txHash}` : `x402-demo-${Date.now()}`,
    txHash: txHash ?? null,
    dataHash: hashX402Data(payload),
    settlement: txHash ? "settled_onchain" : "demo_mode",
    payload,
  });
}
