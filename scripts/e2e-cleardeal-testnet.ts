import { randomUUID } from "node:crypto";

import hre from "hardhat";
import { Wallet, type TransactionResponse } from "ethers";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;
const EXPLORER = "https://testnet.arcscan.app";
const ARC_CHAIN_ID = 5_042_002n;
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_CLEARDEAL_ESCROW_ADDRESS ??
  "0x9F95E8Cf6D495F6B1898526D8Bb301b3523560fe";
const EXECUTE = process.env.CLEARDEAL_E2E_EXECUTE === "true";
const APP_URL = (
  process.env.CLEARDEAL_E2E_APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://cleardeal-app.vercel.app"
).replace(/\/$/, "");

const usdcAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
] as const;

interface ClearDealMetadata {
  version: 1;
  client: string;
  team?: string;
  title: string;
  milestones: Array<{ title: string; dueDate: string }>;
}

interface StoreDealMetadataAuthorization {
  ownerAddress: `0x${string}`;
  metadataHash: `0x${string}`;
  requestId: string;
  issuedAt: number;
}

function serializeDealMetadata(metadata: ClearDealMetadata) {
  return JSON.stringify({
    version: 1,
    client: metadata.client,
    ...(metadata.team ? { team: metadata.team } : {}),
    title: metadata.title,
    milestones: metadata.milestones.map((milestone) => ({
      title: milestone.title,
      dueDate: milestone.dueDate,
    })),
  });
}

function hashDealMetadata(metadata: ClearDealMetadata) {
  return ethers.keccak256(ethers.toUtf8Bytes(serializeDealMetadata(metadata)));
}

