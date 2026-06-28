const USDC_DECIMALS = 6n;
const USDC_SCALE = 10n ** USDC_DECIMALS;

export interface BudgetDecision {
  approved: boolean;
  reason?: "budget_exceeded" | "invalid_price";
  projectedSpendUsdc: string;
  remainingUsdc: string;
}

export interface AgentBudgetPolicy {
  maxBudgetUsdc: string;
  maxBudgetMicro: bigint;
  spentMicro: bigint;
  approve(priceUsdc: string): BudgetDecision;
  recordSpend(priceUsdc: string): void;
  remainingUsdc(): string;
  spentUsdc(): string;
}

export function parseUsdcToMicro(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    throw new Error(`Invalid USDC amount: ${value}`);
  }

  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = fraction.padEnd(Number(USDC_DECIMALS), "0");
  return BigInt(whole) * USDC_SCALE + BigInt(paddedFraction);
}

export function formatMicroUsdc(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = abs / USDC_SCALE;
  const fraction = (abs % USDC_SCALE).toString().padStart(Number(USDC_DECIMALS), "0");
  const trimmedFraction = fraction.replace(/0+$/, "");
  return `${sign}${whole.toString()}${trimmedFraction ? `.${trimmedFraction}` : ""}`;
}

export function createAgentBudgetPolicy(maxBudgetUsdc: string): AgentBudgetPolicy {
  const maxBudgetMicro = parseUsdcToMicro(maxBudgetUsdc);
  let spentMicro = 0n;

  return {
    maxBudgetUsdc: formatMicroUsdc(maxBudgetMicro),
    maxBudgetMicro,
    get spentMicro() {
      return spentMicro;
    },
    approve(priceUsdc: string): BudgetDecision {
      let priceMicro: bigint;
      try {
        priceMicro = parseUsdcToMicro(priceUsdc);
      } catch {
        return {
          approved: false,
          reason: "invalid_price",
          projectedSpendUsdc: formatMicroUsdc(spentMicro),
          remainingUsdc: formatMicroUsdc(maxBudgetMicro - spentMicro),
        };
      }

      const projected = spentMicro + priceMicro;
      return {
        approved: projected <= maxBudgetMicro,
        reason: projected <= maxBudgetMicro ? undefined : "budget_exceeded",
        projectedSpendUsdc: formatMicroUsdc(projected),
        remainingUsdc: formatMicroUsdc(maxBudgetMicro - spentMicro),
      };
    },
    recordSpend(priceUsdc: string) {
      spentMicro += parseUsdcToMicro(priceUsdc);
    },
    remainingUsdc() {
      return formatMicroUsdc(maxBudgetMicro - spentMicro);
    },
    spentUsdc() {
      return formatMicroUsdc(spentMicro);
    },
  };
}
