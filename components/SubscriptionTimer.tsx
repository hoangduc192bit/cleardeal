"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { encodeAbiParameters, keccak256 } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";

import { getTransactionErrorMessage, useStreamPayment } from "@/hooks/useStreamPayment";
import { streamPaymentAbi, streamPaymentAddress } from "@/lib/contracts";
import type { MarketplaceStream } from "@/lib/stream-catalog";

export function SubscriptionTimer({ stream }: { stream: MarketplaceStream }) {
  const { address } = useAccount();
  const payment = useStreamPayment();
  const receipt = useWaitForTransactionReceipt({ hash: payment.data });
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isWarning, setIsWarning] = useState(false);

  const subscriptionKey = address
    ? keccak256(
        encodeAbiParameters(
          [{ type: "address" }, { type: "address" }],
          [address, stream.providerWallet],
        ),
      )
    : undefined;

  const { data: sub, refetch } = useReadContract({
    address: streamPaymentAddress,
    abi: streamPaymentAbi,
    functionName: "subscriptions",
    args: subscriptionKey ? [subscriptionKey] : undefined,
    query: { enabled: Boolean(subscriptionKey), refetchInterval: 10000 },
  });

  const isActive = Boolean(sub?.[5]);
  const depositAmount = sub?.[4] ?? 0n;
  const startTime = sub?.[3] ?? 0n;
  const pricePerSecond = sub?.[2] ?? 0n;

  useEffect(() => {
    if (!isActive || pricePerSecond === 0n) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const elapsed = now - startTime;
      const used = elapsed * pricePerSecond;
      const remaining = depositAmount > used ? depositAmount - used : 0n;
      const secs = pricePerSecond > 0n ? Number(remaining / pricePerSecond) : 0;
      setSecondsLeft(secs);
      setIsWarning(secs < 60);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isActive, depositAmount, startTime, pricePerSecond]);

  useEffect(() => {
    if (receipt.isSuccess) {
      refetch();
    }
  }, [receipt.isSuccess, refetch]);

  if (!isActive || secondsLeft === null) return null;

  const totalSecs =
    pricePerSecond > 0n ? Number(depositAmount / pricePerSecond) : 0;
  const progress = totalSecs > 0 ? Math.max(0, secondsLeft / totalSecs) : 0;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${mins}m ${secs.toString().padStart(2, "0")}s`;

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;
  const errorMessage = getTransactionErrorMessage(payment.error);
  const isSettling = payment.isPending || receipt.isLoading;

  return (
    <div
      className={`relative mt-3 flex items-center gap-3 rounded-xl border p-3 text-xs transition-all ${
        isWarning
          ? "border-rose-100 bg-rose-50"
          : "border-gray-100 bg-gray-50/80"
      }`}
      style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        className="shrink-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="rgba(229,231,235,0.9)"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={isWarning ? "#f43f5e" : "#0084FF"}
          strokeWidth="4"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>

      <div className="flex-1">
        <p
          className={`text-sm font-black ${
            isWarning ? "text-rose-600" : "text-neutral-900"
          }`}
          style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
        >
          {display}
        </p>
        <p
          className={`mt-0.5 text-[11px] ${
            isWarning ? "text-rose-400" : "text-neutral-400"
          }`}
        >
          {isWarning ? "Stream nearly spent" : "remaining balance"}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${
            isWarning
              ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
              : "bg-white border border-gray-200 text-neutral-700 hover:border-gray-300"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={isSettling}
          onClick={() => payment.stop(stream.providerWallet)}
          title="Stop this specific stream, pay the provider, and refund unused USDC."
        >
          {isSettling ? "Settling..." : "Stop & settle"}
        </button>
        <Link
          href={`/dashboard?stream=${stream.id}`}
          className="text-[9px] leading-3 text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
        >
          view details
        </Link>
        {isWarning && (
          <span className="max-w-24 text-right text-[9px] leading-3 text-rose-400">
            restart to add funds
          </span>
        )}
      </div>
      {errorMessage && (
        <p className="absolute left-3 right-3 top-full mt-2 rounded-lg border border-rose-100 bg-rose-50 p-2 text-[10px] leading-4 text-rose-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
