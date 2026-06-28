import type { PriceFeedData } from "@/lib/price-feed";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ConsumerAgentReport {
  riskLevel: RiskLevel;
  explanation: string;
  dataUsed: string;
  recommendation: "Keep stream active" | "Stop and settle";
}

export function analyzeMarketRisk(
  data: PriceFeedData | undefined,
  elapsedSeconds: number,
): ConsumerAgentReport | undefined {
  if (!data) return undefined;

  const changes = Object.values(data.change24h);
  const noticeable = changes.filter((change) => Math.abs(change) >= 2);
  const strong = changes.filter((change) => Math.abs(change) >= 4);
  const sameDirection =
    strong.length >= 2 &&
    (strong.every((change) => change > 0) || strong.every((change) => change < 0));

  let riskLevel: RiskLevel = "LOW";
  let explanation = "BTC, ETH, and SOL are relatively stable, with no broad high-conviction move.";
  if (sameDirection) {
    riskLevel = "HIGH";
    explanation = "Multiple assets are moving strongly in the same direction, indicating elevated market-wide risk.";
  } else if (noticeable.length >= 1) {
    riskLevel = "MEDIUM";
    explanation = "At least one tracked asset is moving noticeably, so short-term market risk is elevated.";
  }

  return {
    riskLevel,
    explanation,
    dataUsed: `BTC ${data.change24h.btc.toFixed(2)}%, ETH ${data.change24h.eth.toFixed(2)}%, SOL ${data.change24h.sol.toFixed(2)}% over 24h`,
    recommendation: elapsedSeconds >= 90 ? "Stop and settle" : "Keep stream active",
  };
}
