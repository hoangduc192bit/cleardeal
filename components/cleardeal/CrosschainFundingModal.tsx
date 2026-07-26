"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  LoaderCircle,
  Network,
  Repeat2,
  X,
} from "lucide-react";
import type { BridgeResult } from "@circle-fin/app-kit";
import type { CreateViemAdapterFromProviderParams } from "@circle-fin/adapter-viem-v2";
import { baseSepolia, sepolia } from "viem/chains";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

interface CrosschainFundingModalProps {
  open: boolean;
  defaultAmount: string;
  onClose: () => void;
}

const SOURCES = {
  Base_Sepolia: {
    label: "Base Sepolia",
    chainId: baseSepolia.id,
  },
  Ethereum_Sepolia: {
    label: "Ethereum Sepolia",
    chainId: sepolia.id,
  },
} as const;

type SourceChain = keyof typeof SOURCES;
type Mode = "bridge" | "swap";

function readableError(cause: unknown) {
  if (!(cause instanceof Error)) return "The bridge could not be completed.";
  if (/reject|denied|cancel/i.test(cause.message)) {
    return "The wallet request was cancelled.";
  }
  return cause.message;
}

export function CrosschainFundingModal({
  open,
  defaultAmount,
  onClose,
}: CrosschainFundingModalProps) {
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [mode, setMode] = useState<Mode>("bridge");
  const [source, setSource] = useState<SourceChain>("Base_Sepolia");
  const [amount, setAmount] = useState(defaultAmount);
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BridgeResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setAmount(defaultAmount);
    setConfirmed(false);
    setResult(undefined);
    setError(undefined);
    setMode("bridge");
  }, [defaultAmount, open]);

  const sourceConfig = SOURCES[source];
  const parsedAmount = Number(amount);
  const validAmount =
    /^\d+(\.\d{1,6})?$/.test(amount) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0;
  const passkeyWallet = connector?.id.startsWith("circle-passkey");
  const failedStep = result?.steps.find((step) => step.state === "error");
  const completedSteps = useMemo(
    () => result?.steps.filter((step) => step.state === "success") ?? [],
    [result],
  );

  async function bridge() {
    if (!isConnected || !address || !connector) {
      setError("Connect a browser wallet before bridging.");
      return;
    }
    if (passkeyWallet) {
      setError(
        "This bridge preview currently supports Browser Wallet or WalletConnect. Circle passkey accounts stay on Arc Testnet.",
      );
      return;
    }
    if (!validAmount || !confirmed) {
      setError("Enter a valid amount and confirm the route.");
      return;
    }

    setRunning(true);
    setResult(undefined);
    setError(undefined);
    try {
      if (chainId !== sourceConfig.chainId) {
        await switchChainAsync({ chainId: sourceConfig.chainId });
      }
      const provider =
        (await connector.getProvider()) as CreateViemAdapterFromProviderParams["provider"];
      const [{ AppKit }, { createViemAdapterFromProvider }] = await Promise.all([
        import("@circle-fin/app-kit"),
        import("@circle-fin/adapter-viem-v2"),
      ]);
      const adapter = await createViemAdapterFromProvider({ provider });
      const kit = new AppKit();
      const bridgeResult = await kit.bridge({
        from: { adapter, chain: source },
        to: {
          chain: "Arc_Testnet",
          recipientAddress: address,
          useForwarder: true,
        },
        amount,
        token: "USDC",
      });
      setResult(bridgeResult);
      if (bridgeResult.state === "error") {
        const step = bridgeResult.steps.find((item) => item.state === "error");
        setError(
          step?.errorMessage ??
            "The transfer stopped partway through. Do not start a second bridge with the same funds.",
        );
      }
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setRunning(false);
    }
  }

  async function retryBridge() {
    if (!result || result.state !== "error" || !connector) return;

    setRunning(true);
    setError(undefined);
    try {
      if (chainId !== sourceConfig.chainId) {
        await switchChainAsync({ chainId: sourceConfig.chainId });
      }
      const provider =
        (await connector.getProvider()) as CreateViemAdapterFromProviderParams["provider"];
      const [{ AppKit }, { createViemAdapterFromProvider }] = await Promise.all([
        import("@circle-fin/app-kit"),
        import("@circle-fin/adapter-viem-v2"),
      ]);
      const adapter = await createViemAdapterFromProvider({ provider });
      const kit = new AppKit();
      const retryResult = await kit.retryBridge(result, { from: adapter });
      setResult(retryResult);
      if (retryResult.state === "error") {
        const step = retryResult.steps.find((item) => item.state === "error");
        setError(step?.errorMessage ?? "The bridge still needs attention. Use Resume transfer again instead of starting a new bridge.");
      }
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setRunning(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Bring USDC to Arc"
    >
      <section className="max-h-[92dvh] w-full max-w-[680px] overflow-y-auto border border-[#ded5c6] bg-[#fffcf0] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#ded5c6] p-6">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#a66c00]">
              Fund from another network
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">
              Bring testnet USDC to Arc.
            </h2>
            <p className="mt-2 max-w-[520px] text-[11px] leading-5 text-[#766b5d]">
              Move testnet USDC from Base Sepolia or Ethereum Sepolia. The
              destination is your same wallet on Arc Testnet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="grid h-10 w-10 place-items-center border border-[#ded5c6] disabled:opacity-40"
            aria-label="Close crosschain funding"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 border-b border-[#ded5c6]">
          <button
            type="button"
            onClick={() => setMode("bridge")}
            className={`min-h-12 text-[12px] font-semibold ${
              mode === "bridge" ? "bg-[#fff0bf] text-[#8c5a00]" : "text-[#766b5d]"
            }`}
          >
            Bridge USDC
          </button>
          <button
            type="button"
            onClick={() => setMode("swap")}
            className={`min-h-12 border-l border-[#ded5c6] text-[12px] font-semibold ${
              mode === "swap" ? "bg-[#fff0bf] text-[#8c5a00]" : "text-[#766b5d]"
            }`}
          >
            Swap token
          </button>
        </div>

        {mode === "bridge" ? (
          <div className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
                  From
                </span>
                <select
                  value={source}
                  onChange={(event) => {
                    setSource(event.target.value as SourceChain);
                    setConfirmed(false);
                    setResult(undefined);
                    setError(undefined);
                  }}
                  disabled={running}
                  className="h-12 border border-[#cfc4b3] bg-white px-3 text-[13px]"
                >
                  <option value="Base_Sepolia">Base Sepolia</option>
                  <option value="Ethereum_Sepolia">Ethereum Sepolia</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
                  Amount
                </span>
                <div className="flex h-12 border border-[#cfc4b3] bg-white">
                  <input
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setConfirmed(false);
                      setResult(undefined);
                      setError(undefined);
                    }}
                    disabled={running}
                    inputMode="decimal"
                    className="min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none"
                    aria-label="USDC bridge amount"
                  />
                  <span className="grid place-items-center px-3 font-mono text-[10px] text-[#766b5d]">
                    USDC
                  </span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border border-[#ded5c6] bg-white p-4 text-center">
              <div>
                <Network className="mx-auto h-5 w-5 text-[#a66c00]" />
                <p className="mt-2 text-[12px] font-semibold">{sourceConfig.label}</p>
                <p className="mt-1 font-mono text-[9px] text-[#766b5d]">Testnet USDC</p>
              </div>
              <ArrowRight className="h-5 w-5 text-[#a66c00]" />
              <div>
                <Network className="mx-auto h-5 w-5 text-emerald-600" />
                <p className="mt-2 text-[12px] font-semibold">Arc Testnet</p>
                <p className="mt-1 font-mono text-[9px] text-[#766b5d]">Same wallet</p>
              </div>
            </div>

            {parsedAmount > 100 ? (
              <p className="border border-amber-300 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">
                This is a large test amount. Testnet USDC has no real-world
                value, but start with a small transfer when testing a new wallet.
              </p>
            ) : null}

            <label className="flex items-start gap-3 border border-[#ded5c6] p-4 text-[11px] leading-5">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={running}
                className="mt-1"
              />
              <span>
                I confirm the source is <strong>{sourceConfig.label}</strong>,
                the token is <strong>testnet USDC</strong>, the amount is{" "}
                <strong>{validAmount ? amount : "not valid"}</strong>, and the
                destination is my connected wallet on Arc Testnet.
              </span>
            </label>

            {passkeyWallet ? (
              <p className="border border-blue-200 bg-blue-50 p-3 text-[10px] leading-5 text-blue-900">
                Circle passkey accounts in this app are Arc-only. Reconnect with
                Browser Wallet or WalletConnect to sign on the source testnet.
              </p>
            ) : null}

            {running ? (
              <div className="flex items-start gap-3 border border-[#e1c27e] bg-[#fff5d9] p-4">
                <LoaderCircle className="mt-0.5 h-4 w-4 animate-spin text-[#a66c00]" />
                <div>
                  <p className="text-[12px] font-semibold">Bridge in progress</p>
                  <p className="mt-1 text-[10px] leading-5 text-[#766b5d]">
                    Confirm the wallet requests, then keep this window open while
                    Circle moves USDC to Arc.
                  </p>
                </div>
              </div>
            ) : null}

            {result ? (
              <div className="border border-[#ded5c6] bg-white">
                <div className="flex items-center justify-between border-b border-[#ded5c6] px-4 py-3">
                  <p className="text-[12px] font-semibold">
                    {result.state === "success" ? "USDC arrived on Arc" : "Bridge record"}
                  </p>
                  <span
                    className={`font-mono text-[9px] uppercase ${
                      result.state === "success" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {result.state}
                  </span>
                </div>
                <div className="divide-y divide-[#ded5c6]">
                  {result.steps.map((step) => (
                    <div key={step.name} className="flex items-center gap-3 px-4 py-3">
                      {step.state === "success" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <X className="h-4 w-4 text-rose-600" />
                      )}
                      <span className="min-w-0 flex-1 text-[11px]">{step.name}</span>
                      {step.explorerUrl ? (
                        <a
                          href={step.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1f5ed3]"
                          aria-label={`View ${step.name} transaction`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="border border-rose-200 bg-rose-50 p-3 text-[10px] leading-5 text-rose-800">
                {error}
                {failedStep || completedSteps.length ? (
                  <span className="mt-1 block">
                    Keep the transaction links above. Do not start a second
                    bridge with the same funds after a partial transfer.
                  </span>
                ) : null}
              </p>
            ) : null}

            {result?.state === "error" ? (
              <button
                type="button"
                onClick={() => void retryBridge()}
                disabled={running || passkeyWallet}
                className="min-h-12 w-full bg-[#1f5ed3] px-5 text-[12px] font-semibold text-white hover:bg-[#184cad] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {running ? "Resuming transfer..." : "Resume transfer safely"}
              </button>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void bridge()}
                disabled={
                  running ||
                  !isConnected ||
                  !validAmount ||
                  !confirmed ||
                  passkeyWallet ||
                  result?.state === "error"
                }
                className="min-h-12 flex-1 bg-[#d58b00] px-5 text-[12px] font-semibold text-white hover:bg-[#bd7b00] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {running
                  ? "Bridging..."
                  : `Bridge ${validAmount ? amount : "USDC"} to Arc`}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={running}
                className="min-h-12 border border-[#766b5d] px-5 text-[12px] font-semibold disabled:opacity-45"
              >
                {result?.state === "success" ? "Done — deposit from Arc" : "Cancel"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="border border-[#ded5c6] bg-white p-5">
              <Repeat2 className="h-7 w-7 text-[#a66c00]" />
              <h3 className="mt-4 font-serif text-2xl font-semibold">
                Testnet swap is limited.
              </h3>
              <p className="mt-3 text-[11px] leading-6 text-[#574c40]">
                Circle App Kit does not support token swaps on Base Sepolia or
                Ethereum Sepolia. ClearDeal will not pretend to convert test ETH
                or test tokens there.
              </p>
              <div className="mt-5 grid gap-3 text-[11px] sm:grid-cols-2">
                <div className="border border-emerald-200 bg-emerald-50 p-4">
                  <strong className="block text-emerald-900">Available now</strong>
                  <span className="mt-2 block leading-5 text-emerald-800">
                    Bridge existing USDC from Base Sepolia or Ethereum Sepolia
                    into Arc Testnet.
                  </span>
                </div>
                <div className="border border-amber-200 bg-amber-50 p-4">
                  <strong className="block text-amber-900">Not available</strong>
                  <span className="mt-2 block leading-5 text-amber-800">
                    Swap test ETH, USDT, or another token into USDC on those two
                    source testnets.
                  </span>
                </div>
              </div>
              <p className="mt-5 text-[10px] leading-5 text-[#766b5d]">
                Arc Testnet itself supports a small set of testnet swaps, but
                that does not convert assets held on Base Sepolia or Ethereum
                Sepolia. For this project, use the Circle faucet or source-chain
                testnet USDC and then bridge it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMode("bridge")}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#d58b00] px-5 text-[12px] font-semibold text-white"
            >
              Use USDC bridge instead <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
