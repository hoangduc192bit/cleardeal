"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { encodeAbiParameters, keccak256, formatUnits } from "viem";
import { streamPaymentAddress, streamPaymentAbi } from "@/lib/contracts";
import type { MarketplaceStream } from "@/lib/stream-catalog";

export function MeteringWidget({ streams }: { streams: MarketplaceStream[] }) {
  const { address } = useAccount();
  const [now, setNow] = useState(BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const interval = setInterval(
      () => setNow(BigInt(Math.floor(Date.now() / 1000))),
      1000
    );
    return () => clearInterval(interval);
  }, []);

  const activeStreams = streams.map((stream) => ({
    stream,
    key: address
      ? keccak256(
          encodeAbiParameters(
            [{ type: "address" }, { type: "address" }],
            [address, stream.providerWallet]
          )
        )
      : undefined,
  }));

  return (
    <div className="bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 w-full">
      <div className="flex items-center gap-2 mb-5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span
          className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          Live Billing Meter
        </span>
      </div>

      <div className="space-y-3">
        {activeStreams.map(({ stream, key }) => (
          <StreamMeterRow key={stream.id} stream={stream} subKey={key} now={now} />
        ))}
      </div>
    </div>
  );
}

function StreamMeterRow({
  stream,
  subKey,
  now,
}: {
  stream: MarketplaceStream;
  subKey: `0x${string}` | undefined;
  now: bigint;
}) {
  const { data: sub } = useReadContract({
    address: streamPaymentAddress,
    abi: streamPaymentAbi,
    functionName: "subscriptions",
    args: subKey ? [subKey] : undefined,
    query: { enabled: Boolean(subKey), refetchInterval: 5000 },
  });

  const isActive = Boolean(sub?.[5]);
  if (!isActive) return null;

  const startTime = sub?.[3] ?? 0n;
  const depositAmount = sub?.[4] ?? 0n;
  const pricePerSecond = sub?.[2] ?? 0n;

  const elapsed = now > startTime ? now - startTime : 0n;
  const used = elapsed * pricePerSecond;
  const spent = used > depositAmount ? depositAmount : used;
  const remaining = depositAmount > spent ? depositAmount - spent : 0n;
  const pct = depositAmount > 0n ? Number((spent * 100n) / depositAmount) : 0;

  return (
    <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-4" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[12.5px] font-semibold text-neutral-900 uppercase tracking-wide">{stream.name}</span>
        <span className="font-mono text-[11px] text-red-500 font-semibold">
          -{formatUnits(pricePerSecond, 6)} USDC/s
        </span>
      </div>
      <div className="flex-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2.5">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-neutral-400">Spent: <span className="font-semibold text-red-500">{formatUnits(spent, 6)} USDC</span></span>
        <span className="text-neutral-400">Remaining: <span className="font-semibold text-emerald-600">{formatUnits(remaining, 6)} USDC</span></span>
      </div>
    </div>
  );
}
