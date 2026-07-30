import { formatUnits, type Address, type Hex } from "viem";

export type DealStatus = "Draft" | "Fully funded" | "In progress" | "Completed" | "Refunded" | "Disputed";
export type MilestoneStatus = "Pending" | "Ready for approval" | "Released" | "Refunded" | "Disputed" | "Resolved";

export interface ClearDealMilestone {
  id: bigint;
  title: string;
  recipient: Address;
  amount: bigint;
  dueAt: number;
  submittedAt: number;
  reviewDeadline: number;
  revisionCount: number;
  deliverableHash: Hex;
  status: MilestoneStatus;
}

export interface ClearDealRecord {
  id: bigint;
  client: string;
  team: string;
  title: string;
  buyer: Address;
  seller: Address;
  arbitrator: Address;
  totalAmount: bigint;
  releasedAmount: bigint;
  refundedAmount: bigint;
  metadataHash: Hex;
  createdAt: number;
  refundDeadline: number;
  reviewPeriod: number;
  maxRevisions: number;
  refundRequested: boolean;
  status: DealStatus;
  metadataAvailable: boolean;
  milestones: ClearDealMilestone[];
}

export function formatUsdc(value: bigint) {
  const [whole, fraction = ""] = formatUnits(value, 6).split(".");
  const formattedWhole = BigInt(whole).toLocaleString("en-US");
  const formattedFraction = fraction.replace(/0+$/, "");
  return `${formattedWhole}${formattedFraction ? `.${formattedFraction}` : ""} USDC`;
}

export function completedMilestones(deal: ClearDealRecord) {
  return deal.milestones.filter((milestone) => milestone.status === "Released" || milestone.status === "Resolved").length;
}

export function escrowBalance(deal: ClearDealRecord) {
  if (deal.status === "Draft" || deal.status === "Refunded") return 0n;
  return deal.totalAmount - deal.releasedAmount - deal.refundedAmount;
}

export function shortAddress(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(timestamp * 1_000);
}
