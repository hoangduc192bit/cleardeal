import { fetchPriceFeed } from "@/agents/price-agent";
import { fetchSentimentFeed } from "@/agents/sentiment-agent";
import { fetchYieldFeed } from "@/agents/yield-agent";
import { fetchRiskFeed } from "@/agents/risk-agent";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const limited = await rateLimit(request, {
    key: `stream:${type}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    switch (type) {
      case "pulse-price-feed":
        return Response.json(await fetchPriceFeed());
      case "market-sentiment":
        return Response.json(await fetchSentimentFeed());
      case "stablecoin-yield":
        return Response.json(await fetchYieldFeed());
      case "wallet-risk":
        return Response.json(await fetchRiskFeed());
      default:
        return Response.json({ error: "Unknown stream type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Agent stream failed", error);
    return Response.json({ error: "Agent stream unavailable" }, { status: 502 });
  }
}
