import "dotenv/config";
import hre from "hardhat";
const ethers = hre.ethers;

const STREAM_PAYMENT = "0x685D00B7821416F99B21aF31c80D3d3856e072d9";
const STREAM_ABI = ["function stopStream(address) external"];

// Stablecoin Yield agent wallet còn active từ Round 2
const STUCK_AGENT = "0x3b6a8b1633d8ba4aeef87a0ddb4ea0e93bc8e88e";

async function main() {
  const [signer] = await ethers.getSigners();
  const stream = new ethers.Contract(STREAM_PAYMENT, STREAM_ABI, signer);
  console.log("🧹 Stopping stuck Stablecoin Yield stream...");
  const tx = await stream.stopStream(STUCK_AGENT);
  await tx.wait();
  console.log(`✅ Cleaned up: ${tx.hash}`);
}

main().catch(console.error);
