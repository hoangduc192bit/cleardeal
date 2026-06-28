"use client";

import Link from "next/link";

import type { PriceFeedData } from "@/lib/price-feed";

const assets = [
  { key: "btc", label: "Bitcoin", symbol: "BTC" },
  { key: "eth", label: "Ethereum", symbol: "ETH" },
  { key: "sol", label: "Solana", symbol: "SOL" },
] as const;

const cardClass =
  "bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl";

export function PriceStreamPanel({
  unlocked,
  data,
  error,
}: {
  unlocked: boolean;
  data: PriceFeedData | undefined;
  error: string | undefined;
}) {
  if (!unlocked) {
    return (
      <section className={`${cardClass} relative min-h-[360px] overflow-hidden p-7`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-5" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Live data stream</p>
        <div className="mt-4 grid gap-4 blur-sm opacity-40 md:grid-cols-3 pointer-events-none" aria-hidden="true">
          {assets.map((asset, index) => (
            <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100" key={asset.key}>
              <div className="text-[12px] text-neutral-400">{asset.symbol}</div>
              <div className="mt-4 font-mono text-2xl font-extrabold text-neutral-900" style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}>${[68240, 3540, 168][index]}</div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 p-6 text-center backdrop-blur-sm">
          <div>
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mx-auto mb-4">🔒</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Data locked</p>
            <h2
              className="text-2xl font-extrabold text-neutral-900 mb-3"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              Start a stream to unlock live prices
            </h2>
            <p className="text-[14px] text-neutral-600 mx-auto max-w-md leading-6 mb-6" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
              Deposit USDC to access BTC, ETH, SOL and AI market analysis.
            </p>
            <Link
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#006EE6] text-white text-[13px] font-bold shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              href="/subscribe/0"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Start Pulse Price Feed →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${cardClass} p-7 text-red-500 text-[13px]`} style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        Live data error: {error}
      </section>
    );
  }

  if (!data) {
    return (
      <section className={`${cardClass} min-h-[360px] animate-pulse p-7 text-neutral-500 text-[13px]`} style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        Unlocking live price stream…
      </section>
    );
  }

  return (
    <section className={`${cardClass} min-w-0 p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Live data stream</p>
          <h2
            className="text-xl font-extrabold text-neutral-900"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Crypto market pulse
          </h2>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Stream active · data unlocked
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {assets.map((asset) => {
          const change = data.change24h[asset.key];
          return (
            <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100" key={asset.key}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-neutral-500" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>{asset.label}</span>
                <span className="font-mono text-[11px] text-neutral-400">{asset.symbol}</span>
              </div>
              <div className="mt-5 font-mono text-2xl font-extrabold text-neutral-900 tabular-nums" style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}>${data.prices[asset.key].toLocaleString()}</div>
              <div className={`mt-2 font-mono text-[12px] font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {change >= 0 ? "+" : ""}{change.toFixed(2)}% / 24h
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 bg-gray-50/80 rounded-xl p-4 border border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2.5" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>AI analysis</p>
        <p className="text-[13.5px] text-neutral-600 leading-relaxed" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>{data.analysis}</p>
      </div>
    </section>
  );
}
