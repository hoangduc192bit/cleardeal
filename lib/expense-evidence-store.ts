import type { Address, Hex } from "viem";
import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";
import type {
  ExpenseEvidence,
  ExpenseEvidenceAttachmentPayload,
} from "@/lib/expense-evidence";

const EVIDENCE_PREFIX = "cleardeal:expense:evidence:";
const AUTHORIZATION_PREFIX = "cleardeal:expense:evidence-authorization:";

export { isDurableKvConfigured };

export interface StoredExpenseEvidence {
  evidence: ExpenseEvidence;
  requesterAddress: Address;
  signature: Hex;
  storedAt: string;
  attachmentPayloads?: ExpenseEvidenceAttachmentPayload[];
}

export async function getStoredExpenseEvidence(hash: Hex) {
  const value = await redisCommand<string>([
    "GET",
    `${EVIDENCE_PREFIX}${hash.toLowerCase()}`,
  ]);
  if (!value) return null;
  try {
    return JSON.parse(value) as StoredExpenseEvidence;
  } catch {
    return null;
  }
}

export async function storeExpenseEvidence(
  hash: Hex,
  value: StoredExpenseEvidence,
) {
  const result = await redisCommand<string | null>([
    "SET",
    `${EVIDENCE_PREFIX}${hash.toLowerCase()}`,
    JSON.stringify(value),
    "NX",
  ]);
  if (result !== "OK") throw new Error("evidence_already_stored");
}

export async function consumeExpenseEvidenceAuthorization(
  requestId: string,
) {
  return (
    (await redisCommand<string | null>([
      "SET",
      `${AUTHORIZATION_PREFIX}${requestId}`,
      "1",
      "NX",
      "EX",
      600,
    ])) === "OK"
  );
}

export async function releaseExpenseEvidenceAuthorization(
  requestId: string,
) {
  await redisCommand<number>([
    "DEL",
    `${AUTHORIZATION_PREFIX}${requestId}`,
  ]);
}
