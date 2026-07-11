import { runMarketplaceOrchestrator } from "@/lib/marketplace-orchestrator";
import { rateLimit } from "@/lib/rate-limit";
import { requireServerToken } from "@/lib/server-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const limited = await rateLimit(request, {
    key: "agent:orchestrate",
    limit: 5,
    windowSeconds: 60,
  });
  if (limited) return limited;

  let body: {
    request?: string;
    maxBudgetUsdc?: string;
    executePaid?: boolean;
    walletAddress?: string;
    chain?: string;
    telegramChatId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.request || typeof body.request !== "string" || body.request.trim().length === 0) {
    return Response.json({ error: "missing_required_field", field: "request" }, { status: 400 });
  }

  if (body.maxBudgetUsdc && !/^\d+(\.\d{1,6})?$/.test(body.maxBudgetUsdc)) {
    return Response.json({ error: "invalid_field", field: "maxBudgetUsdc" }, { status: 400 });
  }

  if (body.walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) {
    return Response.json({ error: "invalid_field", field: "walletAddress" }, { status: 400 });
  }

  if (body.chain && !/^[A-Z0-9-]{2,20}$/.test(body.chain)) {
    return Response.json({ error: "invalid_field", field: "chain" }, { status: 400 });
  }

  if (body.executePaid) {
    const unauthorized = requireServerToken(request, "ARCSTREAM_AGENT_RUN_TOKEN", "agent_run");
    if (unauthorized) return unauthorized;
  }

  const result = await runMarketplaceOrchestrator({
    request: body.request,
    maxBudgetUsdc: body.maxBudgetUsdc,
    executePaid: Boolean(body.executePaid),
    walletAddress: body.walletAddress,
    chain: body.chain,
  });

  // Telegram Notifications (Server-Side Delivery with Fallback)
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (botToken && body.telegramChatId && result.status !== "failed") {
    try {
      const serviceName = result.selectedService
        ? `${result.selectedService.provider} (${result.selectedService.resource})`
        : "Direct Agent Action";
      const spentUsdc = result.budget?.spentUsdc || "0.00";
      const remainingUsdc = result.budget?.remainingUsdc || "0.00";

      const text = `🤖 *ArcStream Workflow Executed*

📝 *Request:*
"${result.request}"

💡 *Service Used:*
${serviceName}

💰 *Budget Governance:*
• Spent: ${spentUsdc} USDC
• Remaining: ${remainingUsdc} USDC

📄 *Executive Brief:*
${result.finalAnswer}

*ArcStream - Decentralized Agent Orchestration Layer*`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: body.telegramChatId,
          text: text,
          parse_mode: "Markdown",
        }),
      });
    } catch (tgError) {
      console.error("Failed to send Telegram notification:", tgError);
    }
  }

  return Response.json(result);
}
