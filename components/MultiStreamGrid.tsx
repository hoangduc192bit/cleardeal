"use client";

import { streamCatalog } from "@/lib/stream-catalog";
import { demoAgents } from "@/lib/demo-agents";
import { MiniStreamCard } from "./MiniStreamCard";
import { useAccount } from "wagmi";

export function MultiStreamGrid() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return null;
  }

  return (
    <section className="mb-10 mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-5">
        Live Active Streams — Command Center
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {streamCatalog.map((stream, i) => {
          const agent = demoAgents[i];
          return <MiniStreamCard key={stream.id} agent={agent} stream={stream} />;
        })}
      </div>
    </section>
  );
}
