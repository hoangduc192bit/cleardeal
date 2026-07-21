import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";
import type { ClearDealMetadata } from "@/lib/cleardeal-metadata";
import type { Hex } from "viem";

const METADATA_PREFIX = "cleardeal:metadata:";
const AUTHORIZATION_PREFIX = "cleardeal:authorization:";

export { isDurableKvConfigured };

export async function getStoredDealMetadata(metadataHash: Hex) {
  const value = await redisCommand<string>(["GET", `${METADATA_PREFIX}${metadataHash.toLowerCase()}`]);
  if (!value) return null;
  try {
    return JSON.parse(value) as ClearDealMetadata;
  } catch {
    return null;
  }
}

export async function storeDealMetadata(metadataHash: Hex, metadata: ClearDealMetadata) {
  const result = await redisCommand<string>([
    "SET",
    `${METADATA_PREFIX}${metadataHash.toLowerCase()}`,
    JSON.stringify(metadata),
  ]);
  if (result !== "OK") throw new Error("metadata_store_failed");
}

export async function consumeMetadataAuthorization(requestId: string) {
  const key = `${AUTHORIZATION_PREFIX}${requestId}`;
  const result = await redisCommand<string | null>(["SET", key, "1", "NX", "EX", 600]);
  return result === "OK";
}

export async function releaseMetadataAuthorization(requestId: string) {
  await redisCommand<number>(["DEL", `${AUTHORIZATION_PREFIX}${requestId}`]);
}
