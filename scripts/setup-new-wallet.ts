/**
 * Generate and fund a fresh Arc Testnet deployer wallet.
 * Run: npx hardhat run scripts/setup-new-wallet.ts --network arcTestnet
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import hre from "hardhat";

const ethers = hre.ethers;
const USDC = "0x3600000000000000000000000000000000000000";
const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
];

async function main() {
  const [oldSigner] = await ethers.getSigners();
  const oldAddress = await oldSigner.getAddress();
  const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const newAddress = await newWallet.getAddress();

  writeFileSync(
    ".new-wallet.json",
    JSON.stringify({ address: newAddress, privateKey: newWallet.privateKey }, null, 2),
    { encoding: "utf8", mode: 0o600 },
  );
  console.log("New wallet address:", newAddress);
  console.log("Private key saved to the gitignored .new-wallet.json file.");

  const nativeBalance = await ethers.provider.getBalance(oldAddress);
  const usdc = new ethers.Contract(USDC, USDC_ABI, oldSigner);
  const usdcBalance: bigint = await usdc.balanceOf(oldAddress);
  const nativeToSend = ethers.parseUnits("10", 6);
  const usdcToSend = ethers.parseUnits("20", 6);

  if (nativeBalance < nativeToSend) {
    throw new Error(`Not enough native balance. Have: ${ethers.formatUnits(nativeBalance, 6)}`);
  }
  if (usdcBalance < usdcToSend) {
    throw new Error(`Not enough USDC. Have: ${ethers.formatUnits(usdcBalance, 6)}`);
  }

  const nativeTx = await oldSigner.sendTransaction({ to: newAddress, value: nativeToSend });
  await nativeTx.wait();
  console.log("Native transfer:", nativeTx.hash);

  const usdcTx = await usdc.transfer(newAddress, usdcToSend);
  await usdcTx.wait();
  console.log("USDC transfer:", usdcTx.hash);

  console.log("Funded native balance:", ethers.formatUnits(await ethers.provider.getBalance(newAddress), 6));
  console.log("Funded USDC balance:", ethers.formatUnits(await usdc.balanceOf(newAddress), 6));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Wallet setup failed");
  process.exitCode = 1;
});
