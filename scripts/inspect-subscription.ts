import "dotenv/config";

import hre from "hardhat";

const ethers = hre.ethers;

const USER = "0x2D89ad0ac2f54AD612e69712F989D36f8AC99bA2";
const AGENT = "0x211F3A615BAD89cCce98ba0E46aFd9Ed0786FdE5";
const STREAM_PAYMENT = "0x685D00B7821416F99B21aF31c80D3d3856e072d9";
const USDC = "0x3600000000000000000000000000000000000000";

async function main() {
  const usdc = await ethers.getContractAt(
    ["function allowance(address,address) view returns (uint256)", "function balanceOf(address) view returns (uint256)"],
    USDC,
  );
  const stream = await ethers.getContractAt(
    [
      "function subscriptions(bytes32) view returns (address subscriber,address agentWallet,uint256 pricePerSecond,uint256 startTime,uint256 depositAmount,bool isActive)",
      "function getRemainingBalance(address,address) view returns (uint256)",
    ],
    STREAM_PAYMENT,
  );
  const key = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address", "address"], [USER, AGENT]));
  const [allowance, balance, subscription, remaining, nonce] = await Promise.all([
    usdc.allowance(USER, STREAM_PAYMENT),
    usdc.balanceOf(USER),
    stream.subscriptions(key),
    stream.getRemainingBalance(USER, AGENT),
    ethers.provider.getTransactionCount(USER),
  ]);

  console.log(`User nonce: ${nonce}`);
  console.log(`USDC balance: ${ethers.formatUnits(balance, 6)}`);
  console.log(`Allowance: ${ethers.formatUnits(allowance, 6)}`);
  console.log(`Subscription active: ${subscription.isActive}`);
  console.log(`Deposit: ${ethers.formatUnits(subscription.depositAmount, 6)}`);
  console.log(`Remaining: ${ethers.formatUnits(remaining, 6)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
