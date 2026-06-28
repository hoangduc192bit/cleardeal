import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";

import { parseUnits, createWalletClient, http, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/config/chain";
import {
  agentBudgetGuardAddress,
  usdcAddress,
  publicClient,
  erc20Abi,
  agentBudgetGuardAbi,
} from "@/lib/contracts";

const execFileAsync = promisify(execFile);

export interface CircleTransferResult {
  id: string;
  state: string;
  txHash: Hash;
  sourceAddress: Address;
  destinationAddress: Address;
  amount: string;
  networkFee?: string;
}

function circleCommand(args: string[]) {
  if (process.platform === "win32") {
    return {
      file: "cmd.exe",
      args: ["/d", "/s", "/c", "circle", ...args],
    };
  }

  return {
    file: "circle",
    args,
  };
}

export function getCircleAgentWalletConfig() {
  const address = process.env.CIRCLE_AGENT_WALLET_ADDRESS as Address | undefined;
  const chain = process.env.CIRCLE_AGENT_WALLET_CHAIN ?? "ARC-TESTNET";

  if (!address) {
    throw new Error("CIRCLE_AGENT_WALLET_ADDRESS is not configured");
  }

  return { address, chain };
}

interface CircleTransferData {
  id?: string;
  state?: string;
  txHash?: Hash;
  sourceAddress?: Address;
  destinationAddress?: Address;
  amounts?: string[];
  networkFee?: string;
}

function isTransferComplete(data: CircleTransferData | undefined): data is Required<Pick<CircleTransferData, "id" | "state" | "txHash" | "sourceAddress" | "destinationAddress">> & CircleTransferData {
  return Boolean(data?.txHash && data.id && data.state && data.sourceAddress && data.destinationAddress);
}

function isTransactionComplete(data: CircleTransferData | undefined): data is Required<Pick<CircleTransferData, "id" | "state" | "txHash" | "sourceAddress">> & CircleTransferData {
  return Boolean(data?.txHash && data.id && data.state && data.sourceAddress);
}

async function executeCircleWithTxHash(
  args: string[],
  amountUsdc: string,
  fallbackDestination: Address,
): Promise<CircleTransferResult> {
  const command = circleCommand(args);
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { stdout } = await execFileAsync(command.file, command.args, {
        timeout: 60_000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });

      const parsed = JSON.parse(stdout) as { data?: CircleTransferData };
      const data = parsed.data;

      if (isTransactionComplete(data)) {
        return {
          id: data.id,
          state: data.state,
          txHash: data.txHash,
          sourceAddress: data.sourceAddress,
          destinationAddress: data.destinationAddress ?? fallbackDestination,
          amount: data.amounts?.[0] ?? amountUsdc,
          networkFee: data.networkFee,
        };
      }

      lastError = new Error("Circle transaction pending (txHash not yet broadcast)");
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }

  throw new Error(
    `Circle agent wallet transaction did not confirm a txHash after ${maxAttempts} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

/**
 * Pay a tool provider from the Circle agent wallet via the Circle CLI or direct Viem signature.
 */
export async function payWithCircleAgentWallet(params: {
  to: Address;
  amountUsdc: string;
  agentPrivateKey?: string;
}): Promise<CircleTransferResult> {
  if (params.agentPrivateKey && agentBudgetGuardAddress) {
    return payWithViemDirect({
      privateKey: params.agentPrivateKey,
      to: params.to,
      amountUsdc: params.amountUsdc,
      guard: agentBudgetGuardAddress,
    });
  }

  const { address, chain } = getCircleAgentWalletConfig();
  if (agentBudgetGuardAddress) {
    return payThroughBudgetGuard({
      agent: address,
      chain,
      to: params.to,
      amountUsdc: params.amountUsdc,
      guard: agentBudgetGuardAddress,
    });
  }

  const idempotencyKey = randomUUID();

  return executeCircleWithTxHash([
    "wallet",
    "transfer",
    params.to,
    "--amount",
    params.amountUsdc,
    "--token",
    usdcAddress,
    "--address",
    address,
    "--chain",
    chain,
    "--idempotency-key",
    idempotencyKey,
    "--output",
    "json",
  ], params.amountUsdc, params.to);
}

async function payWithViemDirect(params: {
  privateKey: string;
  to: Address;
  amountUsdc: string;
  guard: Address;
}): Promise<CircleTransferResult> {
  const account = privateKeyToAccount(params.privateKey as Hash);
  const agentAddress = account.address;
  const amountRaw = parseUnits(params.amountUsdc, 6);

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(),
  });

  // 1. Approve
  const approveHash = await walletClient.writeContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [params.guard, amountRaw],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. Spend
  const paymentId = `0x${randomBytes(32).toString("hex")}` as Hash;
  const spendHash = await walletClient.writeContract({
    address: params.guard,
    abi: agentBudgetGuardAbi,
    functionName: "spend",
    args: [params.to, amountRaw, paymentId],
  });
  await publicClient.waitForTransactionReceipt({ hash: spendHash });

  return {
    id: paymentId,
    state: "complete",
    txHash: spendHash,
    sourceAddress: agentAddress,
    destinationAddress: params.to,
    amount: params.amountUsdc,
  };
}

async function payThroughBudgetGuard(params: {
  agent: Address;
  chain: string;
  to: Address;
  amountUsdc: string;
  guard: Address;
}) {
  const amountRaw = parseUnits(params.amountUsdc, 6).toString();

  await executeCircleWithTxHash([
    "wallet",
    "execute",
    "approve(address,uint256)",
    params.guard,
    amountRaw,
    "--contract",
    usdcAddress,
    "--address",
    params.agent,
    "--chain",
    params.chain,
    "--idempotency-key",
    randomUUID(),
    "--output",
    "json",
  ], params.amountUsdc, params.guard);

  const paymentId = `0x${randomBytes(32).toString("hex")}`;

  return executeCircleWithTxHash([
    "wallet",
    "execute",
    "spend(address,uint256,bytes32)",
    params.to,
    amountRaw,
    paymentId,
    "--contract",
    params.guard,
    "--address",
    params.agent,
    "--chain",
    params.chain,
    "--idempotency-key",
    randomUUID(),
    "--output",
    "json",
  ], params.amountUsdc, params.to);
}
