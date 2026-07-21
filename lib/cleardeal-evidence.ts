import { keccak256, toBytes, type Address, type Hex } from "viem";

export type ClearDealEvidenceKind = "milestone_submission" | "dispute" | "resolution";

export interface ClearDealEvidence {
  version: 1;
  kind: ClearDealEvidenceKind;
  dealId: string;
  milestoneId?: string;
  reference: string;
  submittedAt: number;
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
}

export const CLEARDEAL_EVIDENCE_AUTHORIZATION_TTL_MS = 5 * 60 * 1_000;

function normalizeUint(value: unknown) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value) || value.length > 78) return null;
  try {
    const parsed = BigInt(value);
    return parsed < 2n ** 256n ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeClearDealEvidence(value: unknown): ClearDealEvidence | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ClearDealEvidence>;
  const kind = input.kind;
  const dealId = normalizeUint(input.dealId);
  const milestoneId = input.milestoneId === undefined ? undefined : normalizeUint(input.milestoneId);
  const reference = typeof input.reference === "string" ? input.reference.trim() : "";
  if (input.version !== 1 || !["milestone_submission", "dispute", "resolution"].includes(kind ?? "")) return null;
  if (!dealId || !reference || reference.length > 1_000 || !Number.isSafeInteger(input.submittedAt)) return null;
  if (input.milestoneId !== undefined && milestoneId === null) return null;
  if (kind === "milestone_submission" && milestoneId === undefined) return null;
  if (kind !== "milestone_submission" && input.milestoneId !== undefined) return null;
  return { version: 1, kind: kind as ClearDealEvidenceKind, dealId, milestoneId: milestoneId ?? undefined, reference, submittedAt: input.submittedAt as number };
}

export function serializeClearDealEvidence(evidence: ClearDealEvidence) {
  return JSON.stringify({
    version: 1,
    kind: evidence.kind,
    dealId: evidence.dealId,
    milestoneId: evidence.milestoneId ?? null,
    reference: evidence.reference,
    submittedAt: evidence.submittedAt,
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
