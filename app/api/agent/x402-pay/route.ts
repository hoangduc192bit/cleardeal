import { getPaidStreamConfig } from "@/lib/x402/paid-streams";
import { payWithCircleAgentWallet } from "@/lib/circle-agent-wallet";
import { rateLimit } from "@/lib/rate-limit";
import { requireServerToken } from "@/lib/server-token";
import { getTrustedAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const unauthorized = requireServerToken(request, "ARCSTREAM_AGENT_RUN_TOKEN", "agent_run");
  if (unauthorized) return unauthorized;

  const limited = await rateLimit(request, {
    key: "agent:x402-pay",
    limit: 10,
    windowSeconds: 60,
  });
  if (limited) return limited;

  let body: { streamId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const stream = getPaidStreamConfig(body.streamId);
  let baseUrl: string;
  try {
    baseUrl = getTrustedAppUrl();
  } catch {
    return Response.json({ error: "app_url_not_configured" }, { status: 503 });
  }

  try {
    const payment = await payWithCircleAgentWallet({
      to: stream.wallet,
      amountUsdc: stream.price,
    });

    const unlockResponse = await fetch(`${baseUrl}${stream.endpoint}`, {
      headers: { "x-arcstream-payment-tx": payment.txHash },
    });
    const unlockBody = await unlockResponse.json();

    if (!unlockResponse.ok) {
      return Response.json(
        {
          error: "unlock_failed",
          payment,
          unlock: unlockBody,
        },
        { status: 502 },
      );
    }

    return Response.json({
      stream,
      payment,
      unlocked: unlockBody,
    });
  } catch (error) {
    return Response.json(
      {
        error: "circle_agent_payment_failed",
        message: "Circle agent payment could not be completed",
      },
      { status: 500 },
    );
  }
}
