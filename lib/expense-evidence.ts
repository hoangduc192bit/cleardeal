import { keccak256, toBytes, type Address, type Hex } from "viem";
import type {
  ClearingEvidenceAttachment,
  ClearingEvidenceAttachmentPayload,
} from "@/lib/clearing-evidence";

export {
  CLEARING_EVIDENCE_ALLOWED_ATTACHMENT_TYPES as EXPENSE_EVIDENCE_ALLOWED_ATTACHMENT_TYPES,
  CLEARING_EVIDENCE_MAX_ATTACHMENTS as EXPENSE_EVIDENCE_MAX_ATTACHMENTS,
  CLEARING_EVIDENCE_MAX_ATTACHMENT_BYTES as EXPENSE_EVIDENCE_MAX_ATTACHMENT_BYTES,
  CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES as EXPENSE_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES,
} from "@/lib/clearing-evidence";

export type ExpenseEvidenceAttachment = ClearingEvidenceAttachment;
export type ExpenseEvidenceAttachmentPayload =
  ClearingEvidenceAttachmentPayload;

export interface ExpenseEvidence {
  version: 1;
  expenseId: string;
  reference: string;
  submittedAt: string;
  attachments?: ExpenseEvidenceAttachment[];
}

export interface StoreExpenseEvidenceAuthorization {
  requesterAddress: Address;
  evidenceHash: Hex;
  requestId: string;
  issuedAt: number;
}

const UINT_PATTERN = /^(0|[1-9]\d*)$/;
const MAX_UINT256 = (1n << 256n) - 1n;
const SHA256_PATTERN = /^0x[a-fA-F0-9]{64}$/;
export const EXPENSE_EVIDENCE_AUTHORIZATION_TTL_MS = 5 * 60 * 1_000;

function normalizeAttachment(
  value: unknown,
): ExpenseEvidenceAttachment | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ExpenseEvidenceAttachment>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const contentType =
    typeof input.contentType === "string" ? input.contentType : "";
  const size = typeof input.size === "number" ? input.size : 0;
  const sha256 =
    typeof input.sha256 === "string" ? input.sha256.toLowerCase() : "";
  if (
    !name ||
    name.length > 120 ||
    name.includes("/") ||
    name.includes("\\") ||
    /[\u0000-\u001f]/.test(name)
  ) {
    return null;
  }
  if (
    ![
      "application/pdf",
      "image/jpeg",
      "image/png",
      "text/plain",
    ].includes(contentType)
  ) {
    return null;
  }
  if (!Number.isSafeInteger(size) || size < 1 || size > 1_000_000) {
    return null;
  }
  if (!SHA256_PATTERN.test(sha256)) return null;
  return {
    name,
    contentType: contentType as ExpenseEvidenceAttachment["contentType"],
    size,
    sha256: sha256 as Hex,
  };
}

export function normalizeExpenseEvidence(
  value: unknown,
): ExpenseEvidence | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ExpenseEvidence>;
  const expenseId =
    typeof input.expenseId === "string" ? input.expenseId : "";
  const reference =
    typeof input.reference === "string" ? input.reference.trim() : "";
  const submittedAt =
    typeof input.submittedAt === "string" ? input.submittedAt : "";
  if (
    input.version !== 1 ||
    !UINT_PATTERN.test(expenseId) ||
    BigInt(expenseId) > MAX_UINT256 ||
    !reference ||
    reference.length > 1_000 ||
    !Number.isFinite(Date.parse(submittedAt))
  ) {
    return null;
  }
  if (
    input.attachments !== undefined &&
    !Array.isArray(input.attachments)
  ) {
    return null;
  }
  const attachments = Array.isArray(input.attachments)
    ? input.attachments.map(normalizeAttachment)
    : [];
  if (
    attachments.length > 3 ||
    attachments.some((attachment) => !attachment)
  ) {
    return null;
  }
  const normalized = attachments as ExpenseEvidenceAttachment[];
  if (
    normalized.reduce((sum, attachment) => sum + attachment.size, 0) >
      2_000_000 ||
    new Set(normalized.map((attachment) => attachment.sha256)).size !==
      normalized.length
  ) {
    return null;
  }
  return normalized.length
    ? { version: 1, expenseId, reference, submittedAt, attachments: normalized }
    : { version: 1, expenseId, reference, submittedAt };
}

export function serializeExpenseEvidence(evidence: ExpenseEvidence) {
  return JSON.stringify({
    version: 1,
    expenseId: evidence.expenseId,
    reference: evidence.reference,
    submittedAt: evidence.submittedAt,
    ...(evidence.attachments?.length
      ? { attachments: evidence.attachments }
      : {}),
  });
}

export function hashExpenseEvidence(evidence: ExpenseEvidence) {
  return keccak256(toBytes(serializeExpenseEvidence(evidence)));
}

export function buildStoreExpenseEvidenceMessage(
  input: StoreExpenseEvidenceAuthorization,
) {
  return [
    "ClearDeal expense evidence authorization",
    "Action: store-expense-evidence",
    "Network: Arc Testnet (5042002)",
    `Requester: ${input.requesterAddress.toLowerCase()}`,
    `Evidence hash: ${input.evidenceHash.toLowerCase()}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing stores public testnet invoice evidence. It does not transfer USDC.",
  ].join("\n");
}

export function isFreshExpenseEvidenceAuthorization(
  issuedAt: number,
  now = Date.now(),
) {
  return (
    Number.isSafeInteger(issuedAt) &&
    Math.abs(now - issuedAt) <= EXPENSE_EVIDENCE_AUTHORIZATION_TTL_MS
  );
}
