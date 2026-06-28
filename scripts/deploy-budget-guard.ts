import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import hre from "hardhat";

const ethers = hre.ethers;
const EXPLORER_URL = "https://testnet.arcscan.app";

// Arc Testnet native USDC (also used as gas). Overridable via USDC_ADDRESS.
const DEFAULT_USDC = "0x3600000000000000000000000000000000000000";

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS ?? DEFAULT_USDC;
  const agentWallet = process.env.CIRCLE_AGENT_WALLET_ADDRESS;
  const dailyLimitUsdc = process.env.AGENT_DAILY_LIMIT_USDC ?? "5";

  if (!agentWallet) {
    throw new Error(
      "CIRCLE_AGENT_WALLET_ADDRESS is required so the guard can set the agent's daily policy",
    );
  }

  const dailyLimit = ethers.parseUnits(dailyLimitUsdc, 6);

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log(`Deployer:     ${deployerAddress}`);
  console.log(`USDC:         ${usdcAddress}`);
  console.log(`Agent wallet: ${agentWallet}`);
  console.log(`Daily limit:  ${dailyLimitUsdc} USDC (${dailyLimit} micro)`);

  // Deploy guard
  const factory = await ethers.getContractFactory("AgentBudgetGuard");
  const guard = await factory.deploy(usdcAddress);
  await guard.waitForDeployment();
  const guardAddress = await guard.getAddress();
  const deployTx = guard.deploymentTransaction();
  if (!deployTx) throw new Error("AgentBudgetGuard deployment transaction unavailable");

  console.log(`\n✅ AgentBudgetGuard deployed: ${guardAddress}`);
  console.log(`   tx: ${EXPLORER_URL}/tx/${deployTx.hash}`);

  // Activate the daily policy for the agent wallet (owner-only)
  const policyTx = await guard.setPolicy(agentWallet, dailyLimit, true);
  await policyTx.wait();
  console.log(`✅ Policy set for agent: ${dailyLimitUsdc} USDC/day · active`);
  console.log(`   tx: ${EXPLORER_URL}/tx/${policyTx.hash}`);

  // Merge into deployments/arcTestnet.json
  const deploymentsDir = path.join(process.cwd(), "deployments");
  const file = path.join(deploymentsDir, "arcTestnet.json");
  await mkdir(deploymentsDir, { recursive: true });

  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await readFile(file, "utf8"));
  } catch {
    // first run / file missing — start fresh
  }

  const contracts = (existing.contracts as Record<string, unknown>) ?? {};
  contracts.AgentBudgetGuard = {
    address: guardAddress,
    transactionHash: deployTx.hash,
    explorerLink: `${EXPLORER_URL}/tx/${deployTx.hash}`,
    constructorArgs: [usdcAddress],
    agentWallet,
    dailyLimitUsdc,
    policySetTx: policyTx.hash,
  };

  await writeFile(
    file,
    `${JSON.stringify({ ...existing, contracts, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\nAdd this to .env.local:`);
  console.log(`NEXT_PUBLIC_AGENT_BUDGET_GUARD_ADDRESS=${guardAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
