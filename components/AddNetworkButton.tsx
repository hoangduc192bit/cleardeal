"use client";

import { useEffect, useState } from "react";
import { Plus, Check, AlertTriangle, Loader2 } from "lucide-react";

const ARC_TESTNET = {
  chainId: "0x4CEF52",
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

type Status = "idle" | "adding" | "added" | "error";

export function AddNetworkButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [hasMetaMask, setHasMetaMask] = useState(false);

  useEffect(() => {
    setHasMetaMask(
      typeof window !== "undefined" && Boolean((window as any).ethereum),
    );
  }, []);

  if (!hasMetaMask) return null;

  const handleAdd = async () => {
    setStatus("adding");
    try {
      const ethereum = (window as any).ethereum;
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ARC_TESTNET.chainId }],
        });
      } catch (switchError: any) {
        if (switchError.code !== 4902) throw switchError;
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [ARC_TESTNET],
        });
      }
      setStatus("added");
    } catch (err: any) {
      if (err.code === 4001) {
        setStatus("idle");
      } else {
        setStatus("error");
      }
    }
  };

  if (status === "added") {
    return (
      <div
        className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-[13px] font-semibold"
        style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
      >
        <Check className="w-3.5 h-3.5" />
        Arc Testnet added
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex items-center gap-1.5 max-w-[240px] h-9 px-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-medium"
        style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
      >
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        Remove old Arc Testnet, then retry
      </div>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={status === "adding"}
      className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-gray-200 bg-white text-neutral-600 text-[13px] font-semibold hover:border-[#0084FF] hover:text-[#0084FF] hover:bg-blue-50 transition-all disabled:opacity-60"
      style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
    >
      {status === "adding" ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5" />
          Arc Testnet
        </>
      )}
    </button>
  );
}
