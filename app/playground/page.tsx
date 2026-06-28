import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ResearchAgentDemo } from "@/components/ResearchAgentDemo";
import { AppNav } from "@/components/AppNav";
import { PlaygroundWalletPanel } from "@/components/PlaygroundWalletPanel";
import { Cpu, Zap, ReceiptText } from "lucide-react";

export const metadata: Metadata = {
  title: "Agent Playground - ArcStream",
  description:
    "Watch an AI agent discover tools, pay per call via x402, and produce a research report on Arc Testnet.",
};

export default function PlaygroundPage() {
  return (
    <div
      className="relative min-h-screen bg-[#f9fafb] overflow-x-hidden"
      style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
    >
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: "0%",
            left: "5%",
            width: 700,
            height: 700,
            background:
              "radial-gradient(circle, rgba(96,177,255,0.13) 0%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: "30%",
            right: "0%",
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(49,154,255,0.10) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <AppNav />

      <main className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 pt-32 pb-24">
        {/* Page header */}
        <div className="mb-12">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#0084FF] text-[12px] font-semibold border border-blue-100 mb-5"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            <Cpu className="w-3.5 h-3.5" />
            Circle Agent Wallet - x402 - Arc
          </span>
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900 leading-tight mb-4 max-w-3xl"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Agents that pay their own way
          </h1>
          <p
            className="text-[16px] text-neutral-500 max-w-2xl leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            A Circle agent wallet autonomously pays for x402 tools in USDC on
            Arc Testnet - under a hard budget policy it cannot exceed. No human
            signing, no API keys, no subscriptions.
          </p>
        </div>

        <PlaygroundWalletPanel />

        {/* Main demo */}
        <ResearchAgentDemo />

        {/* Stats row */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <StatCard
            icon={<Zap className="w-4 h-4 text-[#0084FF]" />}
            label="Protocol"
            value="x402 - HTTP 402"
            sub="Pay-per-request, no subscriptions"
          />
          <StatCard
            icon={<Cpu className="w-4 h-4 text-emerald-500" />}
            label="Network"
            value="Arc Testnet"
            sub="Chain ID 5042002 - USDC native gas"
          />
          <StatCard
            icon={<ReceiptText className="w-4 h-4 text-violet-500" />}
            label="Settlement"
            value="<1s finality"
            sub="On-chain receipt for every tool call"
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.04)] flex gap-4 items-start"
      style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
    >
      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
          {label}
        </div>
        <div
          className="text-[18px] font-black text-neutral-900 font-mono tracking-tight"
          style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
        >
          {value}
        </div>
        <div className="text-[12px] text-neutral-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}
