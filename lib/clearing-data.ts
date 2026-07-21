import { formatUnits, type Address, type Hex } from "viem";
import type { ClearingMetadata } from "@/lib/clearing-metadata";

export type ClearingCycleStatus = "Collecting evidence" | "Funding net positions" | "Settled" | "Defaulted";
export type ObligationStatus = "Bond required" | "Evidence required" | "Verification" | "Passed" | "Failed";

export interface ClearingObligationRecord {
  id: bigint;
  payer: Address;
  provider: Address;
  amount: bigint;
  bondAmount: bigint;
  specHash: Hex;
  evidenceHash: Hex;
  approveVotes: number;
  rejectVotes: number;
  bondPosted: boolean;
  status: ObligationStatus;
  title: string;
  acceptance: string;
}

export interface ClearingCycleRecord {
  id: bigint;
  creator: Address;
  arbitrator: Address;
  metadataHash: Hex;
  createdAt: number;
  evidenceDeadline: number;
  fundingDeadline: number;
  verifierThreshold: number;
  finalizedCount: number;
  status: ClearingCycleStatus;
  totalGross: bigint;
  clearedGross: bigint;
  totalNetDebit: bigint;
  fundedNet: bigint;
  participants: Address[];
  verifiers: Address[];
  positions: Record<string, bigint>;
  funding: Record<string, bigint>;
  obligations: ClearingObligationRecord[];
  metadata?: ClearingMetadata;
}

export interface RiskPassportRecord {
  passedObligations: bigint;
  failedObligations: bigint;
  fundedCycles: bigint;
  defaultedCycles: bigint;
  clearedVolume: bigint;
  slashedBond: bigint;
  netReceived: bigint;
}

export function mapCycleStatus(status: number): ClearingCycleStatus {
  if (status === 1) return "Funding net positions";
  if (status === 2) return "Settled";
  if (status === 3) return "Defaulted";
  return "Collecting evidence";
}

export function mapObligationStatus(status: number): ObligationStatus {
  if (status === 1) return "Evidence required";
  if (status === 2) return "Verification";
  if (status === 3) return "Passed";
  if (status === 4) return "Failed";
  return "Bond required";
}

export function formatClearingUsdc(value: bigint) {
  const amount = Number(formatUnits(value, 6));
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} USDC`;
}

export function clearingSavings(cycle: ClearingCycleRecord) {
  return cycle.clearedGross > cycle.totalNetDebit ? cycle.clearedGross - cycle.totalNetDebit : 0n;
}

export function shortWallet(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
