"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  LoaderCircle,
  LogOut,
  X,
} from "lucide-react";

import { ArcFaucetButton } from "@/components/ArcFaucetButton";

type GoogleWallet = {
  id: string;
  address: string;
  blockchain: string;
  accountType?: string;
};

type GoogleWalletState = {
  authenticated: boolean;
  profile?: { email?: string; name?: string };
  wallets: GoogleWallet[];
};

export function GoogleWalletModal({
  initialMessage,
  onClose,
  onSignedOut,
}: {
  initialMessage?: string;
  onClose: () => void;
  onSignedOut?: () => void;
}) {
  const [state, setState] = useState<GoogleWalletState>();
  const [error, setError] = useState(initialMessage);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/wallets/google", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as GoogleWalletState & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Unable to load wallet.");
        }
        if (active) setState(data);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load wallet.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const wallet = state?.wallets?.[0];

  async function copyAddress() {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/wallets/google", { method: "DELETE" });
      onSignedOut?.();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
              Circle Google wallet
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Your Arc Testnet wallet
            </h2>
          </div>
          <button
            aria-label="Close Google wallet"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {!state && !error ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
              Loading your wallet…
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] leading-5 text-red-700">
              {error}
            </div>
          ) : null}

          {wallet ? (
            <>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-[13px] font-bold text-blue-950">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white font-black text-blue-600 shadow-sm">
                    G
                  </span>
                  {state?.profile?.name || "Google account"}
                </div>
                {state?.profile?.email ? (
                  <p className="mt-2 text-[12px] text-blue-700">
                    {state.profile.email}
                  </p>
                ) : null}
                <div className="mt-4 rounded-xl bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Wallet address
                  </p>
                  <p className="mt-1 break-all font-mono text-[12px] font-semibold text-slate-800">
                    {wallet.address}
                  </p>
                  <button
                    className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold text-blue-700"
                    onClick={copyAddress}
                    type="button"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy address"}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-white/70 p-2.5">
                    <span className="text-blue-500">Network</span>
                    <p className="mt-0.5 font-bold text-blue-950">Arc Testnet</p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-2.5">
                    <span className="text-blue-500">Control</span>
                    <p className="mt-0.5 font-bold text-blue-950">User owned</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">
                This wallet is ready for ClearDeal. You can sign project notes,
                approve contract actions, and pay USDC after confirming each
                request in Circle.
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                <p className="mb-2 text-[11px] leading-5 text-blue-900">
                  Arc uses the same test USDC balance for payments and network
                  fees. Test tokens have no real-world value.
                </p>
                <ArcFaucetButton address={wallet.address} />
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                  href={`https://testnet.arcscan.app/address/${wallet.address}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on ArcScan
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  disabled={busy}
                  onClick={signOut}
                  type="button"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
