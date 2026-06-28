import { generateInsight } from "@/lib/gemini";

export interface FXData {
  timestamp: number;
  usdcEurc: number;
  eurcUsdc: number;
  usdcBtc: number;
  signal: string;
}

export async function fetchFXData(): Promise<FXData> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 30 },
  });
  if (!response.ok) {
    throw new Error(`Exchange-rate request failed: ${response.status}`);
  }
  const data = (await response.json()) as { rates: { EUR: number } };
  const usdcEurc = data.rates.EUR;
  const signal = await generateInsight(
    `USDC/EURC is ${usdcEurc.toFixed(4)}. Give one concise stablecoin FX outlook.`,
    `One USDC currently converts to approximately ${usdcEurc.toFixed(4)} EURC.`,
  );

  return {
    timestamp: Date.now(),
    usdcEurc,
    eurcUsdc: 1 / usdcEurc,
    usdcBtc: 0,
    signal,
  };
}
