import { formatUnits, type Address, type Hex } from "viem";

export type DealStatus = "Draft" | "Fully funded" | "In progress" | "Completed" | "Refunded" | "Disputed" | "Resolved";
export type MilestoneStatus = "Pending" | "Ready for approval" | "Released" | "Refunded";

export interface ClearDealMilestone {
  id: bigint;
  title: string;
  recipient: Address;
  amount: bigint;
  dueAt: number;
  deliverableHash: Hex;
  status: MilestoneStatus;
}

export interface ClearDealRecord {
  id: bigint;
  client: string;
  title: string;
  buyer: Address;
  seller: Address;
  arbitrator: Address;
  totalAmount: bigint;
  releasedAmount: bigint;
  metadataHash: Hex;
  createdAt: number;
  refundDeadline: number;
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
  return deal.milestones.filter((milestone) => milestone.status === "Released").length;
}

export function escrowBalance(deal: ClearDealRecord) {
  if (deal.status === "Draft" || deal.status === "Refunded" || deal.status === "Resolved") return 0n;
  return deal.totalAmount - deal.releasedAmount;
}

export function shortAddress(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(timestamp * 1_000);
}
