"use client";

import { useEffect, useState } from "react";
import { Plus, Check, AlertTriangle, Loader2 } from "lucide-react";

const ARC_TESTNET = {
  chainId: "0x4cef52",
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

type Status = "idle" | "adding" | "added" | "error";

export function AddNetworkButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setHasMetaMask(
      typeof window !== "undefined" && Boolean((window as any).ethereum),
    );
  }, []);

  if (!hasMetaMask) return null;

  const handleAdd = async () => {
    setStatus("adding");
    setErrorMessage(null);
    try {
      const ethereum = (window as any).ethereum;
      try {
        // Try to switch first
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ARC_TESTNET.chainId }],
        });
      } catch (switchError: any) {
        console.warn("wallet_switchEthereumChain failed, attempting wallet_addEthereumChain:", switchError);
        // Fallback: Always try to add/update the chain parameters if switch fails for any reason
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [ARC_TESTNET],
          });
        } catch (addError: any) {
          throw addError;
        }
      }
      setStatus("added");
    } catch (err: any) {
      console.error("Failed to configure Arc Testnet:", err);
      if (err.code === 4001) {
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMessage(err.message || "Failed to switch network.");
        // Reset back to idle after 4 seconds to allow retry
        setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 4000);
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

  return (
    <div className="flex flex-col items-start gap-1 relative">
      <button
        onClick={handleAdd}
        disabled={status === "adding"}
        className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-[13px] font-semibold transition-all disabled:opacity-60 ${
          status === "error"
            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100/50"
            : "border-gray-200 bg-white text-neutral-600 hover:border-[#0084FF] hover:text-[#0084FF] hover:bg-blue-50"
        }`}
        style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        type="button"
      >
        {status === "adding" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Adding...
          </>
        ) : status === "error" ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Network Conflict (Retry)
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" />
            Arc Testnet
          </>
        )}
      </button>
      {errorMessage && (
        <span className="absolute top-[38px] left-0 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 shadow-md z-50 whitespace-nowrap max-w-[280px] truncate">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
