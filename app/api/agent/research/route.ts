import { runResearchAgent } from "@/agents/research-agent";
import { rateLimit } from "@/lib/rate-limit";
import { requireServerToken } from "@/lib/server-token";
import { getTrustedAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = await rateLimit(request, { key: "agent:research", limit: 5, windowSeconds: 60 });
  if (limited) return limited;

  let body: {
    topic?: string;
    maxBudgetUsdc?: string;
    persona?: string;
    agentPrivateKey?: string;
    instructions?: string;
    paymentMode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.topic || typeof body.topic !== "string" || body.topic.trim().length === 0) {
    return Response.json({ error: "missing_required_field", field: "topic" }, { status: 400 });
  }

  const topic = body.topic.trim().slice(0, 200);

  let baseUrl: string;
  try {
    baseUrl = getTrustedAppUrl();
  } catch {
    return Response.json({ error: "app_url_not_configured" }, { status: 503 });
  }

  const maxBudgetUsdc =
    typeof body.maxBudgetUsdc === "string" && body.maxBudgetUsdc.trim()
      ? body.maxBudgetUsdc.trim()
      : undefined;
  if (maxBudgetUsdc && !/^\d+(\.\d{1,6})?$/.test(maxBudgetUsdc)) {
    return Response.json({ error: "invalid_field", field: "maxBudgetUsdc" }, { status: 400 });
  }

  const persona = typeof body.persona === "string" ? body.persona.trim() : "business";
  const agentPrivateKey = typeof body.agentPrivateKey === "string" ? body.agentPrivateKey.trim() : undefined;
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : undefined;
  const paymentMode = body.paymentMode === "paid" ? "paid" : body.paymentMode === "demo" ? "demo" : undefined;
  if (paymentMode === "paid" || agentPrivateKey) {
    const unauthorized = requireServerToken(request, "ARCSTREAM_AGENT_RUN_TOKEN", "agent_run");
    if (unauthorized) return unauthorized;
  }

  const report = await runResearchAgent(topic, baseUrl, maxBudgetUsdc, persona, agentPrivateKey, instructions, paymentMode);

  return Response.json(report);
}
