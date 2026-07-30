import type { Hex } from "viem";

import type { StoredClearDealEvidence } from "@/lib/cleardeal-evidence";
import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";

const EVIDENCE_PREFIX = "cleardeal:evidence:";
const VIEWED_PREFIX = "cleardeal:evidence-viewed:";

export { isDurableKvConfigured };

export async function getStoredDealEvidence(evidenceHash: Hex) {
  const value = await redisCommand<string>(["GET", `${EVIDENCE_PREFIX}${evidenceHash.toLowerCase()}`]);
  if (!value) return null;
  try {
    return JSON.parse(value) as StoredClearDealEvidence;
  } catch {
    return null;
  }
}

export async function storeDealEvidence(evidenceHash: Hex, evidence: StoredClearDealEvidence) {
  const result = await redisCommand<string | null>([
    "SET",
    `${EVIDENCE_PREFIX}${evidenceHash.toLowerCase()}`,
    JSON.stringify(evidence),
    "NX",
  ]);
  return result === "OK";
}

export async function markDealEvidenceViewed(evidenceHash: Hex, viewedAt = Date.now()) {
  const result = await redisCommand<string | null>([
    "SET",
    `${VIEWED_PREFIX}${evidenceHash.toLowerCase()}`,
    String(viewedAt),
    "NX",
  ]);
  return result === "OK";
}

export async function getDealEvidenceViewedAt(evidenceHash: Hex) {
  const value = await redisCommand<string>([
    "GET",
    `${VIEWED_PREFIX}${evidenceHash.toLowerCase()}`,
  ]);
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
