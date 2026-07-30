import { keccak256, toBytes, type Address, type Hex } from "viem";

export const CLEARDEAL_EVIDENCE_ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/webm",
  "text/plain",
] as const;
export const CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS = 3;
export const CLEARDEAL_EVIDENCE_MAX_ATTACHMENT_BYTES = 1_500_000;
export const CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES = 2_500_000;

export type ClearDealEvidenceAttachmentAccess = "review" | "paid";
export type ClearDealEvidenceAttachmentProtection =
  | "server_watermark"
  | "provided_preview"
  | "participant_only"
  | "locked_original";

export interface ClearDealEvidenceAttachment {
  name: string;
  contentType: typeof CLEARDEAL_EVIDENCE_ALLOWED_ATTACHMENT_TYPES[number];
  size: number;
  sha256: Hex;
  access?: ClearDealEvidenceAttachmentAccess;
  protection?: ClearDealEvidenceAttachmentProtection;
}

export interface ClearDealEvidenceAttachmentPayload {
  sha256: Hex;
  dataBase64: string;
}

export interface ClearDealEncryptedEvidenceAttachmentPayload {
  version: 1;
  sha256: Hex;
  ciphertextBase64: string;
  ivBase64: string;
  authTagBase64: string;
}

export type ClearDealEvidenceKind =
  | "milestone_submission"
  | "change_request"
  | "milestone_dispute"
  | "milestone_resolution"
  | "dispute"
  | "resolution";

export interface ClearDealEvidence {
  version: 1;
  kind: ClearDealEvidenceKind;
  dealId: string;
  milestoneId?: string;
  reference: string;
  submittedAt: number;
  attachments?: ClearDealEvidenceAttachment[];
}

export interface StoreClearDealEvidenceAuthorization {
  signerAddress: Address;
  evidenceHash: Hex;
  dealId: string;
  kind: ClearDealEvidenceKind;
  milestoneId?: string;
  requestId: string;
  issuedAt: number;
}

export interface StoredClearDealEvidence {
  evidence: ClearDealEvidence;
  signerAddress: Address;
  signature: Hex;
  storedAt: number;
  attachmentPayloads?: Array<
    ClearDealEvidenceAttachmentPayload | ClearDealEncryptedEvidenceAttachmentPayload
  >;
  clientViewedAt?: number;
}

export const CLEARDEAL_EVIDENCE_AUTHORIZATION_TTL_MS = 5 * 60 * 1_000;
const SHA256_PATTERN = /^0x[a-fA-F0-9]{64}$/;

function normalizeUint(value: unknown) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value) || value.length > 78) return null;
  try {
    const parsed = BigInt(value);
    return parsed < 2n ** 256n ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeAttachment(value: unknown): ClearDealEvidenceAttachment | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ClearDealEvidenceAttachment>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const contentType = typeof input.contentType === "string" ? input.contentType : "";
  const size = typeof input.size === "number" ? input.size : 0;
  const sha256 = typeof input.sha256 === "string" ? input.sha256.toLowerCase() : "";
  const access = input.access;
  const protection = input.protection;
  if (!name || name.length > 120 || name.includes("/") || name.includes("\\") || /[\u0000-\u001f]/.test(name)) return null;
  if (!CLEARDEAL_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.includes(contentType as ClearDealEvidenceAttachment["contentType"])) return null;
  if (!Number.isSafeInteger(size) || size < 1 || size > CLEARDEAL_EVIDENCE_MAX_ATTACHMENT_BYTES || !SHA256_PATTERN.test(sha256)) return null;
  if (access !== undefined && access !== "review" && access !== "paid") return null;
  if (
    protection !== undefined &&
    !["server_watermark", "provided_preview", "participant_only", "locked_original"].includes(protection)
  ) return null;
  if (access === "paid" && protection !== undefined && protection !== "locked_original") return null;
  return {
    name,
    contentType: contentType as ClearDealEvidenceAttachment["contentType"],
    size,
    sha256: sha256 as Hex,
    ...(access ? { access } : {}),
    ...(protection ? { protection } : {}),
  };
}

