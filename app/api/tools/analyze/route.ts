import { verifyTransactionOnChain } from "@/lib/x402/verify";
import { verifyDemoPaymentHeader } from "@/lib/x402/demo";
import { hashX402Data } from "@/lib/x402/hash";
import { generateStructured } from "@/lib/gemini";
import { getToolById } from "@/lib/tool-catalog";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOOL_ID = "analyze";
const X402_PAYMENT_HEADER = "x-arcstream-payment-tx";
const X402_DEMO_HEADER = "x-arcstream-demo-payment";

interface AnalyzeOutput {
  company: string;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
  threats: string[];
  opportunities: string[];
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, { key: `x402:tool:${TOOL_ID}`, limit: 20, windowSeconds: 60 });
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

  let body: { company?: string; industry?: string; focus?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.company || typeof body.company !== "string") {
    return Response.json({ error: "missing_required_field", field: "company" }, { status: 400 });
  }

  const industry = body.industry ? ` in the ${body.industry} industry` : "";
  const focus = body.focus ?? "full";

  const prompt = `You are a strategic business analyst. Provide a competitive analysis of "${body.company}"${industry}.
Focus: ${focus}.

Return JSON with this exact structure:
{
  "company": "${body.company}",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "positioning": "One paragraph describing their market position",
  "threats": ["threat 1", "threat 2"],
  "opportunities": ["opportunity 1", "opportunity 2"]
}`;

  const fallback: AnalyzeOutput = {
    company: body.company,
    strengths: ["Analysis unavailable - Gemini API not configured"],
    weaknesses: [],
    positioning: "Unable to generate analysis.",
    threats: [],
    opportunities: [],
  };

  const output = await generateStructured<AnalyzeOutput>(prompt, fallback);
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
