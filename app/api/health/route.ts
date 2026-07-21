import { createPublicClient, http, isAddress } from "viem";

import { arcTestnet } from "@/config/chain";
import { clearingHouseAbi, clearingHouseAddress } from "@/lib/clearing-contract";
import {
  ARC_TESTNET_USDC_ADDRESS,
  clearDealUsdcAddress,
} from "@/lib/cleardeal-contract";
import { isDurableKvConfigured } from "@/lib/kv-rest";

export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(arcTestnet.rpcUrls.default.http[0]) });
  let clearingCodePresent = false;
  let clearingUsdcMatches = false;
  let rpcReachable = false;
  let latestBlock: string | undefined;

  try {
    const blockNumber = await publicClient.getBlockNumber();
    latestBlock = blockNumber.toString();
    rpcReachable = true;
    if (clearingHouseAddress) {
      const [code, contractUsdc] = await Promise.all([
        publicClient.getBytecode({ address: clearingHouseAddress }),
        publicClient.readContract({ address: clearingHouseAddress, abi: clearingHouseAbi, functionName: "usdc" }),
      ]);
      clearingCodePresent = Boolean(code && code !== "0x");
      clearingUsdcMatches = contractUsdc.toLowerCase() === clearDealUsdcAddress.toLowerCase();
    }
  } catch {
    rpcReachable = false;
  }

  const checks = {
    appUrl: configured("NEXT_PUBLIC_APP_URL"),
    arcRpc: configured("NEXT_PUBLIC_ARC_RPC_URL") && rpcReachable,
    canonicalUsdc: isAddress(clearDealUsdcAddress) && clearDealUsdcAddress.toLowerCase() === ARC_TESTNET_USDC_ADDRESS.toLowerCase(),
    clearingAddress: Boolean(clearingHouseAddress),
    clearingBytecode: clearingCodePresent,
    clearingUsdc: clearingUsdcMatches,
    metadataStore: isDurableKvConfigured,
  };
  const ready = Object.values(checks).every(Boolean);

  return Response.json({
    status: ready ? "ok" : "not_ready",
    ready,
    product: "ClearDeal",
    network: { name: "Arc Testnet", chainId: arcTestnet.id, latestBlock },
    checks,
    notes: {
      testnetOnly: "Arc Testnet USDC has no real-world value. Mainnet is not implied.",
      metadata: checks.metadataStore ? "wallet-signed durable cycle metadata and evidence enabled" : "configure Upstash or Vercel KV before creating cycles",
      contract: checks.clearingBytecode && checks.clearingUsdc ? "ClearingHouse bytecode and canonical USDC verified" : "deploy and verify ClearDealClearingHouse before public testing",
    },
  }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
