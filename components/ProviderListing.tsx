"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { agentRegistryAddress, agentRegistryAbi } from "@/lib/contracts";

export function ProviderListing() {
  const { data: agents, isLoading } = useReadContract({
    address: agentRegistryAddress,
    abi: agentRegistryAbi,
    functionName: "getAllAgents",
    query: { refetchInterval: 15000 },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[13px] text-slate-400">
        Loading on-chain agents…
      </div>
    );
  }

  const activeAgents = (agents ?? []).filter((a) => a.isActive);

  if (activeAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] text-[#71717A]">No providers registered yet.</p>
        <p className="mt-2 text-[12px] text-slate-400">Be the first to register your data agent on-chain!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {activeAgents.map((agent, i) => (
        <div
          key={i}
          className="bg-white rounded-[1.5rem] border border-[rgba(226,232,240,0.65)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.05)] p-5 transition-all hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.1)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600">
                {agent.streamType}
              </span>
              <h3
                className="mt-2.5 font-display text-[15px] font-bold text-[#18181B]"
                style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
              >
                {agent.name}
              </h3>
              <p className="mt-1 text-[12.5px] text-[#71717A] leading-relaxed">{agent.description}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Price</p>
              <p className="mt-0.5 font-mono text-[13px] font-semibold text-emerald-600">
                {formatUnits(agent.pricePerSecond, 6)} USDC/s
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Provider</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                {agent.wallet.slice(0, 8)}...{agent.wallet.slice(-6)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
