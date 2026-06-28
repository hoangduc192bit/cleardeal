"use client";

import { useWriteContract } from "wagmi";
import { useChainId, useSwitchChain } from "wagmi";

import { arcTestnet } from "@/config/chain";
import { erc20Abi, streamPaymentAbi, streamPaymentAddress, usdcAddress } from "@/lib/contracts";

export function getTransactionErrorMessage(error: Error | null) {
  if (!error) return undefined;

  const message = error.message.toLowerCase();
  if (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("rejected the request")
  ) {
    return "Bạn đã từ chối giao dịch trong MetaMask. Nhấn Approve USDC và chọn Confirm để tiếp tục.";
  }
  if (message.includes("insufficient funds")) {
    return "Ví không đủ Arc Testnet USDC để trả số tiền giao dịch và phí gas.";
  }
  if (message.includes("chain") || message.includes("network")) {
    return "Hãy chuyển MetaMask sang Arc Testnet rồi thử lại.";
  }

  return "Giao dịch thất bại. Kiểm tra MetaMask, mạng Arc Testnet và số dư USDC rồi thử lại.";
}

export function useStreamPayment() {
  const writer = useWriteContract();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const ensureArcTestnet = () => {
    if (chainId === arcTestnet.id) return true;
    switchChain({ chainId: arcTestnet.id });
    return false;
  };

  return {
    ...writer,
    approve: (amount: bigint) => {
      if (!ensureArcTestnet()) return;
      writer.writeContract({ address: usdcAddress, abi: erc20Abi, functionName: "approve", args: [streamPaymentAddress, amount] });
    },
    start: (agent: `0x${string}`, price: bigint, deposit: bigint) => {
      if (!ensureArcTestnet()) return;
      writer.writeContract({ address: streamPaymentAddress, abi: streamPaymentAbi, functionName: "startStream", args: [agent, price, deposit] });
    },
    stop: (agent: `0x${string}`) => {
      if (!ensureArcTestnet()) return;
      writer.writeContract({ address: streamPaymentAddress, abi: streamPaymentAbi, functionName: "stopStream", args: [agent] });
    },
  };
}
