import hre from "hardhat";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  const usdc = process.env.USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000";
  const factory = await ethers.getContractFactory("ClearDealClearingHouse");
  const transaction = await factory.getDeployTransaction(usdc);
  const gas = await ethers.provider.estimateGas({ ...transaction, from: deployer.address });
  const fee = await ethers.provider.getFeeData();
  const gasPrice = fee.maxFeePerGas ?? fee.gasPrice ?? 0n;
  console.log(`From: ${deployer.address}`);
  console.log("Action: deploy ClearDealClearingHouse");
  console.log("Chain: Arc Testnet (5042002)");
  console.log(`Constructor USDC: ${usdc}`);
  console.log(`Estimated gas: ${gas.toString()}`);
  console.log(`Estimated maximum fee: ${ethers.formatUnits(gas * gasPrice, 18)} USDC`);
  console.log("Warning: custom unaudited Testnet contract deployment; bytecode cannot be changed after deployment.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
