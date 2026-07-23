import type { Hex } from "viem";
import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";
import type { ExpenseMetadata } from "@/lib/expense-metadata";

const METADATA_PREFIX = "cleardeal:expense:metadata:";
const AUTHORIZATION_PREFIX = "cleardeal:expense:authorization:";

export { isDurableKvConfigured };

export async function getStoredExpenseMetadata(metadataHash: Hex) {
  const value = await redisCommand<string>([
    "GET",
    `${METADATA_PREFIX}${metadataHash.toLowerCase()}`,
  ]);
  if (!value) return null;
  try {
    return JSON.parse(value) as ExpenseMetadata;
  } catch {
    return null;
  }
}

export async function storeExpenseMetadata(
  metadataHash: Hex,
  metadata: ExpenseMetadata,
) {
  const result = await redisCommand<string>([
    "SET",
    `${METADATA_PREFIX}${metadataHash.toLowerCase()}`,
    JSON.stringify(metadata),
  ]);
  if (result !== "OK") throw new Error("metadata_store_failed");
}

export async function consumeExpenseAuthorization(requestId: string) {
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

export async function releaseExpenseAuthorization(requestId: string) {
  await redisCommand<number>([
    "DEL",
    `${AUTHORIZATION_PREFIX}${requestId}`,
  ]);
}
