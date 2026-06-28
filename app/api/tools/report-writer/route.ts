import { verifyTransactionOnChain } from "@/lib/x402/verify";
import { verifyDemoPaymentHeader } from "@/lib/x402/demo";
import { hashX402Data } from "@/lib/x402/hash";
import { generateStructured } from "@/lib/gemini";
import { getToolById } from "@/lib/tool-catalog";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOOL_ID = "report-writer";
const X402_PAYMENT_HEADER = "x-arcstream-payment-tx";
const X402_DEMO_HEADER = "x-arcstream-demo-payment";

interface ReportOutput {
  title: string;
  executiveSummary: string;
  sections: { heading: string; content: string }[];
  conclusion: string;
  generatedAt: number;
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, { key: `x402:tool:${TOOL_ID}`, limit: 15, windowSeconds: 60 });
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

  let body: { topic?: string; findings?: unknown[]; format?: string; instructions?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.topic || typeof body.topic !== "string") {
    return Response.json({ error: "missing_required_field", field: "topic" }, { status: 400 });
  }
  if (!Array.isArray(body.findings) || body.findings.length === 0) {
    return Response.json({ error: "missing_required_field", field: "findings" }, { status: 400 });
  }

  const format = body.format === "detailed" ? "detailed multi-section" : "brief one-page";
  const findingsList = body.findings
    .slice(0, 20)
    .map((f, i) => `${i + 1}. ${typeof f === "string" ? f : JSON.stringify(f)}`)
    .join("\n");

  let prompt = `You are a professional business report writer. Create a ${format} report on: "${body.topic}"

Findings to synthesize:
${findingsList}`;

  if (body.instructions && body.instructions.trim()) {
    prompt += `\n\nCustom Instructions / Perspective to apply:\n${body.instructions.trim()}`;
  }

  prompt += `\n\nReturn JSON:
{
  "title": "Report title",
  "executiveSummary": "2-3 sentence executive summary",
  "sections": [
    { "heading": "Section title", "content": "Section content" }
  ],
  "conclusion": "Actionable conclusion paragraph"
}`;

  const generatedAt = Date.now();
  const fallback: ReportOutput = {
    title: body.topic,
    executiveSummary: "Report generation unavailable - Gemini API not configured.",
    sections: [{ heading: "Findings", content: body.findings.join(" ") }],
    conclusion: "No conclusion generated.",
    generatedAt,
  };

  const structured = await generateStructured<Omit<ReportOutput, "generatedAt">>(prompt, fallback);
  const output: ReportOutput = { ...structured, generatedAt };
  const payload = { ...output, toolId: TOOL_ID, topic: body.topic };

  return Response.json({
    toolId: TOOL_ID,
    provider: tool.providerName,
    receipt: txHash ? `x402-onchain-${txHash}` : `x402-demo-${generatedAt}`,
    txHash: txHash ?? null,
    dataHash: hashX402Data(payload),
    settlement: txHash ? "settled_onchain" : "demo_mode",
    payload,
  });
}
