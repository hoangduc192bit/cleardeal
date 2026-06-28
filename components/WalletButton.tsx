"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import { arcTestnet } from "@/config/chain";
import { isWalletConnectConfigured } from "@/config/wagmi";

function shortAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function walletLabel(name: string) {
  if (name.toLowerCase().includes("walletconnect")) return "WalletConnect";
  if (name.toLowerCase().includes("injected")) return "Browser Wallet";
  return name;
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);

  useEffect(() => {
    const maybeEthereum = (window as Window & { ethereum?: unknown }).ethereum;
    setHasInjectedWallet(Boolean(maybeEthereum));
  }, []);

  const availableConnectors = useMemo(
    () =>
      connectors.filter((connector, index, list) => {
        const label = walletLabel(connector.name);
        return (
          list.findIndex((item) => walletLabel(item.name) === label) === index
        );
      }),
    [connectors],
  );

  if (isConnected && address) {
    const wrongNetwork = chainId !== arcTestnet.id;

    return (
      <div className="flex items-center gap-2">
        {wrongNetwork && (
          <button
            className="h-9 rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-[13px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: arcTestnet.id })}
            type="button"
          >
            {isSwitching ? "Switching..." : "Switch to Arc"}
          </button>
        )}
        <button
          className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          onClick={() => disconnect()}
          type="button"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {shortAddress(address)}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex h-9 items-center gap-1.5 rounded-xl bg-[#0084FF] px-4 text-[13px] font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-[#006EE6] hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Wallet className="h-3.5 w-3.5" />
        {isPending ? "Connecting..." : "Connect Wallet"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl shadow-black/10">
          <div className="px-2 pb-3">
            <div className="text-[14px] font-bold text-neutral-900">
              Choose wallet
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
              Use MetaMask or another injected browser wallet on Arc Testnet.
            </p>
          </div>

          <div className="space-y-1.5">
            {hasInjectedWallet &&
              availableConnectors.map((connector) => (
                <button
                  className="flex min-h-11 w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3.5 text-left text-[13px] font-semibold text-neutral-800 transition-all hover:border-blue-100 hover:bg-blue-50 hover:text-[#0084FF] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                  key={connector.uid}
                  onClick={() => {
                    setOpen(false);
                    connect({ connector });
                  }}
                  type="button"
                >
                  <span>{walletLabel(connector.name)}</span>
                  <span className="text-[11px] text-neutral-400">Connect</span>
                </button>
              ))}

            {!hasInjectedWallet && (
              <>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[12px] leading-relaxed text-blue-700">
                  No browser wallet detected. Open ArcStream in Chrome or Brave
                  with MetaMask installed.
                </div>
                <a
                  className="block rounded-xl border border-gray-100 bg-gray-50 p-3 text-[13px] font-semibold text-[#0084FF] transition-all hover:border-blue-100 hover:bg-blue-50"
                  href="https://metamask.io/download/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Install MetaMask
                </a>
              </>
            )}

            {!isWalletConnectConfigured && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-700">
                WalletConnect QR is not enabled in this build. Set a real
                NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID before adding mobile QR.
              </div>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-[12px] leading-relaxed text-red-600">
              {error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
