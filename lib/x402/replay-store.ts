import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import type { Hash } from "viem";
import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";

interface ReplayStore {
  usedTxHashes: Record<string, number>;
}

const replayStorePath =
  process.env.X402_REPLAY_STORE_PATH ??
  join(tmpdir(), "arcstream-x402-used-txs.json");

async function readStore(): Promise<ReplayStore> {
  try {
    const raw = await readFile(replayStorePath, "utf8");
    const parsed = JSON.parse(raw) as ReplayStore;
    return { usedTxHashes: parsed.usedTxHashes ?? {} };
  } catch {
    return { usedTxHashes: {} };
  }
}

async function writeStore(store: ReplayStore) {
  await mkdir(dirname(replayStorePath), { recursive: true });
  await writeFile(replayStorePath, JSON.stringify(store), "utf8");
}

export async function hasUsedX402Tx(hash: Hash) {
  if (isDurableKvConfigured) {
    return Boolean(await redisCommand<string>(["GET", `arcstream:x402:tx:${hash.toLowerCase()}`]));
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Durable x402 replay store is not configured");
  }

  const store = await readStore();
  return Boolean(store.usedTxHashes[hash.toLowerCase()]);
}

export async function markX402TxUsed(hash: Hash) {
  if (isDurableKvConfigured) {
    await redisCommand(["SET", `arcstream:x402:tx:${hash.toLowerCase()}`, Date.now(), "NX"]);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Durable x402 replay store is not configured");
  }

  const store = await readStore();
  store.usedTxHashes[hash.toLowerCase()] = Date.now();
  await writeStore(store);
}
