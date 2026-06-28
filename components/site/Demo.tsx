"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";

import { ResearchAgentDemo } from "@/components/ResearchAgentDemo";

const facts = [
  {
    icon: WalletCards,
    label: "Agent wallet",
    value: "Circle controlled",
    detail: "Pays from the server-side agent wallet on Arc Testnet.",
  },
  {
    icon: ShieldCheck,
    label: "Budget guard",
    value: "$0.50 max",
    detail: "Every tool call is checked before USDC leaves the wallet.",
  },
  {
    icon: ReceiptText,
    label: "Proof",
    value: "ArcScan tx",
    detail: "Each successful tool call links to its on-chain receipt.",
  },
];

export function Demo() {
  return (
    <section id="live-demo" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-4 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-[#0084FF]"
            >
              Live agent payment demo
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              className="font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.025em] text-[#18181B] sm:text-5xl"
            >
              Run an agent that pays for its own tools.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 }}
              className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#71717A]"
            >
              This is the product demo: the research agent discovers paid tools, spends from the Circle agent wallet,
              verifies x402 receipts on Arc, and returns a report without a human signing each transaction.
            </motion.p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)]">
                <fact.icon className="mb-3 h-4 w-4 text-[#0084FF]" />
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{fact.label}</div>
                <div className="mt-1 font-display text-[17px] font-extrabold text-slate-900">{fact.value}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{fact.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <ResearchAgentDemo />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)]">
          <div>
            <div className="font-display text-[18px] font-extrabold text-slate-900">Ready for testers</div>
            <p className="mt-1 text-[13px] text-slate-500">
              Use the full playground when you want a focused test surface with status, receipts, and budget telemetry.
            </p>
          </div>
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0084FF] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_10px_28px_-12px_rgba(0,132,255,0.8)] transition hover:brightness-110"
          >
            Open tester playground <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
