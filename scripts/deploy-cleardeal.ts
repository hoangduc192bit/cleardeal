import hre from "hardhat";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000";
  const escrow = await ethers.deployContract("ClearDealEscrow", [usdcAddress]);
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  console.log(`ClearDealEscrow deployed at ${address}`);
  console.log(`Set NEXT_PUBLIC_CLEARDEAL_ESCROW_ADDRESS=${address}`);
  console.log("Warning: Arc Testnet only. The contract is not professionally audited.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