export function normalizeClearDealEvidence(value: unknown): ClearDealEvidence | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ClearDealEvidence>;
  const kind = input.kind;
  const dealId = normalizeUint(input.dealId);
  const milestoneId = input.milestoneId === undefined ? undefined : normalizeUint(input.milestoneId);
  const reference = typeof input.reference === "string" ? input.reference.trim() : "";
  if (
    input.version !== 1 ||
    ![
      "milestone_submission",
      "change_request",
      "milestone_dispute",
      "milestone_resolution",
      "dispute",
      "resolution",
    ].includes(kind ?? "")
  ) return null;
  if (!dealId || !reference || reference.length > 1_000 || !Number.isSafeInteger(input.submittedAt)) return null;
  if (input.milestoneId !== undefined && milestoneId === null) return null;
  const milestoneKind = [
    "milestone_submission",
    "change_request",
    "milestone_dispute",
    "milestone_resolution",
  ].includes(kind ?? "");
  if (milestoneKind && milestoneId === undefined) return null;
  if (!milestoneKind && input.milestoneId !== undefined) return null;
  if (input.attachments !== undefined && !Array.isArray(input.attachments)) return null;
  const attachments = Array.isArray(input.attachments)
    ? input.attachments.map(normalizeAttachment)
    : [];
  if (attachments.length > CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS || attachments.some((attachment) => !attachment)) return null;
  const normalized = attachments as ClearDealEvidenceAttachment[];
  if (
    normalized.reduce((sum, attachment) => sum + attachment.size, 0) > CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES ||
    new Set(normalized.map((attachment) => attachment.sha256)).size !== normalized.length
  ) return null;
  return {
    version: 1,
    kind: kind as ClearDealEvidenceKind,
    dealId,
    milestoneId: milestoneId ?? undefined,
    reference,
    submittedAt: input.submittedAt as number,
    ...(normalized.length ? { attachments: normalized } : {}),
  };
}

export function serializeClearDealEvidence(evidence: ClearDealEvidence) {
  return JSON.stringify({
    version: 1,
    kind: evidence.kind,
    dealId: evidence.dealId,
    milestoneId: evidence.milestoneId ?? null,
    reference: evidence.reference,
    submittedAt: evidence.submittedAt,
    ...(evidence.attachments?.length
      ? {
          attachments: evidence.attachments.map((attachment) => ({
            name: attachment.name,
            contentType: attachment.contentType,
            size: attachment.size,
            sha256: attachment.sha256,
            ...(attachment.access ? { access: attachment.access } : {}),
            ...(attachment.protection ? { protection: attachment.protection } : {}),
          })),
        }
      : {}),
  });
}

export function hashClearDealEvidence(evidence: ClearDealEvidence) {
  return keccak256(toBytes(serializeClearDealEvidence(evidence)));
}

export function buildStoreClearDealEvidenceMessage(input: StoreClearDealEvidenceAuthorization) {
  return [
    "ClearDeal evidence authorization",
    "Action: store-public-deal-evidence",
    "Network: Arc Testnet (5042002)",
    `Signer: ${input.signerAddress.toLowerCase()}`,
    `Evidence hash: ${input.evidenceHash.toLowerCase()}`,
    `Deal ID: ${input.dealId}`,
    `Evidence kind: ${input.kind}`,
    `Milestone ID: ${input.milestoneId ?? "n/a"}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing publishes evidence that may be anchored onchain. It does not transfer USDC.",
  ].join("\n");
}

export function isFreshClearDealEvidenceAuthorization(issuedAt: number, now = Date.now()) {
  return Number.isSafeInteger(issuedAt) && Math.abs(now - issuedAt) <= CLEARDEAL_EVIDENCE_AUTHORIZATION_TTL_MS;
}

export function attachmentAccess(
  attachment: ClearDealEvidenceAttachment,
): ClearDealEvidenceAttachmentAccess {
  return attachment.access ?? "review";
}

export interface AccessClearDealEvidenceAuthorization {
  signerAddress: Address;
  evidenceHash: Hex;
  requestId: string;
  issuedAt: number;
}

export function buildAccessClearDealEvidenceMessage(
  input: AccessClearDealEvidenceAuthorization,
) {
  return [
    "ClearDeal protected delivery access",
    "Action: open-protected-delivery",
    "Network: Arc Testnet (5042002)",
    `Viewer: ${input.signerAddress.toLowerCase()}`,
    `Evidence hash: ${input.evidenceHash.toLowerCase()}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing opens a short-lived participant-only preview. It does not approve work or move USDC.",
  ].join("\n");
}
