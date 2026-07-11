import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";

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
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const execFileAsync = promisify(execFile);

// Force Vercel to trace and package the CLI file
try {
  const dummyPath = path.resolve(process.cwd(), "node_modules", "@circle-fin", "cli", "dist", "index.js");
  if (fs.existsSync(dummyPath)) {
    fs.readFileSync(dummyPath, "utf8");
  }
} catch (e) {
  // Ignore
}

// Force Vercel node file tracer to bundle Circle CLI transitive dependencies
if (false) {
  try {
    require("cli-table3");
    require("@noble/curves");
    require("@noble/hashes");
    require("@solana/web3.js");
    require("@x402/core");
    require("@x402/evm");
    require("qrcode");
    require("node-forge");
    require("pino");
    require("semver");
    require("@circle-fin/x402-batching");
    require("rpc-websockets");
    require("zod");
    require("viem");
    require("abitype");
    require("bn.js");
    require("bs58");
    require("json-schema-faker");
    require("@ethersproject/address");
    require("@ethersproject/bytes");
    require("@ethersproject/units");
    require("@coral-xyz/anchor");
    require("@scure/bip32");
    require("@scure/bip39");
    require("@scure/base");
    require("isows");
    require("ws");
    require("ox");
    require("string-width");
  } catch (e) {}
}

// Initialize Circle SDK client if credentials are provided
const circleApiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.ENTITY_SECRET || process.env.CIRCLE_ENTITY_SECRET;
export const circleWalletId = process.env.CIRCLE_WALLET_ID;

export const sdkClient = circleApiKey && entitySecret
  ? initiateDeveloperControlledWalletsClient({
      apiKey: circleApiKey,
      entitySecret: entitySecret,
    })
  : null;

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
  const cliPath = path.resolve(process.cwd(), "node_modules", "@circle-fin", "cli", "dist", "index.js");
  return {
    file: "node",
    args: [cliPath, ...args],
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

  // If SDK credentials and Wallet ID are configured, execute via Circle SDK client
  if (sdkClient && circleWalletId) {
    console.log("Executing transaction via Circle Developer-Controlled Wallets SDK");
    if (agentBudgetGuardAddress) {
      return payThroughBudgetGuardSDK({
        walletId: circleWalletId,
        to: params.to,
        amountUsdc: params.amountUsdc,
        guard: agentBudgetGuardAddress,
        agentAddress: address,
      });
    } else {
      return payDirectSDK({
        walletId: circleWalletId,
        to: params.to,
        amountUsdc: params.amountUsdc,
        agentAddress: address,
      });
    }
  }

  // Fallback to local Circle CLI execution
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

// SDK-based transfer & contract execution functions
async function pollCircleTransaction(txId: string): Promise<{ state: string; txHash: Hash; id: string; networkFee?: string }> {
  if (!sdkClient) throw new Error("Circle SDK not initialized");

  const maxAttempts = 20;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const txResponse = await sdkClient.getTransaction({ id: txId });
    const tx = txResponse.data?.transaction;

    if (tx?.state === "COMPLETE") {
      if (!tx.txHash) {
        throw new Error("Transaction state is COMPLETE but txHash is missing");
      }
      return {
        id: tx.id,
        state: "complete",
        txHash: tx.txHash as Hash,
        networkFee: tx.networkFee,
      };
    }

    if (["FAILED", "DENIED", "CANCELLED"].includes(tx?.state || "")) {
      throw new Error(`Circle SDK transaction failed in state ${tx?.state}. Error details: ${JSON.stringify(tx?.errorDetails)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Circle SDK transaction did not complete within the polling window");
}

async function payDirectSDK(params: {
  walletId: string;
  to: Address;
  amountUsdc: string;
  agentAddress: Address;
}): Promise<CircleTransferResult> {
  if (!sdkClient) throw new Error("Circle SDK not initialized");

  console.log(`Initiating direct USDC transfer of ${params.amountUsdc} to ${params.to} via Circle SDK`);
  const response = await sdkClient.createTransaction({
    walletId: params.walletId,
    tokenAddress: usdcAddress,
    destinationAddress: params.to,
    amount: [params.amountUsdc],
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });

  const txId = response.data?.id;
  if (!txId) {
    throw new Error("Circle SDK failed to initiate transaction (no ID returned)");
  }

  const txDetails = await pollCircleTransaction(txId);
  return {
    id: txDetails.id,
    state: txDetails.state,
    txHash: txDetails.txHash,
    sourceAddress: params.agentAddress,
    destinationAddress: params.to,
    amount: params.amountUsdc,
    networkFee: txDetails.networkFee,
  };
}

async function payThroughBudgetGuardSDK(params: {
  walletId: string;
  to: Address;
  amountUsdc: string;
  guard: Address;
  agentAddress: Address;
}): Promise<CircleTransferResult> {
  if (!sdkClient) throw new Error("Circle SDK not initialized");

  const amountRaw = parseUnits(params.amountUsdc, 6).toString();
  console.log(`SDK Step 1: Approve budget guard ${params.guard} to spend ${params.amountUsdc} USDC`);

  const approveResponse = await sdkClient.createContractExecutionTransaction({
    walletId: params.walletId,
    contractAddress: usdcAddress,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: [params.guard, amountRaw],
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });

  const approveTxId = approveResponse.data?.id;
  if (!approveTxId) {
    throw new Error("Circle SDK failed to initiate approve contract execution transaction");
  }
  await pollCircleTransaction(approveTxId);

  console.log(`SDK Step 2: Execute spend on budget guard for ${params.amountUsdc} USDC to ${params.to}`);
  const paymentId = `0x${randomBytes(32).toString("hex")}`;
  const spendResponse = await sdkClient.createContractExecutionTransaction({
    walletId: params.walletId,
    contractAddress: params.guard,
    abiFunctionSignature: "spend(address,uint256,bytes32)",
    abiParameters: [params.to, amountRaw, paymentId],
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });

  const spendTxId = spendResponse.data?.id;
  if (!spendTxId) {
    throw new Error("Circle SDK failed to initiate spend contract execution transaction");
  }

  const spendDetails = await pollCircleTransaction(spendTxId);
  return {
    id: paymentId,
    state: spendDetails.state,
    txHash: spendDetails.txHash,
    sourceAddress: params.agentAddress,
    destinationAddress: params.to,
    amount: params.amountUsdc,
    networkFee: spendDetails.networkFee,
  };
}