function buildStoreDealMetadataMessage(
  input: StoreDealMetadataAuthorization,
) {
  return [
    "ClearDeal metadata authorization",
    "Action: store-deal-metadata",
    "Network: Arc Testnet (5042002)",
    `Owner: ${input.ownerAddress.toLowerCase()}`,
    `Metadata hash: ${input.metadataHash.toLowerCase()}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing stores public deal metadata. It does not transfer USDC.",
  ].join("\n");
}

async function waitForSuccess(
  transaction: TransactionResponse,
  label: string,
) {
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error(`${label} did not complete.`);
  }
  return receipt;
}

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== ARC_CHAIN_ID) {
    throw new Error(`Expected Arc Testnet (${ARC_CHAIN_ID}), received ${network.chainId}.`);
  }

  const [buyer] = await ethers.getSigners();
  if (!buyer) throw new Error("DEPLOYER_PRIVATE_KEY is required for the testnet proof.");

  const escrowCode = await ethers.provider.getCode(ESCROW_ADDRESS);
  if (escrowCode === "0x") throw new Error("ClearDealEscrow bytecode is missing.");

  const escrow = await ethers.getContractAt("ClearDealEscrowV2", ESCROW_ADDRESS, buyer);
  const boundUsdc = await escrow.usdc();
  if (boundUsdc.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
    throw new Error(`Escrow is bound to unexpected USDC: ${boundUsdc}`);
  }

  const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, buyer);
  const [buyerBalance, escrowBalanceBefore] = (await Promise.all([
    usdc.balanceOf(buyer.address),
    usdc.balanceOf(ESCROW_ADDRESS),
  ])) as [bigint, bigint];
  const amount = ethers.parseUnits("0.02", 6);
  const preview = {
    execute: EXECUTE,
    network: "Arc Testnet",
    chainId: network.chainId.toString(),
    escrow: ESCROW_ADDRESS,
    buyer: buyer.address,
    buyerUsdc: ethers.formatUnits(buyerBalance, 6),
    projectAmountUsdc: ethers.formatUnits(amount, 6),
    appUrl: APP_URL,
  };

  if (!EXECUTE) {
    console.log(
      JSON.stringify(
        {
          ...preview,
          message:
            "Dry run only. Set CLEARDEAL_E2E_EXECUTE=true to create, fund, submit, and complete one 0.02 testnet USDC project.",
        },
        null,
        2,
      ),
    );
    return;
  }
  if (buyerBalance < amount) {
    throw new Error("The E2E buyer does not have enough testnet USDC.");
  }
  if (!APP_URL.startsWith("https://") && !APP_URL.startsWith("http://127.0.0.1")) {
    throw new Error("CLEARDEAL_E2E_APP_URL must be an HTTPS deployment or local QA URL.");
  }

  const seller = Wallet.createRandom().connect(ethers.provider);
  const arbitrator = Wallet.createRandom().connect(ethers.provider);
  const now = Math.floor(Date.now() / 1_000);
  const dueAt = now + 24 * 60 * 60;
  const refundDeadline = now + 7 * 24 * 60 * 60;
  const metadata: ClearDealMetadata = {
    version: 1,
    client: "ClearDeal E2E Client",
    team: "Vietnam Delivery Team",
    title: "ClearDeal production proof",
    milestones: [
      {
        title: "Homepage delivery",
        dueDate: new Date(dueAt * 1_000).toISOString().slice(0, 10),
      },
    ],
  };
  const metadataHash = hashDealMetadata(metadata);
  const authorization: StoreDealMetadataAuthorization = {
    ownerAddress: buyer.address as `0x${string}`,
    metadataHash: metadataHash as `0x${string}`,
    requestId: randomUUID(),
    issuedAt: Date.now(),
  };
  const signature = await buyer.signMessage(
    buildStoreDealMetadataMessage(authorization),
  );
  const metadataResponse = await fetch(`${APP_URL}/api/deals/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...authorization,
      metadata,
      signature,
    }),
  });
  if (!metadataResponse.ok) {
    throw new Error(
      `Production metadata storage failed (${metadataResponse.status}): ${await metadataResponse.text()}`,
    );
  }

  const dealId = (await escrow.nextDealId()) as bigint;
  const createTransaction = await escrow.createDeal(
    seller.address,
    arbitrator.address,
    metadataHash,
    refundDeadline,
    72 * 60 * 60,
    2,
    [seller.address],
    [amount],
    [dueAt],
  );
  await waitForSuccess(createTransaction, "Project creation");

  const approveTransaction = await usdc.approve(ESCROW_ADDRESS, amount);
  await waitForSuccess(approveTransaction, "USDC approval");

  const fundTransaction = await escrow.fundDeal(dealId);
  await waitForSuccess(fundTransaction, "Project funding");

  const sellerGasTransaction = await buyer.sendTransaction({
    to: seller.address,
    value: ethers.parseEther("0.01"),
  });
  await waitForSuccess(sellerGasTransaction, "Seller gas funding");

  const sellerUsdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, seller);
  const sellerBalanceBefore = (await sellerUsdc.balanceOf(seller.address)) as bigint;
  const deliverableHash = ethers.id(`cleardeal-e2e-delivery-${Date.now()}`);
  const submitTransaction = await escrow
    .connect(seller)
    .submitMilestone(dealId, 0, deliverableHash);
  await waitForSuccess(submitTransaction, "Milestone submission");

  const releaseTransaction = await escrow.releaseMilestone(dealId, 0);
  const releaseReceipt = await waitForSuccess(
    releaseTransaction,
    "Milestone release",
  );
  const releaseEvent = releaseReceipt.logs
    .map((log) => {
      try {
        return escrow.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === "MilestoneReleased");

  const [deal, milestone, sellerBalanceAfter, escrowBalance] = await Promise.all([
    escrow.deals(dealId),
    escrow.milestones(dealId, 0),
    sellerUsdc.balanceOf(seller.address) as Promise<bigint>,
    usdc.balanceOf(ESCROW_ADDRESS) as Promise<bigint>,
  ]);
  if (Number(deal.status) !== 2 || Number(milestone.status) !== 2) {
    throw new Error("The project did not reach the completed and released states.");
  }
  if (
    !releaseEvent ||
    releaseEvent.args.recipient.toLowerCase() !== seller.address.toLowerCase() ||
    releaseEvent.args.amount !== amount
  ) {
    throw new Error("The release event did not pay the seller the milestone amount.");
  }
  if (escrowBalance !== escrowBalanceBefore) {
    throw new Error("The proof run changed escrow custody outside its own project.");
  }

  console.log(
    JSON.stringify(
      {
        ...preview,
        state: "completed",
        dealId: dealId.toString(),
        seller: seller.address,
        metadataHash,
        deliverableHash,
        milestoneReleasedUsdc: ethers.formatUnits(amount, 6),
        sellerNetBalanceChangeUsdc: ethers.formatUnits(
          sellerBalanceAfter - sellerBalanceBefore,
          6,
        ),
        sellerGasNote:
          "The seller's net balance change is lower than the gross release because Arc network fees are also paid in USDC.",
        escrowBalanceBeforeUsdc: ethers.formatUnits(escrowBalanceBefore, 6),
        escrowBalanceAfterUsdc: ethers.formatUnits(escrowBalance, 6),
        transactions: {
          create: `${EXPLORER}/tx/${createTransaction.hash}`,
          approve: `${EXPLORER}/tx/${approveTransaction.hash}`,
          fund: `${EXPLORER}/tx/${fundTransaction.hash}`,
          submit: `${EXPLORER}/tx/${submitTransaction.hash}`,
          release: `${EXPLORER}/tx/${releaseTransaction.hash}`,
        },
        projectUrl: `${APP_URL}/dashboard`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
