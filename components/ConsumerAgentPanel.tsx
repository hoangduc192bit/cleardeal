"use client";

import Link from "next/link";
import Image from "next/image";
import { formatUnits } from "viem";
import { Check, Loader2 } from "lucide-react";

import type { ConsumerAgentReport } from "@/lib/consumer-agent";
import type { MarketplaceStream } from "@/lib/stream-catalog";

interface CostState {
  used: bigint;
  remaining: bigint;
  ratePerSecond: bigint;
  elapsed: number;
}

const cardClass =
  "bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl";

export function ConsumerAgentPanel({
  connected,
  active,
  completed,
  report,
  cost,
  arcscanLink,
  selectedStream,
}: {
  connected: boolean;
  active: boolean;
  completed: boolean;
  report: ConsumerAgentReport | undefined;
  cost: CostState | undefined;
  arcscanLink: string | undefined;
  selectedStream: MarketplaceStream;
}) {
  const currentStep = !connected ? -1 : completed ? 5 : active ? (report ? 5 : 3) : 2;
  const costPerMinute = cost ? cost.ratePerSecond * 60n : 0n;
  const worthContinuing = active && report?.recommendation === "Keep stream active";
  const lifecycle = [
    "Checking available streams",
    `Selected ${selectedStream.name}`,
    selectedStream.onchainEnabled ? "Waiting for active subscription" : "Demo preview cannot subscribe yet",
    "Reading live data",
    "Generating market risk report",
    "Recommending next action",
  ];

  const riskTone =
    report?.riskLevel === "HIGH"
      ? { text: "text-red-500", bg: "bg-red-50", border: "border-red-100" }
      : report?.riskLevel === "MEDIUM"
        ? { text: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" }
        : { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };

  return (
    <section className={`${cardClass} p-7`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/60 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-3 py-1 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span
              className="text-[10px] font-bold tracking-widest uppercase text-violet-600"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Auto Mode Active
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden border border-white/80">
              <Image src="/agents/consumer-agent.png" alt="Market Risk Agent" fill className="object-cover" />
            </div>
            <h2
              className="text-2xl font-black tracking-tight text-neutral-900"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              Market Risk Agent
            </h2>
          </div>
          <p
            className="mt-3 max-w-2xl text-[13.5px] text-neutral-600 leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Goal: Monitor BTC, ETH, and SOL market risk using the best available stream.
          </p>
        </div>
        <span
          className="rounded-full bg-gray-50/80 border border-gray-100 px-3 py-1.5 text-[11px] font-medium text-neutral-500"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          Analysis only · You confirm transactions
        </span>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        {/* Lifecycle */}
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Agent lifecycle
          </p>
          <div className="space-y-3">
            {lifecycle.map((step, index) => {
              const done = index < currentStep || completed;
              const current = index === currentStep && !completed;
              return (
                <div className="flex items-center gap-3 text-[13px]" key={step}>
                  <span
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                      done
                        ? "bg-emerald-100 text-emerald-600"
                        : current
                          ? "bg-blue-100 text-[#0084FF]"
                          : "bg-gray-100 text-neutral-400"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    ) : current ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={done || current ? "text-neutral-900 font-medium" : "text-neutral-400"}
                    style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
          {!connected && (
            <p
              className="mt-6 text-[13px] text-neutral-400"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Waiting for wallet connection…
            </p>
          )}
          {connected && !active && !completed && selectedStream.onchainEnabled && (
            <Link
              className="mt-6 inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#006EE6] text-white text-[13px] font-bold shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              href="/subscribe/0"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Start Price Feed →
            </Link>
          )}
        </div>

        {/* Report */}
        <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-6">
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            {completed ? "Completed report" : "Live report"}
          </p>
          {report ? (
            <>
              <div className={`inline-flex items-center rounded-xl px-4 py-2 ${riskTone.bg} border ${riskTone.border}`}>
                <span
                  className={`text-3xl font-black ${riskTone.text}`}
                  style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
                >
                  {report.riskLevel} RISK
                </span>
              </div>
              <p
                className="mt-4 text-[13.5px] text-neutral-600 leading-relaxed"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                {report.explanation}
              </p>
              <div className="mt-5 bg-white rounded-xl border border-gray-100 p-4">
                <div
                  className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1.5"
                  style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                >
                  Data used
                </div>
                <div className="font-mono text-[12px] leading-5 text-neutral-900">{report.dataUsed}</div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div
                    className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1"
                    style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                  >
                    Recommended action
                  </div>
                  <div
                    className="text-[14px] font-extrabold text-neutral-900"
                    style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
                  >
                    {report.recommendation}
                  </div>
                </div>
                {arcscanLink && (
                  <a
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-white border border-gray-200 text-neutral-700 text-[13px] font-semibold hover:border-gray-300 transition-all"
                    href={arcscanLink}
                    target="_blank"
                    style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                  >
                    ArcScan proof →
                  </a>
                )}
              </div>
            </>
          ) : (
            <p
              className="mt-2 text-[13.5px] text-neutral-600 leading-relaxed"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              {active
                ? "Reading the unlocked stream and preparing a risk report…"
                : "Agent needs an active stream before it can analyze market risk."}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Selection reasoning */}
        <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-5 md:col-span-2">
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Agent selection reasoning
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Cost label="Required data" value="Live BTC, ETH, SOL prices" />
            <Cost label="Selected stream" value={selectedStream.name} />
            <Cost label="Cost and trust" value={`${formatUnits(selectedStream.ratePerSecond, 6)} USDC/sec · ${selectedStream.trustScore}/100`} />
          </div>
          <p
            className="mt-5 text-[13px] text-neutral-600 leading-relaxed border-t border-gray-200 pt-4"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            {selectedStream.onchainEnabled
              ? "For market risk monitoring, I selected Pulse Price Feed because it provides live BTC, ETH, and SOL prices, has the lowest cost, and is currently on-chain enabled."
              : `${selectedStream.name} is useful for ${selectedStream.bestFor.toLowerCase()}, but it is a demo preview and cannot be purchased on-chain yet. Pulse Price Feed remains the recommended executable option.`}
          </p>
        </div>

        {/* Agent reasoning */}
        <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-5">
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Agent reasoning
          </p>
          <p
            className="text-[13px] text-neutral-600 leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            I need live BTC, ETH, and SOL prices to estimate short-term market risk. Pulse Price Feed provides the required data, and ArcStream lets me consume it with USDC-based streaming payments.
          </p>
        </div>

        {/* Cost awareness */}
        <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-5">
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Cost awareness
          </p>
          {cost ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Cost label="Cost used" value={`${formatUnits(cost.used, 6)} USDC`} />
              <Cost label="Remaining" value={`${formatUnits(cost.remaining, 6)} USDC`} />
              <Cost label="Cost per minute" value={`${formatUnits(costPerMinute, 6)} USDC`} />
              <Cost label="Worth continuing?" value={worthContinuing ? "Yes, more data needed" : completed ? "Completed" : "No, settle now"} />
            </div>
          ) : (
            <p
              className="text-[13px] text-neutral-600"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Cost awareness begins when the stream is active.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Cost({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1"
        style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
      >
        {label}
      </div>
      <div className="font-mono text-[12.5px] text-neutral-900 font-medium">{value}</div>
    </div>
  );
}
