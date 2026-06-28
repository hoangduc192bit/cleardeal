"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { publicClient, streamPaymentAddress } from "@/lib/contracts";
import { streamCatalog } from "@/lib/stream-catalog";

type TxEvent = {
  type: "StreamStarted" | "StreamStopped" | "PaymentSettled";
  hash: string;
  blockNumber: bigint;
  subscriber?: string;
  agent?: string;
  deposit?: bigint;
  paid?: bigint;
  refund?: bigint;
  amount?: bigint;
  timestamp?: number;
};

function agentName(addr: string) {
  const found = streamCatalog.find(
    (s) => s.providerWallet.toLowerCase() === addr?.toLowerCase()
  );
  return found ? found.name : addr.slice(0, 6) + "..." + addr.slice(-4);
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function typeBadge(type: TxEvent["type"]) {
  if (type === "StreamStarted")
    return (
      <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
        STARTED
      </span>
    );
  if (type === "StreamStopped")
    return (
      <span className="rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
        STOPPED
      </span>
    );
  return (
    <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-[#0084FF]">
      SETTLED
    </span>
  );
}

export function ArcScanExplorer() {
  const [events, setEvents] = useState<TxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<bigint | null>(null);

  async function fetchEvents() {
    try {
      const latest = await publicClient.getBlockNumber();
      const fromBlock = latest > 5000n ? latest - 5000n : 0n;
      setLastBlock(latest);

      const [started, stopped, settled] = await Promise.all([
        publicClient.getLogs({
          address: streamPaymentAddress,
          event: {
            type: "event",
            name: "StreamStarted",
            inputs: [
              { name: "subscriber", type: "address", indexed: true },
              { name: "agent", type: "address", indexed: true },
              { name: "deposit", type: "uint256", indexed: false },
            ],
          },
          fromBlock,
          toBlock: latest,
        }),
        publicClient.getLogs({
          address: streamPaymentAddress,
          event: {
            type: "event",
            name: "StreamStopped",
            inputs: [
              { name: "subscriber", type: "address", indexed: true },
              { name: "agent", type: "address", indexed: true },
              { name: "paid", type: "uint256", indexed: false },
              { name: "refund", type: "uint256", indexed: false },
            ],
          },
          fromBlock,
          toBlock: latest,
        }),
        publicClient.getLogs({
          address: streamPaymentAddress,
          event: {
            type: "event",
            name: "PaymentSettled",
            inputs: [
              { name: "agent", type: "address", indexed: true },
              { name: "amount", type: "uint256", indexed: false },
            ],
          },
          fromBlock,
          toBlock: latest,
        }),
      ]);

      const all: TxEvent[] = [
        ...started.map((e) => ({
          type: "StreamStarted" as const,
          hash: e.transactionHash ?? "",
          blockNumber: e.blockNumber ?? 0n,
          subscriber: e.args.subscriber,
          agent: e.args.agent,
          deposit: e.args.deposit,
        })),
        ...stopped.map((e) => ({
          type: "StreamStopped" as const,
          hash: e.transactionHash ?? "",
          blockNumber: e.blockNumber ?? 0n,
          subscriber: e.args.subscriber,
          agent: e.args.agent,
          paid: e.args.paid,
          refund: e.args.refund,
        })),
        ...settled.map((e) => ({
          type: "PaymentSettled" as const,
          hash: e.transactionHash ?? "",
          blockNumber: e.blockNumber ?? 0n,
          agent: e.args.agent,
          amount: e.args.amount,
        })),
      ].sort((a, b) => Number(b.blockNumber - a.blockNumber));

      setEvents(all);
      setError(null);
    } catch (err) {
      setError("Failed to fetch events from Arc Testnet.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  const cardClass =
    "bg-white rounded-[1.5rem] border border-[rgba(226,232,240,0.65)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.05)]";

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Events", value: loading ? "—" : String(events.length) },
          {
            label: "Streams Started",
            value: loading ? "—" : String(events.filter((e) => e.type === "StreamStarted").length),
          },
          {
            label: "Streams Stopped",
            value: loading ? "—" : String(events.filter((e) => e.type === "StreamStopped").length),
          },
          { label: "Latest Block", value: lastBlock ? `#${lastBlock.toLocaleString()}` : "—" },
        ].map((stat) => (
          <div key={stat.label} className={`${cardClass} p-5`}>
            <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">{stat.label}</p>
            <p className="mt-1.5 text-2xl font-extrabold text-[#18181B] tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Events Table */}
      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Live Transaction Feed
            </span>
          </div>
          <button
            onClick={fetchEvents}
            className="rounded-xl border border-[rgba(226,232,240,0.8)] px-3 py-1.5 text-[11px] font-semibold text-[#18181B] transition hover:border-[#0084FF]/30 hover:text-[#0084FF]"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-[13px] text-slate-400">
            Reading events from Arc Testnet…
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-20 text-[13px] text-rose-500">
            {error}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[14px] text-[#71717A]">No events found in the last 5,000 blocks.</p>
            <p className="mt-2 text-[12px] text-slate-400">
              Subscribe to an agent on the Marketplace to generate your first transaction.
            </p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 text-left font-semibold">Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Block</th>
                  <th className="px-6 py-3 text-left font-semibold">Agent</th>
                  <th className="px-6 py-3 text-left font-semibold">Subscriber</th>
                  <th className="px-6 py-3 text-right font-semibold">USDC</th>
                  <th className="px-6 py-3 text-left font-semibold">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr
                    key={ev.hash + i}
                    className="border-b border-slate-50 transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">{typeBadge(ev.type)}</td>
                    <td className="px-6 py-4 font-mono text-[12px] text-slate-400">
                      #{ev.blockNumber.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-[12px] font-medium text-[#18181B]">
                      {ev.agent ? agentName(ev.agent) : "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-[12px] text-slate-400">
                      {ev.subscriber ? shortAddr(ev.subscriber) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-[12px] font-semibold text-[#18181B] tabular-nums">
                      {ev.deposit != null
                        ? `+${formatUnits(ev.deposit, 6)}`
                        : ev.paid != null
                        ? `-${formatUnits(ev.paid, 6)}`
                        : ev.amount != null
                        ? formatUnits(ev.amount, 6)
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://testnet.arcscan.app/tx/${ev.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] text-[#0084FF] hover:underline"
                      >
                        {ev.hash.slice(0, 10)}…
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
