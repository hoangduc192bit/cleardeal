import "dotenv/config";

import { randomUUID } from "node:crypto";
import hre from "hardhat";
import type { Address } from "viem";

import {
  buildStoreExpenseMetadataMessage,
  hashExpenseMetadata,
  type ExpenseMetadata,
} from "../lib/expense-metadata.ts";

const ethers = hre.ethers;
const CHAIN_ID = 5_042_002n;
const TREASURY =
  process.env.NEXT_PUBLIC_CLEARDEAL_TREASURY_ADDRESS ??
  "0x596c87B47B0557ae1226208914888C2872736dc2";
const USDC = "0x3600000000000000000000000000000000000000";
const MEMO = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505";
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://cleardeal-app.vercel.app"
).replace(/\/$/, "");
const ROLE_BALANCE_TARGET = ethers.parseEther("0.04");
const MAX_ROLE_FUNDING = ethers.parseEther("0.12");
const APPROVED_BUDGET = ethers.parseUnits("0.05", 6);
const PAYOUT_AMOUNT = ethers.parseUnits("0.047", 6);

const tokenAbi = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];
const memoAbi = [
  "function memo(address target,bytes data,bytes32 memoId,bytes memoData)",
  "event Memo(address indexed sender,address indexed target,bytes32 callDataHash,bytes32 indexed memoId,bytes memo,uint256 memoIndex)",
];

interface ExpenseEvidence {
  version: 1;
  expenseId: string;
  reference: string;
  submittedAt: string;
}

function hashExpenseEvidence(evidence: ExpenseEvidence) {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify({
        version: 1,
        expenseId: evidence.expenseId,
        reference: evidence.reference,
        submittedAt: evidence.submittedAt,
      }),
    ),
  );
}

function buildStoreExpenseEvidenceMessage(input: {
  requesterAddress: Address;
  evidenceHash: string;
  requestId: string;
  issuedAt: number;
}) {
  return [
    "ClearDeal expense evidence authorization",
    "Action: store-expense-evidence",
    "Network: Arc Testnet (5042002)",
    `Requester: ${input.requesterAddress.toLowerCase()}`,
    `Evidence hash: ${input.evidenceHash.toLowerCase()}`,
    `Request ID: ${input.requestId}`,
    `Issued at: ${input.issuedAt}`,
    "",
    "Signing stores public testnet invoice evidence. It does not transfer USDC.",
  ].join("\n");
}

async function confirmed(
  transaction: Promise<{ wait(): Promise<unknown>; hash: string }>,
) {
  const pending = await transaction;
  await pending.wait();
  return pending.hash;
}

async function postJson(path: string, body: unknown) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${APP_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return;
    const responseBody = await response.text();
    if (
      ![429, 502, 503].includes(response.status) ||
      attempt === 3
    ) {
      throw new Error(
        `${path} returned ${response.status}: ${responseBody}`,
      );
    }
    await new Promise((resolve) =>
      setTimeout(resolve, 1_000 * 2 ** attempt),
    );
  }
}

