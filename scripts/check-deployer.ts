import "dotenv/config";

import hre from "hardhat";

const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(address);
  const network = await ethers.provider.getNetwork();

  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Deployer address: ${address}`);
  console.log(`Native gas balance: ${ethers.formatEther(balance)} USDC`);

  if (balance === 0n) {
    throw new Error("Burner deployer has no Arc Testnet USDC for gas");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
