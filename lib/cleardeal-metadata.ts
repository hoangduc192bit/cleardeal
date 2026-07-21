import { keccak256, toBytes, type Address, type Hex } from "viem";

export interface ClearDealMetadata {
  version: 1;
  client: string;
  title: string;
  milestones: Array<{
    title: string;
    dueDate: string;
  }>;
}

export interface StoreDealMetadataAuthorization {
  ownerAddress: Address;
  metadataHash: Hex;
  requestId: string;
  issuedAt: number;
}

export const CLEARDEAL_AUTHORIZATION_TTL_MS = 5 * 60 * 1_000;

export function normalizeDealMetadata(value: unknown): ClearDealMetadata | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ClearDealMetadata>;
  const client = typeof input.client === "string" ? input.client.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (input.version !== 1 || !client || client.length > 80 || !title || title.length > 120) return null;
  if (!Array.isArray(input.milestones) || input.milestones.length === 0 || input.milestones.length > 20) return null;

  const milestones = input.milestones.map((milestone) => {
    const milestoneTitle = typeof milestone?.title === "string" ? milestone.title.trim() : "";
    const dueDate = typeof milestone?.dueDate === "string" ? milestone.dueDate : "";
    if (!milestoneTitle || milestoneTitle.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
    return { title: milestoneTitle, dueDate };
  });
  if (milestones.some((milestone) => milestone === null)) return null;

  return {
    version: 1,
    client,
    title,
    milestones: milestones as ClearDealMetadata["milestones"],
  };
}

export function serializeDealMetadata(metadata: ClearDealMetadata) {
  return JSON.stringify({
    version: 1,
    client: metadata.client,
    title: metadata.title,
    milestones: metadata.milestones.map((milestone) => ({
      title: milestone.title,
      dueDate: milestone.dueDate,
    })),
  });
}

export function hashDealMetadata(metadata: ClearDealMetadata) {
  return keccak256(toBytes(serializeDealMetadata(metadata)));
}

export function buildStoreDealMetadataMessage(input: StoreDealMetadataAuthorization) {
  return [
    "ClearDeal metadata authorization",
    "Action: store-deal-metadata",
    "Network: Arc Testnet (5042002)",
    `Owner: ${input.ownerAddress.toLowerCase()}`,
    `Metadata hash: ${input.metadataHash.toLowerCase()}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing stores public deal metadata. It does not transfer USDC.",
  ].join("\n");
}

export function isFreshClearDealAuthorization(issuedAt: number, now = Date.now()) {
  return Number.isSafeInteger(issuedAt) && Math.abs(now - issuedAt) <= CLEARDEAL_AUTHORIZATION_TTL_MS;
}
