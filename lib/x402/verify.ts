import { type Address, type Hash, parseUnits, parseAbiItem, decodeEventLog } from "viem";
import { publicClient, usdcAddress } from "../contracts";
import { hasUsedX402Tx, markX402TxUsed } from "./replay-store";

const txHashPattern = /^0x[a-fA-F0-9]{64}$/;
const minConfirmations = Number(process.env.X402_MIN_CONFIRMATIONS ?? "1");

export async function verifyTransactionOnChain(
  txHash: string,
  expectedAmountStr: string,
  expectedReceiver: Address
): Promise<boolean> {
  if (!txHashPattern.test(txHash)) {
    console.error("x402: Invalid transaction hash format");
    return false;
  }

  const hash = txHash as Hash;

  if (await hasUsedX402Tx(hash)) {
    console.error("x402: TxHash already used for a payment", txHash);
    return false;
  }

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash });

    if (receipt.status !== "success") {
      console.error("x402: Transaction failed on chain", txHash);
      return false;
    }

    const latestBlock = await publicClient.getBlockNumber();
    const confirmations = latestBlock - receipt.blockNumber + 1n;
    if (confirmations < BigInt(minConfirmations)) {
      console.error("x402: Transaction does not have enough confirmations", txHash);
      return false;
    }

    const expectedAmount = parseUnits(expectedAmountStr, 6);

    const transferEventAbi = parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    );

    let foundValidTransfer = false;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== usdcAddress.toLowerCase()) continue;

      try {
        const decoded = decodeEventLog({
          abi: [transferEventAbi],
          data: log.data,
          topics: log.topics,
          strict: false,
        });

        if (decoded.eventName === "Transfer") {
          const to = decoded.args.to as Address;
          const value = decoded.args.value as bigint;

          if (to.toLowerCase() === expectedReceiver.toLowerCase() && value === expectedAmount) {
            foundValidTransfer = true;
            break;
          }
        }
      } catch (e) {
        // Ignore parsing errors for unrelated logs.
      }
    }

    if (foundValidTransfer) {
      await markX402TxUsed(hash);
      return true;
    }

    console.error("x402: Valid USDC transfer not found in tx", txHash);
    return false;
  } catch (error) {
    console.error("x402: Failed to verify transaction", error);
    return false;
  }
}
