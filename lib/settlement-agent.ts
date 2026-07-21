import { parseUnits, type Address } from "viem";

import type { ClearingCycleRecord } from "@/lib/clearing-data";

export type SettlementAgentStatus = "ready" | "waiting" | "blocked" | "complete";
export type SettlementAgentAction =
  | "connect_wallet"
  | "post_bond"
  | "submit_evidence"
  | "review_evidence"
  | "close_cycle"
  | "fund_position"
  | "settle_cycle"
  | "monitor"
  | "complete";

export interface SettlementAgentPolicy {
  maxCycleExposure: bigint;
  allowDefault: boolean;
}

export interface SettlementAgentDecision {
  status: SettlementAgentStatus;
  action: SettlementAgentAction;
  headline: string;
  rationale: string;
  amount: bigint;
  blockers: string[];
  policy: SettlementAgentPolicy;
}

export const defaultSettlementAgentPolicy: SettlementAgentPolicy = {
  maxCycleExposure: parseUnits("5", 6),
  allowDefault: false,
};

function includesAddress(addresses: readonly Address[], account?: Address) {
  return Boolean(account && addresses.some((candidate) => candidate.toLowerCase() === account.toLowerCase()));
}

export function evaluateSettlementAgent(
  cycle: ClearingCycleRecord,
  account?: Address,
  walletBalance?: bigint,
  policy: SettlementAgentPolicy = defaultSettlementAgentPolicy,
): SettlementAgentDecision {
  const base = { amount: 0n, blockers: [], policy };

  if (cycle.status === "Settled") {
    return { ...base, status: "complete", action: "complete", headline: "Settlement complete", rationale: "The final USDC distribution and bond release are already recorded on Arc." };
  }

  if (cycle.status === "Defaulted") {
    return { ...base, status: "complete", action: "complete", headline: "Cycle closed after default", rationale: "The contract recorded the missed funding state. The agent will not retry a defaulted cycle." };
  }

  if (!account) {
    return { ...base, status: "blocked", action: "connect_wallet", headline: "Connect the agent wallet", rationale: "The policy engine can read the room publicly, but a wallet is required before it can evaluate a role-specific action." };
  }

  const participant = includesAddress(cycle.participants, account);
  const providerObligation = cycle.obligations.find((obligation) => obligation.provider.toLowerCase() === account.toLowerCase() && obligation.status === "Bond required");
  const evidenceObligation = cycle.obligations.find((obligation) => obligation.provider.toLowerCase() === account.toLowerCase() && obligation.status === "Evidence required");
  const reviewReady = includesAddress(cycle.verifiers, account) && cycle.obligations.some((obligation) => obligation.status === "Verification");

  if (cycle.status === "Collecting evidence") {
    if (providerObligation) {
      const amount = providerObligation.bondAmount;
      const blockers = amount > policy.maxCycleExposure ? [`Provider bond exceeds the ${policy.maxCycleExposure / 1_000_000n} USDC policy cap.`] : [];
      if (walletBalance === undefined) blockers.push("Wallet balance has not been verified.");
      else if (walletBalance < amount) blockers.push("Wallet balance is below the required provider bond.");
      return {
        ...base,
        status: blockers.length ? "blocked" : "ready",
        action: "post_bond",
        amount,
        headline: blockers.length ? "Provider bond is blocked" : "Post the provider bond",
        rationale: blockers.length ? "The agent will not authorize a bond transfer until its exposure policy and balance check pass." : "The obligation is assigned to this wallet and the bond is the first required onchain assurance step.",
        blockers,
      };
    }

    if (evidenceObligation) {
      return { ...base, status: "waiting", action: "submit_evidence", headline: "Evidence is the next signal", rationale: "The agent is waiting for a public proof reference before any reviewer or settlement decision can be made." };
    }

    if (reviewReady) {
      return { ...base, status: "ready", action: "review_evidence", headline: "Review evidence", rationale: "A submitted proof is ready for an independent verifier decision. The agent will not vote without a signed evidence record." };
    }

    const canClose = cycle.finalizedCount === cycle.obligations.length;
    return canClose
      ? { ...base, status: "ready", action: "close_cycle", headline: "Calculate net positions", rationale: "Every obligation is finalized. The contract can now calculate the minimum USDC funding required." }
      : { ...base, status: "waiting", action: "monitor", headline: "Monitor the obligation graph", rationale: "The agent is waiting for bonds, evidence, or independent votes before calculating a settlement." };
  }

  const position = cycle.positions[account.toLowerCase()] ?? 0n;
  const funded = cycle.funding[account.toLowerCase()] ?? 0n;
  if (cycle.fundedNet === cycle.totalNetDebit) {
    return { ...base, status: "ready", action: "settle_cycle", headline: "Settlement is ready", rationale: "Every net debtor has funded the exact USDC difference. Anyone can submit the final distribution transaction." };
  }

  if (!participant) {
    return { ...base, status: "waiting", action: "monitor", headline: "Waiting for participant funding", rationale: "This wallet is not a net debtor in the room. The agent is monitoring until all participant funding is complete." };
  }

  if (position < 0n && funded === 0n) {
    const amount = -position;
    const blockers = amount > policy.maxCycleExposure ? [`Required funding exceeds the ${policy.maxCycleExposure / 1_000_000n} USDC policy cap.`] : [];
    if (walletBalance === undefined) blockers.push("Wallet balance has not been verified.");
    else if (walletBalance < amount) blockers.push("Wallet balance is below the required net position.");
    return {
      ...base,
      status: blockers.length ? "blocked" : "ready",
      action: "fund_position",
      amount,
      headline: blockers.length ? "Net funding is blocked" : "Fund the final difference",
      rationale: blockers.length ? "The agent will not approve a USDC transfer until the wallet balance and exposure policy pass." : "The connected wallet is a net debtor. Funding only the difference preserves the room's liquidity efficiency.",
      blockers,
    };
  }

  return { ...base, status: "waiting", action: "monitor", headline: "Monitor remaining funding", rationale: "Another participant still needs to fund their net position before the settlement can execute." };
}
