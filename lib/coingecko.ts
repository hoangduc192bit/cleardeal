export interface CoinGeckoPrices {
  bitcoin: { usd: number; usd_24h_change: number };
  ethereum: { usd: number; usd_24h_change: number };
  solana: { usd: number; usd_24h_change: number };
}

export async function fetchCoinGeckoPrices(): Promise<CoinGeckoPrices> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
    { next: { revalidate: 5 } },
  );
  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status}`);
  }
  return response.json();
}
