import { verifyTransactionOnChain } from "@/lib/x402/verify";
import { verifyDemoPaymentHeader } from "@/lib/x402/demo";
import { hashX402Data } from "@/lib/x402/hash";
import { generateStructured } from "@/lib/gemini";
import { getToolById } from "@/lib/tool-catalog";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOOL_ID = "summarize";
const X402_PAYMENT_HEADER = "x-arcstream-payment-tx";
const X402_DEMO_HEADER = "x-arcstream-demo-payment";

interface SummarizeOutput {
  summary: string;
  keyPoints: string[];
  wordCount: number;
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, { key: `x402:tool:${TOOL_ID}`, limit: 30, windowSeconds: 60 });
  if (limited) return limited;

  const tool = getToolById(TOOL_ID)!;

  // Check payment - real on-chain tx or demo header
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
        instructions: `Transfer ${tool.pricePerCall} USDC to ${tool.providerWallet} on Arc Testnet, then retry with ${X402_PAYMENT_HEADER} header containing the tx hash.`,
      },
      { status: 402 },
    );
  }

  let body: { text?: string; maxWords?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return Response.json({ error: "missing_required_field", field: "text" }, { status: 400 });
  }

  const maxWords = body.maxWords ?? 150;
  const prompt = `Summarize the following text in ${maxWords} words or fewer. Also extract 3-5 key points as bullet items.

Text:
"""
${body.text.slice(0, 8000)}
"""

Return JSON: { "summary": "...", "keyPoints": ["point 1", "point 2", ...], "wordCount": <number> }`;

  const fallback: SummarizeOutput = {
    summary: body.text.slice(0, 200) + "...",
    keyPoints: ["Summary unavailable - Gemini API not configured"],
    wordCount: body.text.split(" ").length,
  };

  const output = await generateStructured<SummarizeOutput>(prompt, fallback);
  const payload = { ...output, toolId: TOOL_ID, processedAt: Date.now() };

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
