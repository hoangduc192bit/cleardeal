import { createPublicClient, http, isAddress } from "viem";

import { arcTestnet } from "@/config/chain";
import {
  clearDealEscrowAbi,
  clearDealEscrowAddress,
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
  let escrowCodePresent = false;
  let escrowUsdcMatches = false;
  let rpcReachable = false;
  let latestBlock: string | undefined;

  try {
    const blockNumber = await publicClient.getBlockNumber();
    latestBlock = blockNumber.toString();
    rpcReachable = true;
    const [code, contractUsdc] = await Promise.all([
      publicClient.getBytecode({ address: clearDealEscrowAddress }),
      publicClient.readContract({
        address: clearDealEscrowAddress,
        abi: clearDealEscrowAbi,
        functionName: "usdc",
      }),
    ]);
    escrowCodePresent = Boolean(code && code !== "0x");
    escrowUsdcMatches = contractUsdc.toLowerCase() === clearDealUsdcAddress.toLowerCase();
  } catch {
    rpcReachable = false;
  }

  const checks = {
    appUrl: configured("NEXT_PUBLIC_APP_URL"),
    arcRpc: configured("NEXT_PUBLIC_ARC_RPC_URL") && rpcReachable,
    canonicalUsdc: isAddress(clearDealUsdcAddress) && clearDealUsdcAddress.toLowerCase() === ARC_TESTNET_USDC_ADDRESS.toLowerCase(),
    escrowAddress: isAddress(clearDealEscrowAddress),
    escrowBytecode: escrowCodePresent,
    escrowUsdc: escrowUsdcMatches,
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
      metadata: checks.metadataStore
        ? "wallet-signed project descriptions and delivery evidence enabled"
        : "configure Upstash or Vercel KV before creating projects",
      contract: checks.escrowBytecode && checks.escrowUsdc
        ? "ClearDealEscrow bytecode and canonical USDC verified"
        : "verify the ClearDealEscrow deployment before public testing",
    },
  }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
