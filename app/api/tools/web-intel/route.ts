import { verifyTransactionOnChain } from "@/lib/x402/verify";
import { verifyDemoPaymentHeader } from "@/lib/x402/demo";
import { hashX402Data } from "@/lib/x402/hash";
import { generateStructured } from "@/lib/gemini";
import { getToolById } from "@/lib/tool-catalog";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOOL_ID = "web-intel";
const X402_PAYMENT_HEADER = "x-arcstream-payment-tx";
const X402_DEMO_HEADER = "x-arcstream-demo-payment";

interface WebIntelOutput {
  title: string;
  summary: string;
  keyFacts: string[];
  content: string;
  fetchedAt: number;
}

async function fetchPageText(url: string): Promise<{ title: string; text: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ArcStream-WebIntel/1.0 (research bot)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip tags, collapse whitespace, extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
    return { title, text };
  } catch {
    return null;
  }
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

  let body: { url?: string; query?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return Response.json({ error: "missing_required_field", field: "url" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid protocol");
  } catch {
    return Response.json({ error: "invalid_url", url: body.url }, { status: 400 });
  }

  const fetchedAt = Date.now();
  const page = await fetchPageText(parsedUrl.href);

  const fallbackOutput: WebIntelOutput = {
    title: parsedUrl.hostname,
    summary: "Could not fetch page content.",
    keyFacts: ["Page unavailable or fetch failed"],
    content: "",
    fetchedAt,
  };

  if (!page) {
    const payload = { ...fallbackOutput, toolId: TOOL_ID };
    return Response.json({
      toolId: TOOL_ID,
      provider: tool.providerName,
      receipt: txHash ? `x402-onchain-${txHash}` : `x402-demo-${fetchedAt}`,
      txHash: txHash ?? null,
      dataHash: hashX402Data(payload),
      settlement: txHash ? "settled_onchain" : "demo_mode",
      payload,
    });
  }

  const query = body.query ? ` Focus specifically on: "${body.query}".` : "";
  const prompt = `You analyzed a webpage. Extract key intelligence from this content.${query}

Page: ${page.title}
Content: ${page.text}

Return JSON:
{
  "title": "${page.title}",
  "summary": "2-3 sentence summary of the page",
  "keyFacts": ["fact 1", "fact 2", "fact 3", "fact 4", "fact 5"]
}`;

  const structured = await generateStructured<{ title: string; summary: string; keyFacts: string[] }>(
    prompt,
    { title: page.title, summary: page.text.slice(0, 300), keyFacts: [] },
  );

  const output: WebIntelOutput = {
    title: structured.title,
    summary: structured.summary,
    keyFacts: structured.keyFacts,
    content: page.text.slice(0, 1000),
    fetchedAt,
  };

  const payload = { ...output, toolId: TOOL_ID, url: parsedUrl.href };

  return Response.json({
    toolId: TOOL_ID,
    provider: tool.providerName,
    receipt: txHash ? `x402-onchain-${txHash}` : `x402-demo-${fetchedAt}`,
    txHash: txHash ?? null,
    dataHash: hashX402Data(payload),
    settlement: txHash ? "settled_onchain" : "demo_mode",
    payload,
  });
}
