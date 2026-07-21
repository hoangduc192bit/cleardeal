import { getAddress, isAddress, type Address } from "viem";

export type ClearingInviteRole = "participant" | "verifier" | "arbitrator";

export function parseCycleId(value: string | null | undefined) {
  if (!value || !/^\d{1,78}$/.test(value)) return undefined;
  return BigInt(value);
}

export function parseInviteRole(value: string | null | undefined): ClearingInviteRole | undefined {
  return value === "participant" || value === "verifier" || value === "arbitrator" ? value : undefined;
}

export function parseInviteWallet(value: string | null | undefined): Address | undefined {
  return value && isAddress(value) ? getAddress(value) : undefined;
}

export function buildClearingInvitePath(cycleId: bigint, role: ClearingInviteRole, wallet: Address) {
  if (cycleId < 0n) throw new Error("Cycle ID cannot be negative.");
  const query = new URLSearchParams({ cycle: cycleId.toString(), role, wallet: getAddress(wallet) });
  return `/dashboard?${query.toString()}`;
}
