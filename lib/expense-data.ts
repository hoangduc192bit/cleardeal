import { formatUnits, type Address, type Hex } from "viem";
import type { ExpenseMetadata } from "@/lib/expense-metadata";
import type { ExpenseEvidence } from "@/lib/expense-evidence";

export type ExpenseStatus =
  | "Manager approval"
  | "Invoice & delivery"
  | "Finance approval"
  | "Paid"
  | "Rejected"
  | "Cancelled";

export interface ExpenseRecord {
  id: bigint;
  requester: Address;
  manager: Address;
  finance: Address;
  vendor: Address;
  metadataHash: Hex;
  evidenceHash: Hex;
  memoId: Hex;
  createdAt: number;
  approvedBudget: bigint;
  payoutAmount: bigint;
  status: ExpenseStatus;
  metadata?: ExpenseMetadata;
  evidence?: ExpenseEvidence;
}

export function mapExpenseStatus(status: number): ExpenseStatus {
  if (status === 1) return "Invoice & delivery";
  if (status === 2) return "Finance approval";
  if (status === 3) return "Paid";
  if (status === 4) return "Rejected";
  if (status === 5) return "Cancelled";
  return "Manager approval";
}

export function formatExpenseUsdc(value: bigint) {
  const amount = Number(formatUnits(value, 6));
  return `${amount.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  })} USDC`;
}

export function shortExpenseWallet(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
