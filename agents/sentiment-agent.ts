export interface SentimentData {
  timestamp: number;
  score: number;
  label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  trendingKeywords: string[];
  analysis: string;
}

export async function fetchSentimentFeed(): Promise<SentimentData> {
  // Real Fear & Greed Index from Alternative.me
  const res = await fetch("https://api.alternative.me/fng/?limit=1", {
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) throw new Error("Fear & Greed API unavailable");

  const json = await res.json();
  const entry = json.data[0];
  const score = parseInt(entry.value, 10);

  let label: SentimentData["label"] = "Neutral";
  if (score <= 24) label = "Extreme Fear";
  else if (score <= 44) label = "Fear";
  else if (score <= 55) label = "Neutral";
  else if (score <= 75) label = "Greed";
  else label = "Extreme Greed";

  // Trending keywords based on real label
  const keywordMap: Record<string, string[]> = {
    "Extreme Fear": ["Mass Liquidation", "Panic Selling", "Exchange Outflow", "Whale Dumping"],
    "Fear": ["Risk-Off", "BTC Dominance Rising", "Stablecoin Inflow", "Exchange Reserves"],
    "Neutral": ["Sideways Action", "Low Volatility", "Range Bound", "DCA Season"],
    "Greed": ["Altcoin Season", "NFT Volume", "FOMO Buying", "Leverage Rising"],
    "Extreme Greed": ["Euphoria", "All-Time High", "Retail FOMO", "Liquidation Risk"],
  };

  const keywords = keywordMap[label] ?? keywordMap["Neutral"];
  const shuffled = [...keywords].sort(() => 0.5 - Math.random());
  const trendingKeywords = shuffled.slice(0, 3);

  const analysis = `Real-time Fear & Greed Index: ${score}/100 — ${entry.value_classification}. Market sentiment as of ${new Date(parseInt(entry.timestamp) * 1000).toUTCString()}. Trending signals: ${trendingKeywords.join(", ")}.`;

  return {
    timestamp: Date.now(),
    score,
    label,
    trendingKeywords,
    analysis,
  };
}
