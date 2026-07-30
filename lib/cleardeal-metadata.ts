import { keccak256, toBytes, type Address, type Hex } from "viem";

export const clearDealProjectCategories = [
  "Website development",
  "Video production",
  "Brand and design",
  "Software delivery",
  "Custom project",
] as const;

export type ClearDealProjectCategory =
  (typeof clearDealProjectCategories)[number];

export interface ClearDealMetadata {
  version: 1 | 2;
  client: string;
  team?: string;
  title: string;
  category?: ClearDealProjectCategory;
  summary?: string;
  milestones: Array<{
    title: string;
    dueDate: string;
    deliverable?: string;
    acceptanceCriteria?: string;
  }>;
}

export interface StoreDealMetadataAuthorization {
  ownerAddress: Address;
  metadataHash: Hex;
  notificationHash?: Hex;
  requestId: string;
  issuedAt: number;
}

export const CLEARDEAL_AUTHORIZATION_TTL_MS = 5 * 60 * 1_000;

export function normalizeDealMetadata(value: unknown): ClearDealMetadata | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ClearDealMetadata>;
  const client = typeof input.client === "string" ? input.client.trim() : "";
  const team = typeof input.team === "string" ? input.team.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (
    (input.version !== 1 && input.version !== 2) ||
    !client ||
    client.length > 80 ||
    team.length > 80 ||
    !title ||
    title.length > 120
  ) {
    return null;
  }
  if (!Array.isArray(input.milestones) || input.milestones.length === 0 || input.milestones.length > 20) return null;

  const milestones = input.milestones.map((milestone) => {
    const milestoneTitle = typeof milestone?.title === "string" ? milestone.title.trim() : "";
    const dueDate = typeof milestone?.dueDate === "string" ? milestone.dueDate : "";
    if (!milestoneTitle || milestoneTitle.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
    if (input.version === 1) return { title: milestoneTitle, dueDate };
    const deliverable =
      typeof milestone?.deliverable === "string"
        ? milestone.deliverable.trim()
        : "";
    const acceptanceCriteria =
      typeof milestone?.acceptanceCriteria === "string"
        ? milestone.acceptanceCriteria.trim()
        : "";
    if (
      !deliverable ||
      deliverable.length > 500 ||
      !acceptanceCriteria ||
      acceptanceCriteria.length > 700
    ) {
      return null;
    }
    return {
      title: milestoneTitle,
      dueDate,
      deliverable,
      acceptanceCriteria,
    };
  });
  if (milestones.some((milestone) => milestone === null)) return null;

  if (input.version === 2) {
    const category = clearDealProjectCategories.includes(
      input.category as ClearDealProjectCategory,
    )
      ? (input.category as ClearDealProjectCategory)
      : undefined;
    const summary =
      typeof input.summary === "string" ? input.summary.trim() : "";
    if (!category || !summary || summary.length > 700) return null;
    return {
      version: 2,
      client,
      ...(team ? { team } : {}),
      title,
      category,
      summary,
      milestones: milestones as ClearDealMetadata["milestones"],
    };
  }

  return {
    version: 1,
    client,
    ...(team ? { team } : {}),
    title,
    milestones: milestones as ClearDealMetadata["milestones"],
  };
}

export function serializeDealMetadata(metadata: ClearDealMetadata) {
  if (metadata.version === 2) {
    return JSON.stringify({
      version: 2,
      client: metadata.client,
      ...(metadata.team ? { team: metadata.team } : {}),
      title: metadata.title,
      category: metadata.category,
      summary: metadata.summary,
      milestones: metadata.milestones.map((milestone) => ({
        title: milestone.title,
        dueDate: milestone.dueDate,
        deliverable: milestone.deliverable,
        acceptanceCriteria: milestone.acceptanceCriteria,
      })),
    });
  }
  return JSON.stringify({
    version: 1,
    client: metadata.client,
    ...(metadata.team ? { team: metadata.team } : {}),
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
    `Private notification contacts hash: ${input.notificationHash?.toLowerCase() ?? `0x${"0".repeat(64)}`}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing stores public deal metadata. It does not transfer USDC.",
  ].join("\n");
}

export function isFreshClearDealAuthorization(issuedAt: number, now = Date.now()) {
  return Number.isSafeInteger(issuedAt) && Math.abs(now - issuedAt) <= CLEARDEAL_AUTHORIZATION_TTL_MS;
}
