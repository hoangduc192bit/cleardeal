"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  decodeEventLog,
  encodeAbiParameters,
  formatUnits,
  keccak256,
  type Hash,
} from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";

import { ConsumerAgentPanel } from "@/components/ConsumerAgentPanel";
import { PriceStreamPanel } from "@/components/PriceStreamPanel";
import { ProviderAgentPanel } from "@/components/ProviderAgentPanel";
import { AppNav } from "@/components/AppNav";
import { StatusLegend } from "@/components/StatusLegend";
import { X402PayPerCallPanel } from "@/components/X402PayPerCallPanel";
import { useDataStream } from "@/hooks/useDataStream";
import { getTransactionErrorMessage, useStreamPayment } from "@/hooks/useStreamPayment";
import { analyzeMarketRisk, type ConsumerAgentReport } from "@/lib/consumer-agent";
import { streamPaymentAbi, streamPaymentAddress } from "@/lib/contracts";
import { demoAgents } from "@/lib/demo-agents";
import type { PriceFeedData } from "@/lib/price-feed";
import { pulseStream, getMarketplaceStream } from "@/lib/stream-catalog";
import { HeartbeatChart } from "@/components/HeartbeatChart";
import { DynamicStreamPanel } from "@/components/DynamicStreamPanel";
import { MultiStreamGrid } from "@/components/MultiStreamGrid";
import { MeteringWidget } from "@/components/MeteringWidget";
import { ResearchAgentDemo } from "@/components/ResearchAgentDemo";
import { streamCatalog } from "@/lib/stream-catalog";

// Premium glass design tokens — shared with /marketplace (ToolCatalogGrid)
const GLASS =
  "bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl";
const OUTFIT = { fontFamily: "var(--font-outfit, Outfit, sans-serif)" } as const;
const INTER = { fontFamily: "var(--font-inter, Inter, sans-serif)" } as const;
const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#006EE6] text-white text-[13px] font-bold shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-60";
const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-xl bg-white border border-gray-200 text-neutral-700 text-[13px] font-semibold hover:border-gray-300 transition-all";

