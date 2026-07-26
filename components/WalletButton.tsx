"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import { arcTestnet } from "@/config/chain";
import { GoogleWalletModal } from "@/components/GoogleWalletModal";
import { PasskeyRecoveryModal } from "@/components/PasskeyRecoveryModal";
import {
  isCirclePasskeyConfigured,
  isWalletConnectConfigured,
} from "@/config/wagmi";
import {
  isCircleGoogleWalletConfigured,
  startCircleGoogleLogin,
} from "@/lib/circle-google-client";

function shortAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function walletLabel(name: string) {
  if (name.toLowerCase().includes("create passkey")) return "Create passkey account";
  if (name.toLowerCase().includes("existing passkey")) return "Use existing passkey";
  if (name.toLowerCase().includes("walletconnect")) return "WalletConnect";
  if (name.toLowerCase().includes("injected")) return "Browser Wallet";
  return name;
}

export function WalletButton() {
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleWalletReady, setGoogleWalletReady] = useState(false);
  const [googleWalletAddress, setGoogleWalletAddress] = useState<
    `0x${string}` | undefined
  >();
  const [googleWalletModal, setGoogleWalletModal] = useState(false);
  const [googleWalletMessage, setGoogleWalletMessage] = useState<string>();
  const [recoveryMode, setRecoveryMode] = useState<
    "backup" | "recover" | undefined
  >();
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const maybeEthereum = (window as Window & { ethereum?: unknown }).ethereum;
    setHasInjectedWallet(Boolean(maybeEthereum));
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    let active = true;
    if (!isCircleGoogleWalletConfigured) return;

    void fetch("/api/wallets/google", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          authenticated?: boolean;
          wallets?: Array<{ address?: string }>;
        };
        if (active) {
          const address = data.wallets?.[0]?.address;
          const ready = Boolean(
            response.ok &&
              data.authenticated &&
              data.wallets?.length &&
              address?.startsWith("0x"),
          );
          setGoogleWalletReady(ready);
          setGoogleWalletAddress(
            ready ? (address as `0x${string}`) : undefined,
          );
        }
      })
      .catch(() => undefined);

    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google_wallet");
    if (googleStatus === "ready" || googleStatus === "error") {
      setGoogleWalletMessage(
        googleStatus === "error"
          ? params.get("google_wallet_message") ||
              "Google wallet setup failed."
          : undefined,
      );
      setGoogleWalletModal(true);
      params.delete("google_wallet");
      params.delete("google_wallet_message");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    }

    return () => {
      active = false;
    };
  }, []);

  function openMenu() {
    window.clearTimeout(closeTimer.current);
    setMenuMounted(true);
    setMenuClosing(false);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    setMenuClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setMenuMounted(false);
      setMenuClosing(false);
    }, 150);
  }

  async function handleGoogleWallet() {
    if (googleWalletReady) {
      closeMenu();
      setGoogleWalletModal(true);
      return;
    }

    setGoogleBusy(true);
    try {
      await startCircleGoogleLogin("/dashboard");
    } catch (cause) {
      setGoogleWalletMessage(
        cause instanceof Error ? cause.message : "Google sign-in failed.",
      );
      setGoogleWalletModal(true);
      setGoogleBusy(false);
    }
  }

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
    const passkeyWallet = connector?.id.startsWith("circle-passkey");

    return (
      <>
        <div className="flex items-center gap-2">
          {wrongNetwork && (
            <button
              className="h-11 whitespace-nowrap rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-[13px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
              disabled={isSwitching}
              onClick={() => switchChain({ chainId: arcTestnet.id })}
              type="button"
            >
              {isSwitching ? "Switching..." : "Switch to Arc"}
            </button>
          )}
          {passkeyWallet ? (
            <button
              aria-label="Back up passkey wallet"
              className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-3.5 text-[13px] font-semibold text-blue-800 transition-colors hover:bg-blue-100"
              onClick={() => setRecoveryMode("backup")}
              type="button"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Back up wallet</span>
            </button>
          ) : null}
          <button
            className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            onClick={() => disconnect()}
            type="button"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Account {shortAddress(address)}
          </button>
        </div>
        {recoveryMode ? (
          <PasskeyRecoveryModal
            connectedAddress={address}
            mode={recoveryMode}
            onClose={() => setRecoveryMode(undefined)}
          />
        ) : null}
      </>
    );
  }

  if (googleWalletReady && googleWalletAddress) {
    return (
      <>
        <button
          className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          onClick={() => setGoogleWalletModal(true)}
          type="button"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-black text-blue-600 shadow-sm">
            G
          </span>
          Google {shortAddress(googleWalletAddress)}
        </button>
        {googleWalletModal ? (
          <GoogleWalletModal
            onClose={() => setGoogleWalletModal(false)}
            onSignedOut={() => {
              setGoogleWalletReady(false);
              setGoogleWalletAddress(undefined);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={() => open ? closeMenu() : openMenu()}
        type="button"
      >
        <Wallet className="h-3.5 w-3.5" />
        {isPending ? "Signing in..." : "Sign in"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {menuMounted && (
        <div data-origin="top-right" className={`t-dropdown absolute right-0 top-[calc(100%+10px)] z-50 w-[22rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,.18)] ${open ? "is-open" : menuClosing ? "is-closing" : ""}`}>
          <div className="passkey-panel rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white">
            <div className="flex items-center gap-2 text-[15px] font-bold">
              <KeyRound className="h-4 w-4" />
              Sign in to ClearDeal
            </div>
            <p className="passkey-panel-copy mt-1.5 text-[12px] leading-relaxed text-blue-100">
              Use your device passkey. No seed phrase is required to start, and
              you can add a separate recovery phrase later.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px] font-semibold text-blue-50">
              <span className="passkey-panel-badge rounded-lg bg-white/10 px-1 py-1.5">User controlled</span>
              <span className="passkey-panel-badge rounded-lg bg-white/10 px-1 py-1.5">USDC native</span>
              <span className="passkey-panel-badge rounded-lg bg-white/10 px-1 py-1.5">Arc Testnet</span>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {isCircleGoogleWalletConfigured ? (
              <button
                className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-left text-[13px] font-semibold text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={googleBusy}
                onClick={handleGoogleWallet}
                type="button"
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white font-black text-blue-600 shadow-sm">
                    G
                  </span>
                  {googleWalletReady
                    ? "Google wallet ready"
                    : "Continue with Google"}
                </span>
                <span className="text-[11px] text-blue-600">
                  {googleBusy
                    ? "Opening…"
                    : googleWalletReady
                      ? "View"
                      : "Create wallet"}
                </span>
              </button>
            ) : null}

            {isCircleGoogleWalletConfigured ? (
              <div className="flex items-center gap-2 px-1 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                Or use a passkey
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            ) : null}

            {availableConnectors
              .filter((connector) => walletLabel(connector.name).includes("passkey"))
              .map((connector) => (
                <button
                  className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3.5 text-left text-[13px] font-semibold text-blue-900 transition-colors hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                  key={connector.uid}
                  onClick={() => {
                    closeMenu();
                    connect({ connector });
                  }}
                  type="button"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-blue-600 shadow-sm">
                      {walletLabel(connector.name).startsWith("Create") ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                    </span>
                    {walletLabel(connector.name)}
                  </span>
                  <span className="text-[11px] text-blue-500">Continue</span>
                </button>
              ))}

            {!isCirclePasskeyConfigured ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                <span className="font-bold">Passkey beta is code-complete but not enabled.</span>{" "}
                Add the Circle Modular Wallets client URL and client key to the deployment after allowing this domain in Circle Console.
              </div>
            ) : null}

            {isCirclePasskeyConfigured ? (
              <button
                className="flex min-h-11 w-full items-center justify-between rounded-xl px-3.5 text-left text-[12px] font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                onClick={() => {
                  closeMenu();
                  setRecoveryMode("recover");
                }}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Lost your passkey?
                </span>
                <span className="text-[11px] text-blue-500">Recover wallet</span>
              </button>
            ) : null}

            <div className="flex items-center gap-2 px-1 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Existing crypto wallet
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {availableConnectors
              .filter((connector) => {
                const label = walletLabel(connector.name);
                if (label.includes("passkey")) return false;
                return hasInjectedWallet || label !== "Browser Wallet";
              })
              .map((connector) => (
                <button
                  className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-left text-[13px] font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                  key={connector.uid}
                  onClick={() => {
                    closeMenu();
                    connect({ connector });
                  }}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    {walletLabel(connector.name) === "WalletConnect" ? <Smartphone className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                    {walletLabel(connector.name)}
                  </span>
                  <span className="text-[11px] text-slate-400">Connect</span>
                </button>
              ))}

            {!hasInjectedWallet && !isWalletConnectConfigured && (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600">
                  No browser wallet detected. Open ClearDeal in Chrome or Brave
                  with MetaMask installed.
                </div>
                <a
                  className="block rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                  href="https://metamask.io/download/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Install MetaMask
                </a>
              </>
            )}

            {!hasInjectedWallet && isWalletConnectConfigured ? <p className="px-2 pt-2 text-[11px] leading-5 text-slate-500">Use WalletConnect to scan with a mobile wallet. No browser extension is required.</p> : null}
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[12px] leading-relaxed text-red-400">
              {error.message}
            </p>
          )}
        </div>
      )}

      {recoveryMode ? (
        <PasskeyRecoveryModal
          mode={recoveryMode}
          onClose={() => setRecoveryMode(undefined)}
        />
      ) : null}
      {googleWalletModal ? (
        <GoogleWalletModal
          initialMessage={googleWalletMessage}
          onClose={() => {
            setGoogleWalletModal(false);
            setGoogleWalletMessage(undefined);
          }}
          onSignedOut={() => {
            setGoogleWalletReady(false);
            setGoogleWalletAddress(undefined);
          }}
        />
      ) : null}
    </div>
  );
}