async function main() {
  if (process.env.CLEARDEAL_TREASURY_E2E_EXECUTE !== "true") {
    console.log(
      "Dry-run only. Set CLEARDEAL_TREASURY_E2E_EXECUTE=true to create and pay one public Arc Testnet expense.",
    );
    console.log(
      "The run derives deterministic test-only employee, manager, and vendor wallets, funds at most 0.12 testnet USDC total, and never prints private keys.",
    );
    return;
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) throw new Error("DEPLOYER_PRIVATE_KEY is required.");
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== CHAIN_ID) {
    throw new Error(
      `Refusing to run outside Arc Testnet. Connected chain: ${network.chainId}`,
    );
  }
  if ((await ethers.provider.getCode(TREASURY)) === "0x") {
    throw new Error("ClearDealTreasury bytecode is missing.");
  }
  if ((await ethers.provider.getCode(MEMO)) === "0x") {
    throw new Error("Arc Memo bytecode is missing.");
  }

  const finance = new ethers.Wallet(deployerKey, ethers.provider);
  const deriveWallet = (role: string) =>
    new ethers.Wallet(
      ethers.keccak256(
        ethers.solidityPacked(
          ["bytes32", "string"],
          [
            deployerKey,
            `cleardeal-treasury-e2e:${TREASURY}:${role}`,
          ],
        ),
      ),
      ethers.provider,
    );
  const requester = deriveWallet("marketing-requester");
  const manager = deriveWallet("marketing-manager");
  const vendor = deriveWallet("event-vendor");
  const fundedRoles = [requester, manager];

  const fundingNeeds = await Promise.all(
    fundedRoles.map(async (wallet) => {
      const balance = await ethers.provider.getBalance(wallet.address);
      return balance < ROLE_BALANCE_TARGET
        ? ROLE_BALANCE_TARGET - balance
        : 0n;
    }),
  );
  const totalFunding = fundingNeeds.reduce(
    (sum, amount) => sum + amount,
    0n,
  );
  if (totalFunding > MAX_ROLE_FUNDING) {
    throw new Error("Role-wallet funding exceeds the hard safety cap.");
  }
  if (
    (await ethers.provider.getBalance(finance.address)) <
    totalFunding + ethers.parseEther("0.2")
  ) {
    throw new Error("Finance wallet lacks the reserved Arc Testnet balance.");
  }
  for (let index = 0; index < fundedRoles.length; index += 1) {
    if (fundingNeeds[index] > 0n) {
      await confirmed(
        finance.sendTransaction({
          to: fundedRoles[index].address,
          value: fundingNeeds[index],
        }),
      );
    }
  }

  const treasury = await ethers.getContractAt(
    "ClearDealTreasury",
    TREASURY,
    requester,
  );
  if ((await treasury.usdc()).toLowerCase() !== USDC.toLowerCase()) {
    throw new Error(
      "ClearDealTreasury is not bound to canonical Arc Testnet USDC.",
    );
  }
  const memoCode = "CD-MKT-001";
  const metadata: ExpenseMetadata = {
    version: 1,
    title: "Vietnam developer community launch event",
    purpose:
      "Marketing requests a vendor payment for venue, printed materials, and event support.",
    department: "Marketing",
    requesterName: "Linh Nguyen",
    vendorName: "Saigon Event Studio",
    acceptance:
      "Finance receives the final invoice and sample delivery evidence after manager approval.",
    memoCode,
  };
  const metadataHash = hashExpenseMetadata(metadata);
  const memoId = ethers.keccak256(ethers.toUtf8Bytes(memoCode));
  const expenseId = await treasury.nextExpenseId();

  const createHash = await confirmed(
    treasury.createExpense(
      manager.address,
      finance.address,
      vendor.address,
      APPROVED_BUDGET,
      metadataHash,
      memoId,
    ),
  );
  const metadataAuthorization = {
    ownerAddress: requester.address as Address,
    metadataHash,
    requestId: randomUUID(),
    issuedAt: Date.now(),
  };
  await postJson("/api/expenses/metadata", {
    ...metadataAuthorization,
    metadata,
    signature: await requester.signMessage(
      buildStoreExpenseMetadataMessage(metadataAuthorization),
    ),
  });

  const managerTreasury = treasury.connect(manager);
  const approveHash = await confirmed(
    managerTreasury.managerDecision(expenseId, true),
  );
  const evidence: ExpenseEvidence = {
    version: 1,
    expenseId: expenseId.toString(),
    reference:
      "Sample invoice INV-MKT-001 reviewed. Venue and event materials match the approved scope.",
    submittedAt: new Date().toISOString(),
  };
  const evidenceHash = hashExpenseEvidence(evidence);
  const evidenceAuthorization = {
    requesterAddress: requester.address as Address,
    evidenceHash,
    requestId: randomUUID(),
    issuedAt: Date.now(),
  };
  await postJson("/api/expenses/evidence", {
    ...evidenceAuthorization,
    evidence,
    attachmentPayloads: [],
    signature: await requester.signMessage(
      buildStoreExpenseEvidenceMessage(evidenceAuthorization),
    ),
  });
  const evidenceTxHash = await confirmed(
    treasury.submitEvidence(
      expenseId,
      evidenceHash,
      PAYOUT_AMOUNT,
    ),
  );

  const financeTreasury = treasury.connect(finance);
  const usdc = new ethers.Contract(USDC, tokenAbi, finance);
  const approvalHash = await confirmed(
    usdc.approve(TREASURY, PAYOUT_AMOUNT),
  );
  const vendorBalanceBefore = await usdc.balanceOf(vendor.address);
  const payData = financeTreasury.interface.encodeFunctionData(
    "payExpense",
    [expenseId],
  );
  const memo = new ethers.Contract(MEMO, memoAbi, finance);
  const memoTransaction = await memo.memo(
    TREASURY,
    payData,
    memoId,
    ethers.toUtf8Bytes(`expense=${memoCode}`),
  );
  const memoReceipt = await memoTransaction.wait();
  if (!memoReceipt || memoReceipt.status !== 1) {
    throw new Error("Memo payment did not confirm.");
  }

  const paidExpense = await treasury.expenses(expenseId);
  const vendorBalanceAfter = await usdc.balanceOf(vendor.address);
  if (paidExpense.status !== 3n) {
    throw new Error("Expense did not reach Paid state.");
  }
  if (vendorBalanceAfter - vendorBalanceBefore !== PAYOUT_AMOUNT) {
    throw new Error("Vendor did not receive the exact approved payout.");
  }

  console.log(
    JSON.stringify(
      {
        result: "paid",
        expenseId: expenseId.toString(),
        request: `${APP_URL}/dashboard?expense=${expenseId.toString()}`,
        approvedBudgetUsdc: ethers.formatUnits(APPROVED_BUDGET, 6),
        paidUsdc: ethers.formatUnits(PAYOUT_AMOUNT, 6),
        budgetSavedUsdc: ethers.formatUnits(
          APPROVED_BUDGET - PAYOUT_AMOUNT,
          6,
        ),
        roles: {
          requester: requester.address,
          manager: manager.address,
          finance: finance.address,
          vendor: vendor.address,
        },
        transactions: {
          createExpense: createHash,
          managerApproval: approveHash,
          evidence: evidenceTxHash,
          usdcApproval: approvalHash,
          memoPayment: memoTransaction.hash,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
