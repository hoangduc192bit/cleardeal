import "dotenv/config";

import { randomUUID } from "node:crypto";
import hre from "hardhat";
import type { Address } from "viem";

import { buildStoreClearingEvidenceMessage, hashClearingEvidence, type ClearingEvidence } from "../lib/clearing-evidence.ts";
import { buildStoreClearingMetadataMessage, hashClearingMetadata, type ClearingMetadata } from "../lib/clearing-metadata.ts";

const ethers = hre.ethers;
const CHAIN_ID = 5_042_002n;
const CLEARING_HOUSE = process.env.NEXT_PUBLIC_CLEARING_HOUSE_ADDRESS ?? "0x0B917A65F186cbf1Cb59694695f4930B16bcAAf4";
const USDC = "0x3600000000000000000000000000000000000000";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://cleardeal-app.vercel.app").replace(/\/$/, "");
const ROLE_BALANCE_TARGET = ethers.parseEther("0.08");
const MAX_ROLE_FUNDING = ethers.parseEther("0.5");

const tokenAbi = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];

async function confirmed(transaction: Promise<{ wait(): Promise<unknown>; hash: string }>) {
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
    if (![429, 502, 503].includes(response.status) || attempt === 3) throw new Error(`${path} returned ${response.status}: ${responseBody}`);
    await new Promise((resolve) => setTimeout(resolve, 1_000 * (2 ** attempt)));
  }
}

