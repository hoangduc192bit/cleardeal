"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { encodeAbiParameters, formatUnits, keccak256, parseUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";

import { AppNav } from "@/components/AppNav";
import { StatusLegend } from "@/components/StatusLegend";
import { getTransactionErrorMessage, useStreamPayment } from "@/hooks/useStreamPayment";
import { streamPaymentAbi, streamPaymentAddress } from "@/lib/contracts";
import { demoAgents } from "@/lib/demo-agents";
import { streamCatalog } from "@/lib/stream-catalog";

const cardClass =
  "bg-white rounded-[2rem] border border-[rgba(226,232,240,0.65)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.05)]";
const primaryBtn =
  "inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-[#0084FF] text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryBtn =
  "inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-[rgba(226,232,240,0.8)] text-sm font-semibold text-[#18181B] hover:border-[#0084FF]/30 hover:text-[#0084FF] transition disabled:opacity-50 disabled:cursor-not-allowed";

export default function SubscribePage() {
  const params = useParams<{ agentId: string }>();
  const selectedStream = streamCatalog[Number(params.agentId)] ?? streamCatalog[0];
  const onchainAgent = demoAgents.find(a => a.id === Number(params.agentId)) ?? demoAgents[0];
  const [amount, setAmount] = useState("10");
  const payment = useStreamPayment();
  const deposit = parseUnits(amount || "0", 6);
  const { address } = useAccount();
  const subscriptionKey = address
    ? keccak256(
        encodeAbiParameters(
          [{ type: "address" }, { type: "address" }],
          [address, onchainAgent.wallet],
        ),
      )
    : undefined;
  const subscription = useReadContract({
    address: streamPaymentAddress,
    abi: streamPaymentAbi,
    functionName: "subscriptions",
    args: subscriptionKey ? [subscriptionKey] : undefined,
    query: { enabled: Boolean(subscriptionKey), refetchInterval: 3000 },
  });
  const receipt = useWaitForTransactionReceipt({ hash: payment.data });
  const seconds =
    onchainAgent.pricePerSecond > 0n ? deposit / onchainAgent.pricePerSecond : 0n;
  const errorMessage = getTransactionErrorMessage(payment.error);
  const active = Boolean(subscription.data?.[5]);
  const deposited = subscription.data?.[4] ?? 0n;

  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <AppNav />
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-20 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3">{selectedStream.category} stream</p>
          <h1
            className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-[#18181B]"
            style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
          >
            {selectedStream.name}
          </h1>
          <p className="mt-5 max-w-xl text-[16px] text-[#71717A] leading-relaxed">{selectedStream.description}</p>
          <div className="mt-6">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                selectedStream.onchainEnabled
                  ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                  : "bg-amber-50 border border-amber-100 text-amber-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${selectedStream.onchainEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {selectedStream.onchainEnabled ? "Real on Arc Testnet" : "Preview mode"}
            </span>
          </div>
          <div className={`${cardClass} mt-8 p-6`}>
            <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Provider wallet</p>
            <div className="break-all font-mono text-[12.5px] text-[#18181B]">{selectedStream.providerWallet}</div>
          </div>
          <div className="mt-6"><StatusLegend compact /></div>
        </div>

        <form className={`${cardClass} p-7 h-fit`} onSubmit={(event) => event.preventDefault()}>
          {!selectedStream.onchainEnabled ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3">Preview mode</p>
              <h2
                className="font-display text-2xl font-extrabold tracking-tight text-[#18181B]"
                style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
              >
                On-chain subscription coming soon
              </h2>
              <p className="mt-4 text-[13.5px] text-[#71717A] leading-relaxed">
                This stream can be compared and previewed, but it cannot request wallet transactions yet.
              </p>
              <Link href={`/dashboard?stream=${selectedStream.id}`} className={`${secondaryBtn} mt-8 w-full`}>
                Open Stream Profile
              </Link>
              <Link href="/subscribe/0" className={`${primaryBtn} mt-3 w-full`}>
                Start Pulse Price Feed instead →
              </Link>
            </>
          ) : active ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600 mb-3">Stream active</p>
              <h2
                className="font-display text-2xl font-extrabold tracking-tight text-emerald-600"
                style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
              >
                {formatUnits(deposited, 6)} USDC deposited
              </h2>
              <p className="mt-4 text-[13.5px] text-[#71717A] leading-relaxed">
                This wallet already has an active on-chain subscription.
              </p>
              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-800">
                Direct top-up is not available in the current deployed contract. Stop and settle the active stream first, then start a new stream with a larger USDC deposit.
              </div>
              <Link href="/dashboard" className={`${primaryBtn} mt-8 w-full`}>
                Open dashboard to settle →
              </Link>
            </>
          ) : (
            <>
              <label htmlFor="deposit" className="text-[13px] font-semibold text-[#18181B]">Deposit amount</label>
              <div className="mt-3 flex items-center rounded-xl border border-slate-200 bg-slate-50/50 px-4 focus-within:border-[#0084FF]/60 focus-within:bg-white transition">
                <input
                  id="deposit"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="min-h-14 w-full bg-transparent text-[15px] text-[#18181B] outline-none"
                />
                <span className="font-mono text-[13px] text-slate-400">USDC</span>
              </div>
              <div className="mt-3 text-[13px] text-[#71717A]">Estimated duration: <span className="font-semibold text-[#18181B]">{seconds.toString()}</span> seconds</div>
              <button
                type="button"
                onClick={() => payment.approve(deposit)}
                disabled={payment.isPending || receipt.isLoading}
                className={`${secondaryBtn} mt-8 w-full`}
              >
                1. Approve USDC
              </button>
              <button
                type="button"
                onClick={() => payment.start(onchainAgent.wallet, onchainAgent.pricePerSecond, deposit)}
                disabled={payment.isPending || receipt.isLoading}
                className={`${primaryBtn} mt-3 w-full`}
              >
                2. Start stream →
              </button>
            </>
          )}
          {receipt.isLoading && <p className="mt-4 text-[13px] text-slate-400">Waiting for Arc confirmation…</p>}
          {receipt.isSuccess && <p className="mt-4 text-[13px] text-emerald-600">Transaction confirmed on Arc Testnet.</p>}
          {errorMessage && <p role="alert" className="mt-4 text-[13px] leading-relaxed text-red-500">{errorMessage}</p>}
          {payment.data && (
            <a
              href={`https://testnet.arcscan.app/tx/${payment.data}`}
              target="_blank"
              className="mt-4 block break-all font-mono text-[11px] text-[#0084FF] hover:underline"
            >
              View transaction: {payment.data}
            </a>
          )}
        </form>
      </section>
    </main>
  );
}
