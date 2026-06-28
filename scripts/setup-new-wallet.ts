/**
 * Generate a fresh deployer wallet and transfer funds from old wallet
 * Run: npx hardhat run scripts/setup-new-wallet.ts --network arcTestnet
 */
import "dotenv/config";
import hre from "hardhat";
import { writeFileSync } from "fs";
const ethers = hre.ethers;

const USDC = "0x3600000000000000000000000000000000000000";
const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
];

async function main() {
  const [oldSigner] = await ethers.getSigners();
  const oldAddr = await oldSigner.getAddress();

  // 1. Generate new wallet
  const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const newAddr = await newWallet.getAddress();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🆕 New wallet address:", newAddr);
  console.log("🔑 New private key:   ", newWallet.privateKey);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Save to file
  writeFileSync(".new-wallet.json", JSON.stringify({
    address: newAddr,
    privateKey: newWallet.privateKey,
  }, null, 2));
  console.log("💾 Saved to .new-wallet.json");

  // 2. Check old wallet balances
  const nativeBalance = await ethers.provider.getBalance(oldAddr);
  const usdc = new ethers.Contract(USDC, USDC_ABI, oldSigner);
  const usdcBalance: bigint = await usdc.balanceOf(oldAddr);

  console.log(`\n📊 Old wallet (${oldAddr}):`);
  console.log(`   Native: ${ethers.formatUnits(nativeBalance, 6)} USDC`);
  console.log(`   USDC:   ${ethers.formatUnits(usdcBalance, 6)} USDC`);

  // 3. Transfer native gas (send 10 native tokens for gas)
  const nativeToSend = ethers.parseUnits("10", 6); // 10 native
  if (nativeBalance < nativeToSend) {
    throw new Error(`Not enough native balance. Have: ${ethers.formatUnits(nativeBalance, 6)}`);
  }

  console.log(`\n📤 Transferring 10 native tokens to new wallet...`);
  const nativeTx = await oldSigner.sendTransaction({
    to: newAddr,
    value: nativeToSend,
  });
  await nativeTx.wait();
  console.log(`✅ Native transfer: ${nativeTx.hash}`);

  // 4. Transfer USDC (send 20 USDC for streaming)
  const usdcToSend = ethers.parseUnits("20", 6); // 20 USDC
  if (usdcBalance < usdcToSend) {
    throw new Error(`Not enough USDC. Have: ${ethers.formatUnits(usdcBalance, 6)}`);
  }

  console.log(`📤 Transferring 20 USDC to new wallet...`);
  const usdcTx = await usdc.transfer(newAddr, usdcToSend);
  await usdcTx.wait();
  console.log(`✅ USDC transfer: ${usdcTx.hash}`);

  // 5. Verify new wallet received funds
  const newNative = await ethers.provider.getBalance(newAddr);
  const newUsdc: bigint = await usdc.balanceOf(newAddr);
  console.log(`\n✅ New wallet funded:`);
  console.log(`   Native: ${ethers.formatUnits(newNative, 6)}`);
  console.log(`   USDC:   ${ethers.formatUnits(newUsdc, 6)}`);
  console.log(`\n⚠️  Next step: copy the private key above into .env as DEPLOYER_PRIVATE_KEY`);
}

main().catch(console.error);
