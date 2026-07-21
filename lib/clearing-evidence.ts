import { keccak256, toBytes, type Address, type Hex } from "viem";

export const CLEARING_EVIDENCE_ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
] as const;
export const CLEARING_EVIDENCE_MAX_ATTACHMENTS = 2;
export const CLEARING_EVIDENCE_MAX_ATTACHMENT_BYTES = 250_000;
export const CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES = 400_000;

export interface ClearingEvidenceAttachment {
  name: string;
  contentType: typeof CLEARING_EVIDENCE_ALLOWED_ATTACHMENT_TYPES[number];
  size: number;
  sha256: Hex;
}

export interface ClearingEvidenceAttachmentPayload {
  sha256: Hex;
  dataBase64: string;
}

export interface ClearingEvidence {
  version: 1;
  cycleId: string;
  obligationId: string;
  reference: string;
  submittedAt: string;
  attachments?: ClearingEvidenceAttachment[];
}

export interface StoreClearingEvidenceAuthorization {
  providerAddress: Address;
  evidenceHash: Hex;
  requestId: string;
  issuedAt: number;
}

const UINT_PATTERN = /^(0|[1-9]\d*)$/;
const MAX_UINT256 = (1n << 256n) - 1n;
const SHA256_PATTERN = /^0x[a-fA-F0-9]{64}$/;
export const CLEARING_EVIDENCE_AUTHORIZATION_TTL_MS = 5 * 60 * 1_000;

function normalizeAttachment(value: unknown): ClearingEvidenceAttachment | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ClearingEvidenceAttachment>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const contentType = typeof input.contentType === "string" ? input.contentType : "";
  const size = typeof input.size === "number" ? input.size : 0;
  const sha256 = typeof input.sha256 === "string" ? input.sha256.toLowerCase() : "";
  if (!name || name.length > 120 || name.includes("/") || name.includes("\\") || /[\u0000-\u001f]/.test(name)) return null;
  if (!CLEARING_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.includes(contentType as ClearingEvidenceAttachment["contentType"])) return null;
  if (!Number.isSafeInteger(size) || !size || size < 1 || size > CLEARING_EVIDENCE_MAX_ATTACHMENT_BYTES) return null;
  if (!SHA256_PATTERN.test(sha256)) return null;
  return { name, contentType: contentType as ClearingEvidenceAttachment["contentType"], size, sha256: sha256 as Hex };
}

export function normalizeClearingEvidence(value: unknown): ClearingEvidence | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ClearingEvidence>;
  const cycleId = typeof input.cycleId === "string" ? input.cycleId : "";
  const obligationId = typeof input.obligationId === "string" ? input.obligationId : "";
  const reference = typeof input.reference === "string" ? input.reference.trim() : "";
  const submittedAt = typeof input.submittedAt === "string" ? input.submittedAt : "";
  if (input.version !== 1 || !UINT_PATTERN.test(cycleId) || !UINT_PATTERN.test(obligationId)) return null;
  if (BigInt(cycleId) > MAX_UINT256 || BigInt(obligationId) > MAX_UINT256) return null;
  if (!reference || reference.length > 1_000 || !Number.isFinite(Date.parse(submittedAt))) return null;
  const rawAttachments = input.attachments;
  if (rawAttachments !== undefined && !Array.isArray(rawAttachments)) return null;
  if (Array.isArray(rawAttachments) && rawAttachments.length > CLEARING_EVIDENCE_MAX_ATTACHMENTS) return null;
  const attachments = Array.isArray(rawAttachments) ? rawAttachments.map(normalizeAttachment) : [];
  if (attachments.some((attachment) => !attachment)) return null;
  const normalizedAttachments = attachments as ClearingEvidenceAttachment[];
  if (normalizedAttachments.reduce((sum, attachment) => sum + attachment.size, 0) > CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES) return null;
  if (new Set(normalizedAttachments.map((attachment) => attachment.sha256)).size !== normalizedAttachments.length) return null;
  return normalizedAttachments.length
    ? { version: 1, cycleId, obligationId, reference, submittedAt, attachments: normalizedAttachments }
    : { version: 1, cycleId, obligationId, reference, submittedAt };
}

export function serializeClearingEvidence(evidence: ClearingEvidence) {
  const base = { version: 1, cycleId: evidence.cycleId, obligationId: evidence.obligationId, reference: evidence.reference, submittedAt: evidence.submittedAt };
  return JSON.stringify(evidence.attachments?.length ? { ...base, attachments: evidence.attachments } : base);
}

export function hashClearingEvidence(evidence: ClearingEvidence) {
  return keccak256(toBytes(serializeClearingEvidence(evidence)));
}

export function buildStoreClearingEvidenceMessage(input: StoreClearingEvidenceAuthorization) {
  return [
    "ClearDeal clearing evidence authorization",
    "Action: store-clearing-evidence",
    "Network: Arc Testnet (5042002)",
    `Provider: ${input.providerAddress.toLowerCase()}`,
    `Evidence hash: ${input.evidenceHash.toLowerCase()}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing stores a public evidence reference and optional attachment fingerprints. It does not transfer USDC.",
  ].join("\n");
}

export function isFreshClearingEvidenceAuthorization(issuedAt: number, now = Date.now()) {
  return Number.isSafeInteger(issuedAt) && Math.abs(now - issuedAt) <= CLEARING_EVIDENCE_AUTHORIZATION_TTL_MS;
}