async function main() {
  if (process.env.CLEARDEAL_E2E_EXECUTE !== "true") {
    console.log("Dry-run only. Set CLEARDEAL_E2E_EXECUTE=true to create and settle one public Arc Testnet cycle.");
    console.log("The run derives five deterministic test-only role wallets, funds at most 0.5 testnet USDC total, and never prints private keys.");
    return;
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) throw new Error("DEPLOYER_PRIVATE_KEY is required.");
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== CHAIN_ID) throw new Error(`Refusing to run outside Arc Testnet. Connected chain: ${network.chainId}`);
  const code = await ethers.provider.getCode(CLEARING_HOUSE);
  if (code === "0x") throw new Error("ClearingHouse bytecode is missing.");

  const deployer = new ethers.Wallet(deployerKey, ethers.provider);
  const deriveWallet = (role: string) => new ethers.Wallet(
    ethers.keccak256(ethers.solidityPacked(["bytes32", "string"], [deployerKey, `cleardeal-arc-testnet-e2e:${CLEARING_HOUSE}:${role}`])),
    ethers.provider,
  );
  const agentB = deriveWallet("agent-b");
  const agentC = deriveWallet("agent-c");
  const verifier1 = deriveWallet("verifier-1");
  const verifier2 = deriveWallet("verifier-2");
  const arbitrator = deriveWallet("arbitrator");
  const roleWallets = [agentB, agentC, verifier1, verifier2, arbitrator];

  const fundingNeeds = await Promise.all(roleWallets.map(async (wallet) => {
    const balance = await ethers.provider.getBalance(wallet.address);
    return balance < ROLE_BALANCE_TARGET ? ROLE_BALANCE_TARGET - balance : 0n;
  }));
  const totalFunding = fundingNeeds.reduce((sum, amount) => sum + amount, 0n);
  if (totalFunding > MAX_ROLE_FUNDING) throw new Error("Role-wallet funding exceeds the hard safety cap.");
  if (await ethers.provider.getBalance(deployer.address) < totalFunding + ethers.parseEther("0.25")) throw new Error("Deployer lacks the reserved Arc Testnet gas balance.");

  for (let index = 0; index < roleWallets.length; index += 1) {
    if (fundingNeeds[index] > 0n) await confirmed(deployer.sendTransaction({ to: roleWallets[index].address, value: fundingNeeds[index] }));
  }

  const clearing = await ethers.getContractAt("ClearDealClearingHouse", CLEARING_HOUSE, deployer);
  const usdc = new ethers.Contract(USDC, tokenAbi, deployer);
  if ((await clearing.usdc()).toLowerCase() !== USDC.toLowerCase()) throw new Error("ClearingHouse is not bound to canonical Arc Testnet USDC.");

  const participants = [deployer.address, agentB.address, agentC.address] as Address[];
  const verifiers = [verifier1.address, verifier2.address] as Address[];
  const metadata: ClearingMetadata = {
    version: 1,
    name: "Public six-wallet clearing test",
    description: "A real Arc Testnet cycle proving three obligations can net from 0.27 USDC gross to 0.02 USDC settlement.",
    participants: [
      { address: participants[0], label: "Agent A · Net debtor" },
      { address: participants[1], label: "Agent B · Net creditor" },
      { address: participants[2], label: "Agent C · Net creditor" },
    ],
    verifiers: [
      { address: verifiers[0], label: "Verifier 1" },
      { address: verifiers[1], label: "Verifier 2" },
    ],
    obligations: [
      { payer: participants[0], provider: participants[1], title: "Agent B delivery", acceptance: "E2E evidence is signed by Agent B and approved by both independent verifiers." },
      { payer: participants[1], provider: participants[2], title: "Agent C delivery", acceptance: "E2E evidence is signed by Agent C and approved by both independent verifiers." },
      { payer: participants[2], provider: participants[0], title: "Agent A delivery", acceptance: "E2E evidence is signed by Agent A and approved by both independent verifiers." },
    ],
  };
  const metadataHash = hashClearingMetadata(metadata);
  const obligationAmounts = [ethers.parseUnits("0.10", 6), ethers.parseUnits("0.09", 6), ethers.parseUnits("0.08", 6)];
  const bond = ethers.parseUnits("0.01", 6);
  const obligationInputs = metadata.obligations.map((item, index) => ({
    payer: item.payer,
    provider: item.provider,
    amount: obligationAmounts[index],
    bondAmount: bond,
    specHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ payer: item.payer.toLowerCase(), provider: item.provider.toLowerCase(), title: item.title, acceptance: item.acceptance }))),
  }));
  const resumeValue = process.env.CLEARDEAL_E2E_CYCLE_ID;
  if (resumeValue && !/^\d+$/.test(resumeValue)) throw new Error("CLEARDEAL_E2E_CYCLE_ID must be an unsigned integer.");
  const cycleId = resumeValue ? BigInt(resumeValue) : await clearing.nextCycleId();
  const now = Math.floor(Date.now() / 1_000);
  const transactions: Record<string, string | string[]> = {};

  if (resumeValue) {
    const existing = await clearing.cycles(cycleId);
    if (existing.creator.toLowerCase() !== deployer.address.toLowerCase() || existing.metadataHash.toLowerCase() !== metadataHash.toLowerCase()) {
      throw new Error(`Cycle ${cycleId.toString()} is not the deterministic ClearDeal E2E cycle.`);
    }
    transactions.createCycle = "resumed-existing-cycle";
  } else {
    transactions.createCycle = await confirmed(clearing.createCycle(
      { arbitrator: arbitrator.address, metadataHash, evidenceDeadline: now + 86_400, fundingDeadline: now + 172_800, verifierThreshold: 2 },
      participants,
      verifiers,
      obligationInputs,
    ));
  }

  const metadataAuthorization = { ownerAddress: participants[0], metadataHash, requestId: randomUUID(), issuedAt: Date.now() };
  await postJson("/api/clearing/metadata", {
    ...metadataAuthorization,
    metadata,
    signature: await deployer.signMessage(buildStoreClearingMetadataMessage(metadataAuthorization)),
  });

  const providers = [agentB, agentC, deployer];
  transactions.bonds = [];
  for (let index = 0; index < providers.length; index += 1) {
    const obligation = await clearing.obligations(cycleId, index);
    if (obligation.status !== 0n) continue;
    const providerUsdc = usdc.connect(providers[index]) as typeof usdc;
    transactions.bonds.push(await confirmed(providerUsdc.approve(CLEARING_HOUSE, bond)));
    transactions.bonds.push(await confirmed(clearing.connect(providers[index]).postBond(cycleId, index)));
  }

  transactions.evidence = [];
  for (let index = 0; index < providers.length; index += 1) {
    const obligation = await clearing.obligations(cycleId, index);
    if (obligation.status !== 1n) continue;
    const evidence: ClearingEvidence = {
      version: 1,
      cycleId: cycleId.toString(),
      obligationId: index.toString(),
      reference: `ClearDeal public Arc Testnet E2E evidence for cycle ${cycleId.toString()}, obligation ${index.toString()}.`,
      submittedAt: new Date().toISOString(),
    };
    const evidenceHash = hashClearingEvidence(evidence);
    const evidenceAuthorization = { providerAddress: providers[index].address as Address, evidenceHash, requestId: randomUUID(), issuedAt: Date.now() };
    await postJson("/api/clearing/evidence", {
      ...evidenceAuthorization,
      evidence,
      signature: await providers[index].signMessage(buildStoreClearingEvidenceMessage(evidenceAuthorization)),
    });
    transactions.evidence.push(await confirmed(clearing.connect(providers[index]).submitEvidence(cycleId, index, evidenceHash)));
  }

  transactions.verification = [];
  for (let index = 0; index < providers.length; index += 1) {
    let obligation = await clearing.obligations(cycleId, index);
    if (obligation.status !== 2n) continue;
    if (await clearing.verifierVotes(cycleId, index, verifier1.address) === 0n) {
      transactions.verification.push(await confirmed(clearing.connect(verifier1).castVote(cycleId, index, true)));
    }
    obligation = await clearing.obligations(cycleId, index);
    if (obligation.status === 2n && await clearing.verifierVotes(cycleId, index, verifier2.address) === 0n) {
      transactions.verification.push(await confirmed(clearing.connect(verifier2).castVote(cycleId, index, true)));
    }
  }

  let cleared = await clearing.cycles(cycleId);
  if (cleared.status === 0n && cleared.finalizedCount === cleared.obligationCount) {
    transactions.closeCycle = await confirmed(clearing.closeCycle(cycleId));
    cleared = await clearing.cycles(cycleId);
  }
  const expectedGross = ethers.parseUnits("0.27", 6);
  const expectedNet = ethers.parseUnits("0.02", 6);
  if (cleared.status === 0n) throw new Error("Cycle still has unresolved obligations after verification.");
  if (cleared.status !== 2n && (cleared.clearedGross !== expectedGross || cleared.totalNetDebit !== expectedNet)) throw new Error("Onchain netting result does not match the committed graph.");

  if (cleared.status === 1n && await clearing.netFunding(cycleId, deployer.address) === 0n) {
    transactions.fundApproval = await confirmed(usdc.approve(CLEARING_HOUSE, expectedNet));
    transactions.fundNetPosition = await confirmed(clearing.fundNetPosition(cycleId));
    cleared = await clearing.cycles(cycleId);
  }
  if (cleared.status === 1n && cleared.fundedNet === cleared.totalNetDebit) {
    transactions.settlement = await confirmed(clearing.settleCycle(cycleId));
  }
  const settled = await clearing.cycles(cycleId);
  if (settled.status !== 2n) throw new Error("Cycle did not reach Settled state.");

  console.log(JSON.stringify({
    result: "settled",
    cycleId: cycleId.toString(),
    room: `${APP_URL}/dashboard?cycle=${cycleId.toString()}`,
    grossUsdc: ethers.formatUnits(settled.clearedGross, 6),
    netUsdc: ethers.formatUnits(settled.totalNetDebit, 6),
    liquiditySavedUsdc: ethers.formatUnits(settled.clearedGross - settled.totalNetDebit, 6),
    roles: { agentA: deployer.address, agentB: agentB.address, agentC: agentC.address, verifier1: verifier1.address, verifier2: verifier2.address, arbitrator: arbitrator.address },
    transactions,
  }, null, 2));
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