const STREAM_CAT_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  "Market Prices": { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", dot: "bg-blue-500" },
  Sentiment: { text: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", dot: "bg-violet-500" },
  Yield: { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", dot: "bg-amber-500" },
  "Risk Scoring": { text: "text-red-600", bg: "bg-red-50", border: "border-red-100", dot: "bg-red-500" },
};
function catColor(category: string) {
  return STREAM_CAT_COLORS[category] ?? { text: "text-neutral-600", bg: "bg-gray-50", border: "border-gray-100", dot: "bg-neutral-400" };
}

interface Settlement {
  paid: bigint;
  refund: bigint;
  duration: number;
  hash: Hash;
  report?: ConsumerAgentReport;
}

function settlementStorageKey(address: string, wallet: string) {
  return `arcstream:settlement:${address.toLowerCase()}:${wallet.toLowerCase()}`;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${remainder}`;
}

import { useRef } from "react";

function Usdc({ value }: { value: bigint }) {
  const formatted = formatUnits(value, 6);
  const containerRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(formatted);

  useEffect(() => {
    if (prevValue.current !== formatted && containerRef.current) {
      prevValue.current = formatted;
      const group = containerRef.current;
      group.classList.remove("is-animating");

      group.replaceChildren();
      const chars = formatted.split("");
      chars.forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "t-digit";
        span.textContent = ch;
        if (i === chars.length - 2) span.dataset.stagger = "1";
        else if (i === chars.length - 1) span.dataset.stagger = "2";
        group.appendChild(span);
      });

      const usdcSpan = document.createElement("span");
      usdcSpan.textContent = " USDC";
      group.appendChild(usdcSpan);

      void group.offsetHeight;
      group.classList.add("is-animating");
    }
  }, [formatted]);

  return (
    <span ref={containerRef} className="t-digit-group font-mono">
      {formatted.split("").map((ch, i, arr) => (
        <span
          key={i}
          className="t-digit"
          data-stagger={i === arr.length - 2 ? "1" : i === arr.length - 1 ? "2" : undefined}
        >
          {ch}
        </span>
      ))}
      <span> USDC</span>
    </span>
  );
}

export function DashboardClient() {
  const searchParams = useSearchParams();
  const selectedStream = getMarketplaceStream(searchParams.get("stream"));
  const selectedIsPulse = selectedStream.id === pulseStream.id;
  const agent = demoAgents.find((a) => a.name === selectedStream.name) ?? demoAgents[0];
  const { address, isConnected } = useAccount();
  const payment = useStreamPayment();
  const receipt = useWaitForTransactionReceipt({ hash: payment.data });
  const dataStream = useDataStream<any>(selectedStream.id);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [settlement, setSettlement] = useState<Settlement>();
  const [mode, setMode] = useState<"tools" | "streams" | "provider">("tools");

  const subscriptionKey = address
    ? keccak256(
        encodeAbiParameters(
          [{ type: "address" }, { type: "address" }],
          [address, agent.wallet],
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

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!address) {
      setSettlement(undefined);
      return;
    }
    const saved = localStorage.getItem(settlementStorageKey(address, agent.wallet));
    if (!saved) {
      setSettlement(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(saved) as {
        paid: string;
        refund: string;
        duration: number;
        hash: Hash;
        report?: ConsumerAgentReport;
      };
      setSettlement({
        paid: BigInt(parsed.paid),
        refund: BigInt(parsed.refund),
        duration: parsed.duration,
        hash: parsed.hash,
        report: parsed.report,
      });
    } catch {
      localStorage.removeItem(settlementStorageKey(address, agent.wallet));
    }
  }, [address]);

  const state = useMemo(() => {
    if (!subscription.data) return undefined;
    const [subscriber, provider, pricePerSecond, startTime, depositAmount, isActive] =
      subscription.data;
    const elapsed = Math.max(0, now - Number(startTime));
    const owed = BigInt(elapsed) * pricePerSecond;
    const used = owed > depositAmount ? depositAmount : owed;
    const remaining = depositAmount - used;
    return { subscriber, provider, pricePerSecond, startTime, depositAmount, isActive, elapsed, used, remaining };
  }, [now, subscription.data]);

  useEffect(() => {
    if (state?.isActive && address && settlement) {
      setSettlement(undefined);
      localStorage.removeItem(settlementStorageKey(address, agent.wallet));
    }
  }, [address, settlement, state?.isActive]);

  const liveReport = useMemo(
    () => (selectedIsPulse ? analyzeMarketRisk(dataStream.data, state?.elapsed ?? settlement?.duration ?? 0) : undefined),
    [dataStream.data, selectedIsPulse, settlement?.duration, state?.elapsed],
  );

  useEffect(() => {
    if (!receipt.data || !payment.data || !state) return;
    for (const log of receipt.data.logs) {
      try {
        const decoded = decodeEventLog({ abi: streamPaymentAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === "StreamStopped") {
          const completed = {
            paid: decoded.args.paid,
            refund: decoded.args.refund,
            duration: state.elapsed,
            hash: payment.data,
            report: liveReport,
          };
          setSettlement(completed);
          if (address) {
            localStorage.setItem(
              settlementStorageKey(address, agent.wallet),
              JSON.stringify({
                paid: completed.paid.toString(),
                refund: completed.refund.toString(),
                duration: completed.duration,
                hash: completed.hash,
                report: completed.report,
              }),
            );
          }
          subscription.refetch();
          break;
        }
      } catch {
        // Ignore unrelated logs in the transaction receipt.
      }
    }
  }, [address, liveReport, payment.data, receipt.data, state, subscription]);

  const active = Boolean(state?.isActive);
  const errorMessage = getTransactionErrorMessage(payment.error);
  const txStatus = payment.isPending
    ? "Awaiting wallet signature"
    : receipt.isLoading
      ? "Pending on Arc"
      : receipt.isSuccess
        ? "Confirmed"
        : payment.error || receipt.error
          ? "Failed"
          : "Ready";
  const completedReport = settlement?.report ?? (settlement ? liveReport : undefined);
  const agentCost = state
    ? {
        used: state.used,
        remaining: state.remaining,
        ratePerSecond: state.pricePerSecond,
        elapsed: state.elapsed,
      }
    : settlement
      ? {
          used: settlement.paid,
          remaining: settlement.refund,
          ratePerSecond: agent.pricePerSecond,
          elapsed: settlement.duration,
        }
      : undefined;

  return (
    <div className="relative min-h-screen bg-[#f9fafb] overflow-x-hidden" style={INTER}>
      {/* Ambient background — mirrors /marketplace */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{ top: "-5%", right: "5%", width: 650, height: 650, background: "radial-gradient(circle, rgba(96,177,255,0.12) 0%, transparent 70%)", filter: "blur(90px)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ bottom: "10%", left: "5%", width: 450, height: 450, background: "radial-gradient(circle, rgba(108,71,255,0.07) 0%, transparent 70%)", filter: "blur(80px)" }}
        />
      </div>

      <AppNav />
      <section className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1" style={INTER}>Overview</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900" style={OUTFIT}>Dashboard</h1>
          </div>
          <div className="inline-flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-[0_1px_6px_rgba(0,0,0,0.04)]" style={INTER}>
            <button
              className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${mode === "tools" ? "bg-[#0084FF] text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              onClick={() => setMode("tools")}
            >
              AI Tools
            </button>
            <button
              className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${mode === "streams" ? "bg-[#0084FF] text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              onClick={() => setMode("streams")}
            >
              Data Streams
            </button>
            <button
              className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${mode === "provider" ? "bg-[#0084FF] text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              onClick={() => setMode("provider")}
            >
              Provider
            </button>
          </div>
        </div>

        {mode === "tools" && (
          <>
            <div className="mt-8 w-full">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0084FF]" />
                <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#0084FF]">x402 · Pay per call</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-neutral-900" style={OUTFIT}>
                AI Tool <span style={{ background: "linear-gradient(135deg,#8B5CF6,#3B82F6,#06B6D4)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Console</span>
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-500 max-w-2xl" style={INTER}>
                Watch an AI agent discover tools, pay per call in USDC via x402, and return a structured report — every payment provable on Arc Testnet. No API keys, no subscriptions.
              </p>
            </div>

            <div className="mt-8"><ResearchAgentDemo /></div>

            <section className={`${GLASS} mt-6 flex flex-wrap items-center justify-between gap-5 p-6`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2" style={INTER}>Tool catalog</p>
                <h3 className="text-xl font-black tracking-tight text-neutral-900" style={OUTFIT}>5 native tools, billed per call</h3>
                <p className="mt-1.5 text-[13px] text-neutral-500" style={INTER}>Summarizer · Analyzer · Web Intelligence · Sentiment · Report Writer — from $0.02 / call.</p>
              </div>
              <Link className={PRIMARY_BTN} href="/marketplace" style={INTER}>Browse all tools →</Link>
            </section>
          </>
        )}

        {mode === "streams" && (
          <div className="mt-8 w-full">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3.5 py-1.5 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-neutral-500">Advanced · Streaming</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-neutral-900" style={OUTFIT}>
              Data <span style={{ background: "linear-gradient(135deg,#8B5CF6,#3B82F6,#06B6D4)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Streams</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-500 max-w-2xl" style={INTER}>
              The advanced per-second model: deposit USDC, consume a live data feed by the second, then stop anytime — the contract pays the provider and refunds the rest. For most use cases, use AI Tools instead.
            </p>
          </div>
        )}

        {mode === "provider" && (
          <div className="mt-8 w-full">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-3.5 py-1.5 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600">Collecting Revenue</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-neutral-900" style={OUTFIT}>
              Earnings <span style={{ background: "linear-gradient(135deg,#8B5CF6,#3B82F6,#06B6D4)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Terminal</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-500 max-w-2xl" style={INTER}>
              Monitor active stream subscribers accruing USDC per second. When a consumer stops, the contract pays your wallet and refunds their unused balance — provable on ArcScan.
            </p>
          </div>
        )}

        {mode === "streams" && (
          <>
            <div className="mt-8"><StatusLegend compact /></div>

            <section className={`${GLASS} mt-6 p-6`}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400" style={INTER}>
                    Marketplace stream context
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-neutral-900" style={OUTFIT}>
                    {selectedStream.name}
                  </h2>
                  <p className="mt-2 text-[13px] text-neutral-500" style={INTER}>
                    {selectedStream.providerName} · Trust {selectedStream.trustScore}/100 · {formatUnits(selectedStream.ratePerSecond, 6)} USDC/sec · {selectedStream.freshness}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Link className={OUTLINE_BTN} href="/marketplace" style={INTER}>
                    Compare in Marketplace →
                  </Link>
                  <Link className={PRIMARY_BTN} href={`/subscribe/${agent.id}`} style={INTER}>
                    Start selected stream
                  </Link>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {streamCatalog.map((stream) => {
                  const c = catColor(stream.category);
                  const isSel = stream.id === selectedStream.id;
                  return (
                    <Link
                      className={`rounded-2xl border p-4 text-left transition ${
                        isSel
                          ? "border-[#0084FF]/40 bg-blue-50/60 ring-1 ring-[#0084FF]/15"
                          : "border-gray-100 bg-gray-50/80 hover:border-gray-200 hover:bg-white"
                      }`}
                      href={`/dashboard?stream=${stream.id}`}
                      key={stream.id}
                    >
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
                        <span className={`w-1 h-1 rounded-full ${c.dot}`} />
                        {stream.category}
                      </span>
                      <div className="mt-2.5 text-[14px] font-bold text-neutral-900" style={OUTFIT}>{stream.name}</div>
                      <div className="mt-1.5 font-mono text-[11px] text-neutral-400">
                        {formatUnits(stream.ratePerSecond, 6)} USDC/sec
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {mode === "streams" && <MultiStreamGrid />}

        {mode === "streams" && isConnected && (
          <div className="mb-10">
            <MeteringWidget streams={streamCatalog} />
          </div>
        )}

        {mode === "streams" && !isConnected && (
          <section className={`${GLASS} mt-10 grid gap-8 p-8 lg:grid-cols-[1fr_auto] lg:items-center`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3" style={INTER}>Get Started</p>
              <h2 className="text-2xl font-black tracking-tight text-neutral-900" style={OUTFIT}>One stream, one clear payment lifecycle</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-neutral-500 max-w-2xl" style={INTER}>
                Connect a wallet, deposit USDC, consume live data, then stop anytime. ArcStream pays the provider and refunds what you did not use.
              </p>
            </div>
            <Link className={`${PRIMARY_BTN} whitespace-nowrap`} href="/subscribe/0" style={INTER}>View Pulse Feed</Link>
          </section>
        )}

        {mode === "streams" && isConnected && !active && !settlement && (
          <section className={`${GLASS} mt-10 flex flex-wrap items-center justify-between gap-6 p-8`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3" style={INTER}>Status: Idle</p>
              <h2 className="text-2xl font-black tracking-tight text-neutral-900" style={OUTFIT}>Initiate {selectedStream.name}</h2>
              <p className="mt-2 text-[13.5px] text-neutral-500" style={INTER}>Your deposit stays locked in the contract until settlement.</p>
            </div>
            <Link className={`${PRIMARY_BTN} whitespace-nowrap`} href={`/subscribe/${agent.id}`} style={INTER}>
              Connect Stream →
            </Link>
          </section>
        )}

        {mode === "streams" && settlement && (
          <section className={`${GLASS} mt-10 p-8`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-6" style={INTER}>Final two-sided settlement</p>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100"><p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1" style={INTER}>Consumer paid</p><div className="font-bold text-sm text-neutral-900" style={OUTFIT}><Usdc value={settlement.paid} /></div></div>
              <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100"><p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1" style={INTER}>Consumer refund</p><div className="font-bold text-sm text-neutral-900" style={OUTFIT}><Usdc value={settlement.refund} /></div></div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100"><p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mb-1" style={INTER}>Provider payout</p><div className="font-bold text-sm text-emerald-700" style={OUTFIT}><Usdc value={settlement.paid} /></div></div>
              <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100"><p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1" style={INTER}>Duration</p><div className="font-bold text-sm text-neutral-900" style={OUTFIT}>{formatDuration(settlement.duration)}</div></div>
            </div>
            <a className={`${OUTLINE_BTN} mt-6`} href={`https://testnet.arcscan.app/tx/${settlement.hash}`} target="_blank" style={INTER}>
              View settlement proof on ArcScan →
            </a>
          </section>
        )}

        {mode === "streams" && (
          <>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className={`${GLASS} p-7`}>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400" style={INTER}>Your active stream</p>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-gray-50/80 text-neutral-500 border border-gray-100"}`} style={INTER}>
                    {active ? "Active" : settlement ? "Completed" : "Inactive"}
                  </span>
                </div>
                {active && state ? (
                  <>
                    <h2 className="mt-5 text-2xl font-black tracking-tight text-neutral-900" style={OUTFIT}>{agent.name}</h2>
                    <div className="mt-1.5 break-all font-mono text-[11px] text-neutral-400">Provider: {state.provider}</div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <Metric label="Deposit"><Usdc value={state.depositAmount} /></Metric>
                      <Metric label="Rate"><Usdc value={state.pricePerSecond} /> / sec</Metric>
                      <Metric label="Elapsed">{formatDuration(state.elapsed)}</Metric>
                      <Metric label="Used"><Usdc value={state.used} /></Metric>
                      <Metric label="Remaining"><span className="font-bold text-emerald-600"><Usdc value={state.remaining} /></span></Metric>
                      <Metric label="Status">Connected on-chain</Metric>
                    </div>
                    <div className="mt-6">
                      <HeartbeatChart />
                    </div>
                  </>
                ) : (
                  <p className="mt-6 text-[14px] text-neutral-500" style={INTER}>No active payment stream for the connected wallet.</p>
                )}
              </section>

              <section className={`${GLASS} p-7`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400" style={INTER}>If you stop now</p>
                {active && state ? (
                  <>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Metric label="Estimated provider payout"><span className="font-bold text-emerald-600"><Usdc value={state.used} /></span></Metric>
                      <Metric label="Estimated user refund"><span className="font-medium text-neutral-900"><Usdc value={state.remaining} /></span></Metric>
                    </div>
                    <p className="mt-5 text-[12px] text-neutral-500 leading-relaxed" style={INTER}>
                      Preview uses the same contract math: elapsed seconds × rate, capped at the deposit. Final values use the block timestamp when Arc confirms.
                    </p>
                    <button
                      className={`${PRIMARY_BTN} mt-6 w-full`}
                      disabled={payment.isPending || receipt.isLoading}
                      onClick={() => payment.stop(agent.wallet)}
                      style={INTER}
                    >
                      {payment.isPending || receipt.isLoading ? "Settling on Arc..." : "Stop stream and settle"}
                    </button>
                  </>
                ) : (
                  <p className="mt-6 text-[14px] text-neutral-500" style={INTER}>Start a stream to see the live settlement preview.</p>
                )}
              </section>
            </div>

            <div className="mt-6">
              {selectedIsPulse ? (
                <PriceStreamPanel
                  unlocked={active}
                  data={dataStream.data}
                  error={dataStream.error}
                />
              ) : (
                <DynamicStreamPanel
                  unlocked={active}
                  data={dataStream.data}
                  error={dataStream.error}
                />
              )}
            </div>
          </>
        )}

        {mode === "streams" && (
          <>
            <div className="mt-6">
              <ConsumerAgentPanel
                connected={isConnected}
                active={active}
                completed={Boolean(settlement)}
                report={settlement ? completedReport : active ? liveReport : undefined}
                cost={agentCost}
                arcscanLink={settlement ? `https://testnet.arcscan.app/tx/${settlement.hash}` : undefined}
                selectedStream={selectedStream}
              />
            </div>

            <div className="mt-6">
              <X402PayPerCallPanel streamId={selectedStream.id} agentName={selectedStream.name} />
            </div>

            <section className={`${GLASS} mt-6 p-7`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2" style={INTER}>Transaction proof</p>
                  <h2 className="text-2xl font-black tracking-tight text-neutral-900" style={OUTFIT}>{txStatus}</h2>
                </div>
                {payment.data && (
                  <a className={OUTLINE_BTN} href={`https://testnet.arcscan.app/tx/${payment.data}`} target="_blank" style={INTER}>
                    Open ArcScan proof →
                  </a>
                )}
              </div>
              {payment.data && <div className="mt-5 break-all font-mono text-[11px] text-neutral-400 bg-gray-50/80 rounded-xl p-3 border border-gray-100">{payment.data}</div>}
              {errorMessage && <p role="alert" className="mt-4 text-[13px] text-red-500" style={INTER}>{errorMessage}</p>}
            </section>
          </>
        )}

        {mode === "provider" && (
          <div className="mt-6">
            <ProviderAgentPanel
              provider={{
                wallet: agent.wallet,
                ratePerSecond: state?.pricePerSecond ?? agent.pricePerSecond,
                active,
                activeEarnings: active && state ? state.used : 0n,
                completedPayout: settlement?.paid ?? 0n,
                refund: settlement?.refund ?? 0n,
                completedDuration: settlement?.duration ?? 0,
                settlementHash: settlement?.hash,
              }}
              priceData={selectedIsPulse ? dataStream.data : undefined}
              selectedStream={selectedStream}
            />
          </div>
        )}

        <section className="mt-16 border-t border-gray-200/70 pt-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4" style={INTER}>How ArcStream works</p>
          <p className="mt-0 max-w-3xl text-[15px] text-neutral-600 leading-8" style={INTER}>
            ArcStream is a payment layer for AI agents. Access live data streams by the second, or call Gemini-powered AI tools one request at a time — both models use USDC on Arc Testnet and produce an on-chain settlement proof per payment.
          </p>
          <p className="mt-4 max-w-3xl text-[13.5px] text-neutral-400 leading-7" style={INTER}>
            <b className="font-semibold text-neutral-500">Streams:</b> Deposit USDC → subscribe → data accrues per second → stop anytime → provider earns, unused refunded. &nbsp;
            <b className="font-semibold text-neutral-500">Tools (x402):</b> POST /api/tools/:id → HTTP 402 → pay USDC → retry with tx hash → AI result unlocked.
          </p>
        </section>
      </section>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>{label}</div>
      <div className="mt-1 font-semibold text-[13px] text-neutral-900" style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}>{children}</div>
    </div>
  );
}
