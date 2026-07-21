import type { Hex } from "viem";
import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";
import type { ClearingMetadata } from "@/lib/clearing-metadata";

const METADATA_PREFIX = "cleardeal:clearing:metadata:";
const AUTHORIZATION_PREFIX = "cleardeal:clearing:authorization:";

export { isDurableKvConfigured };

export async function getStoredClearingMetadata(metadataHash: Hex) {
  const value = await redisCommand<string>(["GET", `${METADATA_PREFIX}${metadataHash.toLowerCase()}`]);
  if (!value) return null;
  try { return JSON.parse(value) as ClearingMetadata; } catch { return null; }
}

export async function storeClearingMetadata(metadataHash: Hex, metadata: ClearingMetadata) {
  const result = await redisCommand<string>(["SET", `${METADATA_PREFIX}${metadataHash.toLowerCase()}`, JSON.stringify(metadata)]);
  if (result !== "OK") throw new Error("metadata_store_failed");
}

export async function consumeClearingAuthorization(requestId: string) {
  return await redisCommand<string | null>(["SET", `${AUTHORIZATION_PREFIX}${requestId}`, "1", "NX", "EX", 600]) === "OK";
}

export async function releaseClearingAuthorization(requestId: string) {
  await redisCommand<number>(["DEL", `${AUTHORIZATION_PREFIX}${requestId}`]);
}
