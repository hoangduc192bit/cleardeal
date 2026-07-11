"use client";

import { ReactNode, useState } from "react";
import { ResearchAgentDemo } from "@/components/ResearchAgentDemo";
import { CircleMarketplaceOrchestrator } from "@/components/CircleMarketplaceOrchestrator";
import { AppNav } from "@/components/AppNav";
import { PlaygroundWalletPanel } from "@/components/PlaygroundWalletPanel";
import { Cpu, Zap, ReceiptText, Sliders } from "lucide-react";

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState<"manage" | "run" | "services">("manage");

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
        <div className="mb-10">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#0084FF] text-[12px] font-semibold border border-blue-100 mb-5"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            <Cpu className="w-3.5 h-3.5" />
            Circle Agent Wallet · x402 · Arc
          </span>
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900 leading-tight mb-4 max-w-3xl"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Agents that pay for their own tools
          </h1>
          <p
            className="text-[16px] text-neutral-500 max-w-2xl leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Each Agent has its own wallet, pays USDC on Arc Testnet to unlock x402 tools, and stays under a hard spending policy before any payment is made.
          </p>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="flex p-1.5 bg-neutral-100/90 border border-neutral-200/50 rounded-2xl max-w-[680px] mb-8 gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "manage"
                ? "bg-white text-[#0084FF] shadow-sm border border-neutral-200/20"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
            type="button"
          >
            <Sliders className="w-4 h-4" />
            1. Create Agent
          </button>
          <button
            onClick={() => setActiveTab("run")}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "run"
                ? "bg-white text-[#0084FF] shadow-sm border border-neutral-200/20"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
            type="button"
          >
            <Zap className="w-4 h-4" />
            2. Run Arc Demo
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "services"
                ? "bg-white text-[#0084FF] shadow-sm border border-neutral-200/20"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
            type="button"
          >
            <ReceiptText className="w-4 h-4" />
            3. Circle Marketplace (Coming Soon)
          </button>
        </div>

        {/* Conditional Content Rendering */}
        <div className="transition-all duration-300">
          {activeTab === "manage" ? (
            <PlaygroundWalletPanel />
          ) : activeTab === "run" ? (
            <ResearchAgentDemo />
          ) : (
            <CircleMarketplaceOrchestrator />
          )}
        </div>

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
