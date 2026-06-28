/**
 * ArcStream Activity Bot
 * Tự động tạo TXN thật trên StreamPayment contract
 * Chạy: npx hardhat run scripts/activity-bot.ts --network arcTestnet
 */
import "dotenv/config";
import hre from "hardhat";

const ethers = hre.ethers;

// ─── Config ───────────────────────────────────────────────────────────────
const STREAM_PAYMENT = "0x06161b24F05EB35dD76F7D6F0d0fCb1D91A0810f";
const USDC_ADDRESS   = "0x3600000000000000000000000000000000000000";

// Agent wallets từ stream-catalog (các provider thật)
const AGENTS = [
  { name: "Pulse Price Feed",       wallet: "0x211F3A615BAD89cCce98ba0E46aFd9Ed0786FdE5", pricePerSecond: 100n  },
  { name: "Market Sentiment",       wallet: "0x8f0c1014e7dcd26cebb15eb1c8e5640243171b3e", pricePerSecond: 200n  },
  { name: "Stablecoin Yield",       wallet: "0x3b6a8b1633d8ba4aeef87a0ddb4ea0e93bc8e88e", pricePerSecond: 150n  },
  { name: "Wallet Risk",            wallet: "0xfac1e2651f5f7ae29edb8261ee0dfdf498edcbbe", pricePerSecond: 300n  },
];

// Thời gian mỗi stream chạy (giây)
const STREAM_DURATION_SEC = 30;

// Số vòng lặp
const MAX_ROUNDS = 300; // 300 × 2 TXN = 600 TXN

// Deposit mỗi stream (0.01 USDC = 10_000 micro-USDC)
const DEPOSIT_AMOUNT = 10_000n; // 0.01 USDC

// ─── ABIs ─────────────────────────────────────────────────────────────────
const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

const STREAM_ABI = [
  "function startStream(address,uint256,uint256) external",
  "function stopStream(address) external",
  "function subscriptions(bytes32) view returns (address,address,uint256,uint256,uint256,bool)",
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const [signer] = await ethers.getSigners();
  const myAddress = await signer.getAddress();
  log(`🤖 Bot wallet: ${myAddress}`);

  const usdc   = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
  const stream = new ethers.Contract(STREAM_PAYMENT, STREAM_ABI, signer);

  // Check USDC balance
  const balance: bigint = await usdc.balanceOf(myAddress);
  log(`💰 USDC balance: ${ethers.formatUnits(balance, 6)} USDC`);

  if (balance < DEPOSIT_AMOUNT) {
    throw new Error(
      `❌ Not enough USDC. Need at least ${ethers.formatUnits(DEPOSIT_AMOUNT, 6)} USDC. ` +
      `Current: ${ethers.formatUnits(balance, 6)} USDC`
    );
  }

  log(`📋 Using ${AGENTS.length} hardcoded agents from stream catalog`);
  AGENTS.forEach((a, i) => log(`  ✅ Agent #${i}: ${a.name} @ ${ethers.formatUnits(a.pricePerSecond, 6)} USDC/s`));

  // Approve max USDC once
  const allowance: bigint = await usdc.allowance(myAddress, STREAM_PAYMENT);
  if (allowance < DEPOSIT_AMOUNT * BigInt(MAX_ROUNDS || 100)) {
    log("📝 Approving USDC for StreamPayment contract...");
    const approveTx = await usdc.approve(STREAM_PAYMENT, ethers.MaxUint256);
    await approveTx.wait();
    log(`✅ Approved: ${approveTx.hash}`);
  } else {
    log("✅ USDC already approved");
  }

  // ─── Bot Loop ─────────────────────────────────────────────────────────
  let round = 0;
  while (MAX_ROUNDS === 0 || round < MAX_ROUNDS) {
    round++;
    const agent = AGENTS[round % AGENTS.length];

    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    log(`🔄 Round ${round}${MAX_ROUNDS > 0 ? `/${MAX_ROUNDS}` : ""} — Agent: ${agent.name}`);

    try {
      // Check current balance
      const currentBalance: bigint = await usdc.balanceOf(myAddress);
      if (currentBalance < DEPOSIT_AMOUNT) {
        log(`⚠️  Low USDC balance (${ethers.formatUnits(currentBalance, 6)}), stopping bot`);
        break;
      }

      // PRE-CHECK: Stop existing stream if active (avoid "Already subscribed")
      try {
        const key = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address"],
            [myAddress, agent.wallet]
          )
        );
        const sub = await stream.subscriptions(key);
        if (sub[5] === true) { // isActive
          log(`⚠️  Found existing active stream to ${agent.name}, stopping it first...`);
          const cleanupTx = await stream.stopStream(agent.wallet);
          await cleanupTx.wait();
          log(`🧹 Cleaned up: ${cleanupTx.hash}`);
        }
      } catch {
        // No active subscription, continue
      }

      // START STREAM
      log(`▶️  Starting stream with ${ethers.formatUnits(DEPOSIT_AMOUNT, 6)} USDC deposit...`);
      const startTx = await stream.startStream(
        agent.wallet,
        agent.pricePerSecond,
        DEPOSIT_AMOUNT
      );
      await startTx.wait();
      log(`✅ StreamStarted TX: ${startTx.hash}`);
      log(`   https://testnet.arcscan.app/tx/${startTx.hash}`);

      // WAIT
      log(`⏳ Stream running for ${STREAM_DURATION_SEC} seconds...`);
      await sleep(STREAM_DURATION_SEC * 1000);

      // STOP STREAM
      log(`⏹️  Stopping stream...`);
      const stopTx = await stream.stopStream(agent.wallet);
      await stopTx.wait();
      log(`✅ StreamStopped TX: ${stopTx.hash}`);
      log(`   https://testnet.arcscan.app/tx/${stopTx.hash}`);

      // Balance after
      const afterBalance: bigint = await usdc.balanceOf(myAddress);
      const paid = currentBalance - afterBalance;
      log(`💸 Paid: ${ethers.formatUnits(paid, 6)} USDC | Remaining: ${ethers.formatUnits(afterBalance, 6)} USDC`);

    } catch (err: any) {
      log(`❌ Error in round ${round}: ${err.message?.slice(0, 200)}`);
      log("⏳ Waiting 10s before retry...");
      await sleep(10_000);
    }

    // Wait between rounds
    if (MAX_ROUNDS === 0 || round < MAX_ROUNDS) {
      log(`⏳ Waiting 30s before next round...`);
      await sleep(30_000);
    }
  }

  log(`\n🏁 Bot finished. Total rounds: ${round}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
