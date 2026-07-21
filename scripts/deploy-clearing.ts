import hre from "hardhat";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000";
  const clearing = await ethers.deployContract("ClearDealClearingHouse", [usdcAddress]);
  const deployment = await clearing.deploymentTransaction();
  await clearing.waitForDeployment();
  const address = await clearing.getAddress();
  const receipt = deployment ? await deployment.wait() : null;
  console.log(`ClearDealClearingHouse deployed at ${address}`);
  console.log(`Deployment transaction: ${deployment?.hash ?? "unavailable"}`);
  console.log(`Deployment block: ${receipt?.blockNumber ?? "unavailable"}`);
  console.log(`Set NEXT_PUBLIC_CLEARING_HOUSE_ADDRESS=${address}`);
  console.log(`Set NEXT_PUBLIC_CLEARING_DEPLOYMENT_BLOCK=${receipt?.blockNumber ?? ""}`);
  console.log("Warning: Arc Testnet only. The contract is not professionally audited.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
