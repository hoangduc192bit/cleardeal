import { isAddress, keccak256, toBytes, type Address, type Hex } from "viem";

export interface ClearingMetadata {
  version: 1;
  name: string;
  description: string;
  participants: Array<{ address: Address; label: string }>;
  verifiers: Array<{ address: Address; label: string }>;
  obligations: Array<{ payer: Address; provider: Address; title: string; acceptance: string }>;
}

export interface StoreClearingMetadataAuthorization {
  ownerAddress: Address;
  metadataHash: Hex;
  requestId: string;
  issuedAt: number;
}

export const CLEARING_AUTHORIZATION_TTL_MS = 5 * 60 * 1_000;

function normalizeParty(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const item = value as { address?: unknown; label?: unknown };
  const address = typeof item.address === "string" && isAddress(item.address) ? item.address as Address : undefined;
  const label = typeof item.label === "string" ? item.label.trim() : "";
  return address && label && label.length <= 60 ? { address, label } : null;
}

export function normalizeClearingMetadata(value: unknown): ClearingMetadata | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ClearingMetadata>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (input.version !== 1 || !name || name.length > 120 || !description || description.length > 500) return null;
  if (!Array.isArray(input.participants) || input.participants.length < 2 || input.participants.length > 20) return null;
  if (!Array.isArray(input.verifiers) || input.verifiers.length < 1 || input.verifiers.length > 10) return null;
  if (!Array.isArray(input.obligations) || input.obligations.length < 1 || input.obligations.length > 20) return null;
  const participants = input.participants.map(normalizeParty);
  const verifiers = input.verifiers.map(normalizeParty);
  if (participants.some((item) => !item) || verifiers.some((item) => !item)) return null;
  const obligations = input.obligations.map((value) => {
    const item = value as ClearingMetadata["obligations"][number];
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    const acceptance = typeof item?.acceptance === "string" ? item.acceptance.trim() : "";
    if (!isAddress(item?.payer) || !isAddress(item?.provider) || !title || title.length > 120 || !acceptance || acceptance.length > 500) return null;
    return { payer: item.payer, provider: item.provider, title, acceptance };
  });
  if (obligations.some((item) => !item)) return null;
  return { version: 1, name, description, participants: participants as ClearingMetadata["participants"], verifiers: verifiers as ClearingMetadata["verifiers"], obligations: obligations as ClearingMetadata["obligations"] };
}

export function serializeClearingMetadata(metadata: ClearingMetadata) {
  return JSON.stringify({
    version: 1,
    name: metadata.name,
    description: metadata.description,
    participants: metadata.participants.map((item) => ({ address: item.address.toLowerCase(), label: item.label })),
    verifiers: metadata.verifiers.map((item) => ({ address: item.address.toLowerCase(), label: item.label })),
    obligations: metadata.obligations.map((item) => ({ payer: item.payer.toLowerCase(), provider: item.provider.toLowerCase(), title: item.title, acceptance: item.acceptance })),
  });
}

export function hashClearingMetadata(metadata: ClearingMetadata) {
  return keccak256(toBytes(serializeClearingMetadata(metadata)));
}

export function buildStoreClearingMetadataMessage(input: StoreClearingMetadataAuthorization) {
  return [
    "ClearDeal clearing metadata authorization",
    "Action: store-clearing-cycle-metadata",
    "Network: Arc Testnet (5042002)",
    `Owner: ${input.ownerAddress.toLowerCase()}`,
    `Metadata hash: ${input.metadataHash.toLowerCase()}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing stores public cycle terms. It does not transfer USDC.",
  ].join("\n");
}

export function isFreshClearingAuthorization(issuedAt: number, now = Date.now()) {
  return Number.isSafeInteger(issuedAt) && Math.abs(now - issuedAt) <= CLEARING_AUTHORIZATION_TTL_MS;
}
