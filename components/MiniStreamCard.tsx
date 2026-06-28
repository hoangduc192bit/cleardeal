"use client";

import { useAccount, useReadContract } from "wagmi";
import { encodeAbiParameters, keccak256 } from "viem";
import { streamPaymentAbi, streamPaymentAddress } from "@/lib/contracts";
import { useDataStream } from "@/hooks/useDataStream";
import type { Agent } from "@/components/AgentCard";
import type { MarketplaceStream } from "@/lib/stream-catalog";
import { HeartbeatChart } from "@/components/HeartbeatChart";
import { SubscriptionTimer } from "@/components/SubscriptionTimer";
import Link from "next/link";
import Image from "next/image";

export function MiniStreamCard({
  agent,
  stream,
}: {
  agent: Agent;
  stream: MarketplaceStream;
}) {
  const { address } = useAccount();

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

  const isActive = Boolean(subscription.data?.[5]);
  const dataStream = useDataStream<any>(stream.id);

  const CATEGORY_STYLES: Record<
    string,
    { bg: string; text: string; border: string; dot: string }
  > = {
    "Market Prices": {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-100",
      dot: "bg-blue-500",
    },
    Sentiment: {
      bg: "bg-violet-50",
      text: "text-violet-600",
      border: "border-violet-100",
      dot: "bg-violet-500",
    },
    Yield: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
      dot: "bg-amber-500",
    },
    "Risk Scoring": {
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-100",
      dot: "bg-red-500",
    },
  };
  const catStyle = CATEGORY_STYLES[stream.category] ?? {
    bg: "bg-gray-50",
    text: "text-neutral-600",
    border: "border-gray-100",
    dot: "bg-gray-400",
  };

  return (
    <div className="bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl flex flex-col justify-between overflow-hidden p-5 hover:-translate-y-1 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_16px_48px_-4px_rgba(0,0,0,0.10)] transition-all duration-300">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
            {stream.category}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
              isActive
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-gray-50 text-neutral-500 border-gray-100"
            }`}
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            {isActive ? "Active" : "Locked"}
          </span>
        </div>

        {/* Agent identity */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/50">
          <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-gray-100">
            <Image src={stream.avatar} alt={agent.name} fill className="object-cover" />
          </div>
          <h3
            className="text-[15px] font-black text-neutral-900 leading-tight"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            {agent.name}
          </h3>
        </div>

        {/* Data panel */}
        <div className="mt-4">
          {isActive ? (
            dataStream.data ? (
              <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-4 min-h-[120px] relative" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
                <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>

                {stream.id === "pulse-price-feed" && (
                  <div className="grid gap-2.5 text-[12px] pt-1">
                    <div className="flex justify-between"><span className="text-neutral-400">BTC/USDC</span><span className="font-semibold text-neutral-900">${dataStream.data.prices?.btc?.toLocaleString() || "…"}</span></div>
                    <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-neutral-400">ETH/USDC</span><span className="font-semibold text-neutral-900">${dataStream.data.prices?.eth?.toLocaleString() || "…"}</span></div>
                    <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-neutral-400">SOL/USDC</span><span className="font-semibold text-neutral-900">${dataStream.data.prices?.sol?.toLocaleString() || "…"}</span></div>
                  </div>
                )}

                {stream.id === "market-sentiment" && (
                  <div className="flex flex-col gap-2.5 text-[12px] pt-1">
                    <div className="flex items-end justify-between"><span className="text-neutral-400">Fear &amp; Greed</span><span className="text-2xl font-black text-red-500" style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}>{dataStream.data.score}</span></div>
                    <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-neutral-400">Label</span><span className="font-semibold text-neutral-900 uppercase">{dataStream.data.label}</span></div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dataStream.data.trendingKeywords?.slice(0, 3).map((kw: string) => (
                        <span key={kw} className="rounded-md bg-gray-100 px-2 py-0.5 text-[9px] text-neutral-500 uppercase">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {stream.id === "stablecoin-yield" && (
                  <div className="grid gap-2.5 text-[12px] pt-1">
                    <div className="flex justify-between"><span className="text-neutral-400">Aave V3 (USDC)</span><span className="font-semibold text-emerald-600">{dataStream.data.assets?.USDC?.aave?.toFixed(2)}% APY</span></div>
                    <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-neutral-400">Compound V3</span><span className="font-semibold text-emerald-600">{dataStream.data.assets?.USDC?.compound?.toFixed(2)}% APY</span></div>
                    <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-neutral-400">Morpho Blue</span><span className="font-semibold text-emerald-600">{dataStream.data.assets?.USDC?.morpho?.toFixed(2)}% APY</span></div>
                  </div>
                )}

                {stream.id === "wallet-risk" && (
                  <div className="flex flex-col gap-2.5 text-[12px] pt-1">
                    <div className="flex items-center justify-between"><span className="text-neutral-400">Risk Level</span><span className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 uppercase">{dataStream.data.riskLevel}</span></div>
                    <div className="flex items-end justify-between border-t border-gray-100 pt-2"><span className="text-neutral-400">Threat Score</span><span className="text-xl font-black text-red-500" style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}>{dataStream.data.riskScore}/100</span></div>
                    <div className="truncate text-[10px] text-neutral-400 mt-1 font-mono">Target: {dataStream.data.wallet}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[12px] text-neutral-400 animate-pulse py-6 text-center" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Loading stream…</div>
            )
          ) : (
            <div className="relative border border-dashed border-gray-200 rounded-xl p-3 min-h-[120px] flex items-center justify-center bg-gray-50/80">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-neutral-300 text-lg">🔒</div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Encrypted / Locked</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-white/50 pt-4">
        {isActive ? (
          <>
            <div className="h-12 w-full opacity-60"><HeartbeatChart /></div>
            <SubscriptionTimer stream={stream} />
          </>
        ) : (
          <Link
            href={`/subscribe/${agent.id}`}
            className="text-[12px] font-bold text-[#0084FF] hover:underline"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Deposit USDC to unlock →
          </Link>
        )}
      </div>
    </div>
  );
}
