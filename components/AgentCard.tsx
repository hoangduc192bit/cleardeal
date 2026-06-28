import Link from "next/link";
import type { Address } from "viem";

export interface Agent {
  id: number;
  wallet: `0x${string}`;
  name: string;
  streamType: string;
  description: string;
  pricePerSecond: bigint;
  isActive?: boolean;
}

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article className="panel flex min-h-64 flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="label">{agent.streamType}</span>
        <span className="font-mono text-xs text-emerald-300">LIVE</span>
      </div>
      <h3 className="mt-8 text-2xl font-bold">{agent.name}</h3>
      <p className="muted mt-3 text-sm leading-6">{agent.description}</p>
      <div className="mt-auto flex items-end justify-between gap-4 pt-8">
        <div><div className="muted text-xs">Price per second</div><div className="mt-1 font-mono text-sm">{Number(agent.pricePerSecond) / 1e6} USDC</div></div>
        <Link className="button button-primary" href={`/subscribe/${agent.id}`}>Subscribe</Link>
      </div>
    </article>
  );
}
