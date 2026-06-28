import { fetchCoinGeckoPrices } from "@/lib/coingecko";
import { generateInsight } from "@/lib/gemini";
import type { PriceFeedData } from "@/lib/price-feed";

export async function fetchPriceFeed(): Promise<PriceFeedData> {
  const data = await fetchCoinGeckoPrices();
  const prices = {
    btc: data.bitcoin.usd,
    eth: data.ethereum.usd,
    sol: data.solana.usd,
  };
  const change24h = {
    btc: data.bitcoin.usd_24h_change,
    eth: data.ethereum.usd_24h_change,
    sol: data.solana.usd_24h_change,
  };
  const prompt = `BTC $${prices.btc} (${change24h.btc.toFixed(2)}%), ETH $${prices.eth} (${change24h.eth.toFixed(2)}%), SOL $${prices.sol} (${change24h.sol.toFixed(2)}%). Give one concise market insight.`;
  const analysis = await generateInsight(
    prompt,
    `BTC leads at $${prices.btc.toLocaleString()} while the three-asset basket shows mixed 24-hour momentum.`,
  );

  return { timestamp: Date.now(), prices, change24h, analysis };
}
