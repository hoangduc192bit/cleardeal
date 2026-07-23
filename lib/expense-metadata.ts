import { isAddress, keccak256, toBytes, type Address, type Hex } from "viem";

export interface ExpenseMetadata {
  version: 1;
  title: string;
  purpose: string;
  department: string;
  requesterName: string;
  vendorName: string;
  acceptance: string;
  memoCode: string;
}

export interface StoreExpenseMetadataAuthorization {
  ownerAddress: Address;
  metadataHash: Hex;
  requestId: string;
  issuedAt: number;
}

export const EXPENSE_AUTHORIZATION_TTL_MS = 5 * 60 * 1_000;

function text(value: unknown, max: number) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= max ? normalized : undefined;
}

export function normalizeExpenseMetadata(
  value: unknown,
): ExpenseMetadata | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ExpenseMetadata>;
  const title = text(input.title, 120);
  const purpose = text(input.purpose, 500);
  const department = text(input.department, 80);
  const requesterName = text(input.requesterName, 80);
  const vendorName = text(input.vendorName, 120);
  const acceptance = text(input.acceptance, 500);
  const memoCode = text(input.memoCode, 64);
  if (
    input.version !== 1 ||
    !title ||
    !purpose ||
    !department ||
    !requesterName ||
    !vendorName ||
    !acceptance ||
    !memoCode ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(memoCode)
  ) {
    return null;
  }
  return {
    version: 1,
    title,
    purpose,
    department,
    requesterName,
    vendorName,
    acceptance,
    memoCode,
  };
}

export function serializeExpenseMetadata(metadata: ExpenseMetadata) {
  return JSON.stringify({
    version: 1,
    title: metadata.title,
    purpose: metadata.purpose,
    department: metadata.department,
    requesterName: metadata.requesterName,
    vendorName: metadata.vendorName,
    acceptance: metadata.acceptance,
    memoCode: metadata.memoCode,
  });
}

export function hashExpenseMetadata(metadata: ExpenseMetadata) {
  return keccak256(toBytes(serializeExpenseMetadata(metadata)));
}

export function buildStoreExpenseMetadataMessage(
  input: StoreExpenseMetadataAuthorization,
) {
  return [
    "ClearDeal expense metadata authorization",
    "Action: store-expense-metadata",
    "Network: Arc Testnet (5042002)",
    `Owner: ${input.ownerAddress.toLowerCase()}`,
    `Metadata hash: ${input.metadataHash.toLowerCase()}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing stores public testnet request details. It does not transfer USDC.",
  ].join("\n");
}

export function isFreshExpenseAuthorization(
  issuedAt: number,
  now = Date.now(),
) {
  return (
    Number.isSafeInteger(issuedAt) &&
    Math.abs(now - issuedAt) <= EXPENSE_AUTHORIZATION_TTL_MS
  );
}

export function isExpenseOwner(value: unknown): value is Address {
  return typeof value === "string" && isAddress(value);
}
