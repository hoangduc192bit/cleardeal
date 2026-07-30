import hre from "hardhat";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000";
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY is not configured.");

  console.log(`Deploying ClearDealEscrowV2 from ${deployer.address}`);
  const escrow = await ethers.deployContract("ClearDealEscrowV2", [usdcAddress]);
  const deployment = escrow.deploymentTransaction();
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  const receipt = deployment ? await deployment.wait() : null;

  console.log(`ClearDealEscrowV2 deployed at ${address}`);
  console.log(`Deployment block: ${receipt?.blockNumber ?? "unknown"}`);
  console.log(`Set NEXT_PUBLIC_CLEARDEAL_ESCROW_ADDRESS=${address}`);
  console.log(`Set NEXT_PUBLIC_CLEARDEAL_DEPLOYMENT_BLOCK=${receipt?.blockNumber ?? ""}`);
  console.log("Arc Testnet only. This contract is not professionally audited.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
