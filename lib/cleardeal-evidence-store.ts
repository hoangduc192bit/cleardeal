import type { Hex } from "viem";

import type { StoredClearDealEvidence } from "@/lib/cleardeal-evidence";
import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";

const EVIDENCE_PREFIX = "cleardeal:evidence:";

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
