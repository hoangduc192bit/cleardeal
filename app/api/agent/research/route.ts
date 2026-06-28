import { runResearchAgent } from "@/agents/research-agent";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = await rateLimit(request, { key: "agent:research", limit: 5, windowSeconds: 60 });
  if (limited) return limited;

  let body: { topic?: string; maxBudgetUsdc?: string; persona?: string; agentPrivateKey?: string; instructions?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.topic || typeof body.topic !== "string" || body.topic.trim().length === 0) {
    return Response.json({ error: "missing_required_field", field: "topic" }, { status: 400 });
  }

  const topic = body.topic.trim().slice(0, 200);

  const baseUrl = request.headers.get("origin") ??
    (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000");

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

  const report = await runResearchAgent(topic, baseUrl, maxBudgetUsdc, persona, agentPrivateKey, instructions);

  return Response.json(report);
}
