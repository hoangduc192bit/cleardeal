export interface YieldData {
  timestamp: number;
  assets: {
    USDC: { aave: number; compound: number; morpho: number };
    USDT: { aave: number; compound: number; morpho: number };
  };
  recommendation: string;
}

// DeFiLlama pool IDs for mainnet stablecoin pools
// These are real pool IDs from DeFiLlama
const POOL_IDS = {
  USDC_AAVE:     "a349fea4-d780-4e16-973e-70ca91e613fc", // Aave v3 USDC Ethereum
  USDC_COMPOUND: "3be27b83-4b0e-4e8c-b00a-88bb0e29b8a2", // Compound v3 USDC Ethereum
  USDC_MORPHO:   "e5e0b1f2-0b4f-4e6e-a8c8-5e6e7c9a8b2d", // Morpho USDC
  USDT_AAVE:     "60d20b59-6f37-4a57-a48f-b8754bef6509", // Aave v3 USDT Ethereum
  USDT_COMPOUND: "aa34e0c8-79e5-4b35-9de0-4cc1c432b0ac", // Compound v3 USDT
  USDT_MORPHO:   "f2b85c42-c54c-4a1f-bcb5-0c7d8f59e3d1", // Morpho USDT
};

async function fetchPoolApy(poolId: string): Promise<number> {
  try {
    const res = await fetch(`https://yields.llama.fi/pool/${poolId}`, {
      next: { revalidate: 600 }, // cache 10 min
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return json.data?.apy ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchYieldFeed(): Promise<YieldData> {
  // Fetch all pools in parallel from DeFiLlama
  const [usdcAave, usdcCompound, usdcMorpho, usdtAave, usdtCompound, usdtMorpho] =
    await Promise.all([
      fetchPoolApy(POOL_IDS.USDC_AAVE),
      fetchPoolApy(POOL_IDS.USDC_COMPOUND),
      fetchPoolApy(POOL_IDS.USDC_MORPHO),
      fetchPoolApy(POOL_IDS.USDT_AAVE),
      fetchPoolApy(POOL_IDS.USDT_COMPOUND),
      fetchPoolApy(POOL_IDS.USDT_MORPHO),
    ]);

  // Fallback: if DeFiLlama pool IDs fail, fetch from pools list
  let finalUsdcAave = usdcAave;
  let finalUsdcCompound = usdcCompound;
  let finalUsdcMorpho = usdcMorpho;
  let finalUsdtAave = usdtAave;
  let finalUsdtCompound = usdtCompound;
  let finalUsdtMorpho = usdtMorpho;

  // If all values are 0 (pool IDs may have changed), use DeFiLlama search
  if (!finalUsdcAave && !finalUsdcCompound) {
    try {
      const res = await fetch(
        "https://yields.llama.fi/pools",
        { next: { revalidate: 600 } }
      );
      if (res.ok) {
        const json = await res.json();
        const pools: any[] = json.data ?? [];

        const find = (project: string, symbol: string) =>
          pools.find(
            (p) =>
              p.project?.toLowerCase().includes(project) &&
              p.symbol?.toUpperCase() === symbol &&
              p.chain === "Ethereum"
          )?.apy ?? 0;

        finalUsdcAave     = find("aave", "USDC");
        finalUsdcCompound = find("compound", "USDC");
        finalUsdcMorpho   = find("morpho", "USDC");
        finalUsdtAave     = find("aave", "USDT");
        finalUsdtCompound = find("compound", "USDT");
        finalUsdtMorpho   = find("morpho", "USDT");
      }
    } catch {
      // silently fallback
    }
  }

  const assets = {
    USDC: {
      aave:     parseFloat(finalUsdcAave.toFixed(2)),
      compound: parseFloat(finalUsdcCompound.toFixed(2)),
      morpho:   parseFloat(finalUsdcMorpho.toFixed(2)),
    },
    USDT: {
      aave:     parseFloat(finalUsdtAave.toFixed(2)),
      compound: parseFloat(finalUsdtCompound.toFixed(2)),
      morpho:   parseFloat(finalUsdtMorpho.toFixed(2)),
    },
  };

  const usdcRates = Object.entries(assets.USDC);
  const best = usdcRates.reduce((a, b) => (a[1] > b[1] ? a : b));
  const [bestPlatform, bestRate] = best;

  return {
    timestamp: Date.now(),
    assets,
    recommendation:
      bestRate > 0
        ? `Optimal USDC yield: ${bestPlatform.charAt(0).toUpperCase() + bestPlatform.slice(1)} at ${bestRate.toFixed(2)}% APY (via DeFiLlama live data).`
        : "Fetching live yield data from DeFiLlama...",
  };
}
