"use client";

import { formatUnits, type Address, type Hash } from "viem";
import Image from "next/image";
import { Check } from "lucide-react";

import type { PriceFeedData } from "@/lib/price-feed";
import type { MarketplaceStream } from "@/lib/stream-catalog";

interface ProviderState {
  wallet: Address;
  ratePerSecond: bigint;
  active: boolean;
  activeEarnings: bigint;
  completedPayout: bigint;
  refund: bigint;
  completedDuration: number;
  settlementHash?: Hash;
}

const cardClass =
  "bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl";

export function ProviderAgentPanel({
  provider,
  priceData,
  selectedStream,
}: {
  provider: ProviderState;
  priceData: PriceFeedData | undefined;
  selectedStream: MarketplaceStream;
}) {
  const completedStreams = provider.settlementHash ? 1 : 0;
  const activeSubscribers = provider.active ? 1 : 0;
  const totalEarned = provider.completedPayout;
  const freshnessSeconds = priceData
    ? Math.max(0, Math.floor((Date.now() - priceData.timestamp) / 1000))
    : undefined;
  const events = [
    { label: "Stream listed", detail: `${selectedStream.name} is available in the marketplace.`, done: true, source: "Demo profile" },
    { label: "Subscriber started stream", detail: provider.active || completedStreams ? "USDC deposit received by StreamPayment." : "Waiting for a subscriber.", done: provider.active || completedStreams > 0, source: "On-chain/session" },
    { label: "Data delivered", detail: provider.active ? "BTC, ETH, and SOL updates are unlocked." : completedStreams ? "Price data was delivered during the completed stream." : "Starts after subscription.", done: provider.active || completedStreams > 0, source: "Session-derived" },
    { label: "USDC accrued", detail: provider.active ? `${formatUnits(provider.activeEarnings, 6)} USDC accruing` : completedStreams ? `${formatUnits(provider.completedPayout, 6)} USDC accrued` : "No earnings yet.", done: provider.activeEarnings > 0n || provider.completedPayout > 0n, source: "Contract math" },
    { label: "Stream stopped", detail: completedStreams ? "Consumer confirmed stop transaction." : "Waiting for consumer confirmation.", done: completedStreams > 0, source: "On-chain/session" },
    { label: "Provider paid", detail: completedStreams ? `${formatUnits(provider.completedPayout, 6)} USDC paid to provider.` : "Paid when the stream stops.", done: completedStreams > 0, source: "On-chain event" },
    { label: "Refund returned", detail: completedStreams ? `${formatUnits(provider.refund, 6)} USDC returned to subscriber.` : "Unused deposit returns at settlement.", done: completedStreams > 0, source: "On-chain event" },
  ];

  return (
    <section className={`${cardClass} p-7`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/60 pb-6">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Provider profile
          </p>
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden border border-white/80">
              <Image src={selectedStream.avatar} alt={selectedStream.providerName} fill className="object-cover" />
            </div>
            <h2
              className="text-2xl font-black tracking-tight text-neutral-900"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              {selectedStream.providerName}
            </h2>
          </div>
          <p
            className="mt-3 text-[13.5px] text-neutral-600 leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            {selectedStream.description}
          </p>
          <div className="mt-3 break-all font-mono text-[11px] text-neutral-400">Wallet: {selectedStream.providerWallet}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
            selectedStream.onchainEnabled
              ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
              : "bg-gray-50/80 border border-gray-100 text-neutral-500"
          }`}
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${selectedStream.onchainEnabled ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
          {selectedStream.onchainEnabled ? "Online · On-chain" : "Local preview"}
        </span>
      </div>

      {/* Top metrics */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProviderMetric label="Stream rate" value={`${formatUnits(selectedStream.ratePerSecond, 6)} USDC/sec`} source={selectedStream.onchainEnabled ? "On-chain/session" : "Demo catalog"} />
        <ProviderMetric label="Signals provided" value={selectedStream.signals.join(", ")} source="Provider profile" />
        <ProviderMetric label="Data freshness" value={selectedStream.onchainEnabled && freshnessSeconds !== undefined ? `${freshnessSeconds}s ago` : selectedStream.freshness} source={selectedStream.onchainEnabled ? "Local price timing" : "Demo catalog"} />
        <ProviderMetric label="Last updated" value={selectedStream.onchainEnabled && priceData ? new Date(priceData.timestamp).toLocaleTimeString() : "Demo preview"} source={selectedStream.onchainEnabled ? "Local price timing" : "Demo catalog"} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        {/* Earnings registry */}
        <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-6">
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-5"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Earnings registry
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <ProviderMetric label="Total earned" value={`${formatUnits(totalEarned, 6)} USDC`} source="Session estimate" emphasis />
            <ProviderMetric label="Active earnings" value={`${formatUnits(provider.activeEarnings, 6)} USDC`} source="Contract math estimate" emphasis />
            <ProviderMetric label="Active subscribers" value={String(activeSubscribers)} source="Current wallet/session" />
            <ProviderMetric label="Completed streams" value={String(completedStreams)} source="Current wallet/session" />
            <ProviderMetric label="Last payout" value={`${formatUnits(provider.completedPayout, 6)} USDC`} source="On-chain event/session" />
          </div>
          {provider.settlementHash && (
            <a
              className="mt-6 inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-white border border-gray-200 text-neutral-700 text-[13px] font-semibold hover:border-gray-300 transition-all"
              href={`https://testnet.arcscan.app/tx/${provider.settlementHash}`}
              target="_blank"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              ArcScan payout proof →
            </a>
          )}
        </div>

        {/* Trust metrics */}
        <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-6">
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-5"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Trust metrics
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <ProviderMetric label="Uptime" value="99.9%" source="Demo metric" />
            <ProviderMetric label="Delivery success" value="100%" source="Demo metric" />
            <ProviderMetric label="Avg response time" value="5 sec" source="Demo polling interval" />
            <ProviderMetric label="Trust score" value={`${selectedStream.trustScore} / 100`} source="Demo metric" emphasis />
          </div>
        </div>
      </div>

      {/* System timeline */}
      <div className="mt-5 bg-gray-50/80 rounded-xl border border-gray-100 p-6">
        <p
          className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-5"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          System timeline
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => (
            <div className="flex gap-3" key={event.label}>
              <span
                className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  event.done ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-neutral-400"
                }`}
              >
                {event.done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <div>
                <div
                  className={`text-[13px] ${event.done ? "font-semibold text-neutral-900" : "font-medium text-neutral-400"}`}
                  style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                >
                  {event.label}
                </div>
                <div
                  className="mt-0.5 text-[12px] text-neutral-600 leading-5"
                  style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                >
                  {event.detail}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest font-bold text-[#0084FF]/70">{event.source}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProviderMetric({
  label,
  value,
  source,
  emphasis = false,
}: {
  label: string;
  value: string;
  source: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1"
        style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
      >
        {label}
      </div>
      <div className={`font-mono text-[13px] font-semibold ${emphasis ? "text-emerald-600" : "text-neutral-900"}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-neutral-400">{source}</div>
    </div>
  );
}
