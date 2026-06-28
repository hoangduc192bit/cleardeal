"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { Check, Loader2, Unlock } from "lucide-react";

import { arcTestnet } from "@/config/chain";
import { erc20Abi, usdcAddress } from "@/lib/contracts";
import { getPaidStreamConfig } from "@/lib/x402/paid-streams";
import type {
  X402DemoState,
  X402PaymentRequired,
  X402UnlockedResponse,
} from "@/lib/x402/types";

const lifecycle: { state: X402DemoState; label: string }[] = [
  { state: "requesting",                label: "AI Agent calls API" },
  { state: "payment_required",          label: "API returns 402 Payment Required" },
  { state: "payment_authorized_onchain",label: "Agent transfers USDC on Arc Testnet" },
  { state: "verifying",                 label: "Server verifies on-chain payment" },
  { state: "unlocked",                  label: "Data unlocks and report is generated" },
];

const stateOrder: X402DemoState[] = [
  "idle", "requesting", "payment_required",
  "payment_authorized_onchain", "verifying", "unlocked",
];

export function X402PayPerCallPanel({
  streamId = "pulse-price-feed",
  agentName = "Pulse Price Feed",
}: {
  streamId?: string;
  agentName?: string;
}) {
  const [state, setState] = useState<X402DemoState>("idle");
  const [paymentRequired, setPaymentRequired] = useState<X402PaymentRequired>();
  const [unlocked, setUnlocked] = useState<X402UnlockedResponse>();
  const [error, setError] = useState<string>();
  const [lastRequest, setLastRequest] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  const [agentPaying, setAgentPaying] = useState(false);
  const [agentPaymentId, setAgentPaymentId] = useState<string>();

  const config = getPaidStreamConfig(streamId);
  const { price, endpoint, wallet } = config;

  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (writeError) { setError(writeError.message); setState("failed"); }
  }, [writeError]);

  useEffect(() => {
    if (hash) setTxHash(hash);
  }, [hash]);

  useEffect(() => {
    if (isConfirmed && hash) unlockData(hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash]);

  async function requestWithoutPayment() {
    setState("requesting");
    setError(undefined);
    setTxHash(undefined);
    setLastRequest(new Date().toLocaleTimeString());
    try {
      const response = await fetch(endpoint);
      const body = (await response.json()) as X402PaymentRequired;
      if (response.status !== 402) throw new Error("Expected a 402 response");
      setPaymentRequired(body);
      setState("payment_required");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed");
      setState("failed");
    }
  }

  function authorizeRealPayment() {
    if (!address) {
      setError("Please connect your wallet first via the navigation bar.");
      return;
    }
    if (chainId !== arcTestnet.id) {
      setError("Switch your wallet to Arc Testnet, then click Pay USDC & Unlock Data again.");
      switchChain({ chainId: arcTestnet.id });
      return;
    }
    setState("payment_authorized_onchain");
    setError(undefined);
    writeContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [wallet, parseUnits(price, 6)],
    });
  }

  async function unlockData(hashToVerify: string) {
    setState("verifying");
    setError(undefined);
    try {
      const response = await fetch(endpoint, {
        headers: { "x-arcstream-payment-tx": hashToVerify },
      });
      if (!response.ok) throw new Error("On-chain verification failed or tx not found");
      setUnlocked((await response.json()) as X402UnlockedResponse);
      setState("unlocked");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unlock failed");
      setState("failed");
    }
  }

  async function payWithCircleAgent() {
    setAgentPaying(true);
    setState("payment_authorized_onchain");
    setError(undefined);
    try {
      const response = await fetch("/api/agent/x402-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error((body as { message?: string; error?: string }).message ?? "Circle agent payment failed");
      }
      const result = body as {
        payment: { id: string; txHash: string };
        unlocked: X402UnlockedResponse;
      };
      setAgentPaymentId(result.payment.id);
      setTxHash(result.payment.txHash);
      setUnlocked(result.unlocked);
      setState("unlocked");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Circle agent payment failed");
      setState("failed");
    } finally {
      setAgentPaying(false);
    }
  }

  const currentIndex = stateOrder.indexOf(state);

  return (
    <section className="bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Pay-per-call API</p>
          <h2
            className="text-2xl font-extrabold tracking-tight text-neutral-900"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            {agentName} API
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600 max-w-xl" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
            Your agent calls this endpoint, receives HTTP 402, pays USDC on Arc Testnet, then retries with the transaction hash to unlock one response.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shrink-0" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          x402 - Arc Testnet USDC
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        {/* Lifecycle steps */}
        <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>x402 lifecycle</p>
          <div className="space-y-3" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
            {lifecycle.map((step) => {
              const index = stateOrder.indexOf(step.state);
              const complete = state === "unlocked" || currentIndex > index;
              const current = state === step.state;
              return (
                <div key={step.state} className="flex items-center gap-3 text-[13px]">
                  <span
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                      complete
                        ? "bg-emerald-100 text-emerald-600"
                        : current
                        ? "bg-blue-100 text-[#0084FF]"
                        : "bg-gray-100 text-neutral-400"
                    }`}
                  >
                    {complete ? (
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    ) : current ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className={complete || current ? "text-neutral-900 font-medium" : "text-neutral-400"}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-2.5">
            {(state === "idle" || state === "failed") && (
              <button
                className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#006EE6] text-white text-[13px] font-bold shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                onClick={requestWithoutPayment}
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                Request one-time data call
              </button>
            )}
            {state === "payment_required" && (
              <div className="space-y-2.5">
              <button
                disabled={agentPaying}
                className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-[#101828] to-[#1f2937] text-white text-[13px] font-bold shadow-md shadow-neutral-900/10 hover:shadow-lg hover:shadow-neutral-900/15 transition-all disabled:opacity-60"
                onClick={payWithCircleAgent}
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                {agentPaying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Circle agent paying...</>
                ) : (
                  <><Unlock className="h-4 w-4" /> Pay with Circle agent wallet</>
                )}
              </button>
              <button
                disabled={isPending || isConfirming}
                className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#006EE6] text-white text-[13px] font-bold shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-60"
                onClick={authorizeRealPayment}
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Confirm in Wallet...</>
                ) : (
                  <><Unlock className="h-4 w-4" /> Pay USDC &amp; Unlock Data</>
                )}
              </button>
              </div>
            )}
            {(state === "payment_authorized_onchain" || isConfirming) && (
              <button disabled className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-gray-100 text-neutral-400 text-[13px] font-semibold cursor-not-allowed" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
                <Loader2 className="h-4 w-4 animate-spin" /> Waiting for Arc confirmation...
              </button>
            )}
          </div>
        </div>

        {/* Status + response */}
        <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCell label="Price" value={`${price} USDC / call`} />
            <InfoCell label="Status" value={state.replaceAll("_", " ")} />
            <InfoCell label="Last request" value={lastRequest ?? "No request yet"} />
            <InfoCell label="Response" value={unlocked ? "Unlocked OK" : paymentRequired ? "402 received" : "Locked"} />
          </div>

          {paymentRequired && !unlocked && (
            <div className="mt-4 bg-amber-50 rounded-xl border border-amber-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>402 Payment Required</p>
              <p className="text-[12.5px] text-neutral-600 leading-relaxed" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>{paymentRequired.instructions}</p>
            </div>
          )}

          {unlocked && (
            <div className="mt-4 bg-emerald-50 rounded-xl border border-emerald-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Unlocked API response</p>
              <p className="text-[12.5px] text-neutral-900 leading-relaxed mb-3" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
                One-time API call unlocked response data from {agentName}.
              </p>
              <div className="font-mono text-[10.5px] text-neutral-400 break-all mb-1">Receipt: {unlocked.receipt}</div>
              {agentPaymentId && <div className="font-mono text-[10.5px] text-neutral-400 break-all mb-1">Circle payment ID: {agentPaymentId}</div>}
              <div className="font-mono text-[10.5px] text-neutral-400 break-all mb-1">Data hash: {unlocked.dataHash}</div>
              {txHash && <div className="font-mono text-[10.5px] text-emerald-600 break-all">Tx: {txHash}</div>}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-[13px] text-red-500 bg-red-50 rounded-xl border border-red-100 p-3" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>{error}</p>
          )}
        </div>
      </div>

      {/* Developer quickstart */}
      <div className="mt-6 bg-gray-50/80 rounded-xl p-4 border border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Developer quickstart</p>
        <div className="grid gap-4 sm:grid-cols-2 mb-5">
          <InfoCell label="Endpoint" value={`GET ${endpoint}`} />
          <InfoCell label="Price" value={`${price} USDC / call`} />
          <InfoCell label="Initial request" value="No payment header -> HTTP 402" />
          <InfoCell label="Unlocked shape" value="{ prices, timestamp, dataHash, provider, receipt }" />
        </div>
        <pre className="overflow-auto bg-neutral-950 rounded-xl p-4 font-mono text-[12px] leading-[1.8] text-emerald-400">{`// 1. Send USDC to Provider on Arc Testnet
const txHash = await sendUSDC(PROVIDER_WALLET, "${price}");

// 2. Fetch data with TxHash
fetch("${endpoint}", {
  headers: { "x-arcstream-payment-tx": txHash }
})`}</pre>
        <p className="mt-3 text-[12px] text-neutral-500 leading-5" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
          x402 on-chain mode - USDC transfer receipts are verified on Arc Testnet before data unlocks.
        </p>
      </div>
    </section>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>{label}</div>
      <div className="font-mono text-[12.5px] text-neutral-900 font-medium">{value}</div>
    </div>
  );
}
