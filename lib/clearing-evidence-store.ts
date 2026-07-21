import type { Address, Hex } from "viem";
import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";
import type { ClearingEvidence, ClearingEvidenceAttachmentPayload } from "@/lib/clearing-evidence";

const EVIDENCE_PREFIX = "cleardeal:clearing:evidence:";
const AUTHORIZATION_PREFIX = "cleardeal:clearing:evidence-authorization:";

export { isDurableKvConfigured };

export interface StoredClearingEvidence {
  evidence: ClearingEvidence;
  providerAddress: Address;
  signature: Hex;
  storedAt: string;
  attachmentPayloads?: ClearingEvidenceAttachmentPayload[];
}

export async function getStoredClearingEvidence(hash: Hex) {
  const value = await redisCommand<string>(["GET", `${EVIDENCE_PREFIX}${hash.toLowerCase()}`]);
  if (!value) return null;
  try { return JSON.parse(value) as StoredClearingEvidence; } catch { return null; }
}

export async function storeClearingEvidence(hash: Hex, value: StoredClearingEvidence) {
  const result = await redisCommand<string | null>(["SET", `${EVIDENCE_PREFIX}${hash.toLowerCase()}`, JSON.stringify(value), "NX"]);
  if (result !== "OK") throw new Error("evidence_already_stored");
}

export async function consumeClearingEvidenceAuthorization(requestId: string) {
  return await redisCommand<string | null>(["SET", `${AUTHORIZATION_PREFIX}${requestId}`, "1", "NX", "EX", 600]) === "OK";
}

export async function releaseClearingEvidenceAuthorization(requestId: string) {
  await redisCommand<number>(["DEL", `${AUTHORIZATION_PREFIX}${requestId}`]);
}
