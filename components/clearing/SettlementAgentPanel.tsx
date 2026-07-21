"use client";

import { useState } from "react";
import { Bot, CheckCircle2, CircleAlert, Clipboard, Clock3, ShieldCheck } from "lucide-react";

import { formatClearingUsdc } from "@/lib/clearing-data";
import type { SettlementAgentDecision } from "@/lib/settlement-agent";

function tone(status: SettlementAgentDecision["status"]) {
  if (status === "ready") return "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200";
  if (status === "blocked") return "border-rose-400/25 bg-rose-400/[0.07] text-rose-200";
  if (status === "complete") return "border-blue-400/25 bg-blue-400/[0.07] text-blue-200";
  return "border-amber-300/25 bg-amber-300/[0.06] text-amber-100";
}

function Icon({ status }: { status: SettlementAgentDecision["status"] }) {
  if (status === "ready") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "blocked") return <CircleAlert className="h-4 w-4" />;
  if (status === "complete") return <ShieldCheck className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

export function SettlementAgentPanel({ decision }: { decision: SettlementAgentDecision }) {
  const [copied, setCopied] = useState(false);

  async function copyDecision() {
    await navigator.clipboard.writeText(JSON.stringify({
      status: decision.status,
      action: decision.action,
      amountUsdc: formatClearingUsdc(decision.amount),
      headline: decision.headline,
      rationale: decision.rationale,
      blockers: decision.blockers,
    }, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="border border-blue-400/20 bg-[#080d13] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-blue-300">
          <Bot className="h-4 w-4" />
          <p className="font-mono text-[9px] uppercase tracking-[0.14em]">Settlement agent</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${tone(decision.status)}`}>
          <Icon status={decision.status} /> {decision.status}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-white">{decision.headline}</h3>
      <p className="mt-2 text-[11px] leading-5 text-white/45">{decision.rationale}</p>
      {decision.amount > 0n ? <div className="mt-4 flex items-center justify-between border-y border-white/[0.08] py-3"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-white/30">Policy amount</span><strong className="font-mono text-[12px] text-white">{formatClearingUsdc(decision.amount)}</strong></div> : null}
      {decision.blockers.length ? <ul className="mt-4 space-y-2 text-[10px] leading-4 text-rose-200/80">{decision.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}</ul> : null}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
        <span className="text-[10px] leading-4 text-white/28">Read-only policy check. Existing wallet confirmation remains required for every transfer.</span>
        <button type="button" onClick={() => void copyDecision()} className="inline-flex shrink-0 items-center gap-1.5 border border-white/[0.12] px-2.5 py-2 text-[10px] font-semibold text-white/60 hover:text-white">
          <Clipboard className="h-3.5 w-3.5" /> {copied ? "Copied" : "Decision"}
        </button>
      </div>
    </section>
  );
}
