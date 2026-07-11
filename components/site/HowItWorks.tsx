"use client";

import { motion } from "framer-motion";
import {
  Bot,
  CreditCard,
  ListChecks,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import type { ElementType } from "react";

const steps = [
  {
    num: "01",
    Icon: Bot as ElementType,
    title: "Agent receives a job",
    sub: "The user sets a task and a maximum USDC budget.",
  },
  {
    num: "02",
    Icon: ListChecks as ElementType,
    title: "Catalog prices tools",
    sub: "ArcStream exposes paid tools with cost, endpoint, and schema metadata.",
  },
  {
    num: "03",
    Icon: ShieldCheck as ElementType,
    title: "Budget guard approves",
    sub: "The agent checks per-call and run-level limits before spending.",
  },
  {
    num: "04",
    Icon: CreditCard as ElementType,
    title: "Wallet pays x402",
    sub: "Circle Agent Wallet sends Arc Testnet USDC to unlock each tool.",
  },
  {
    num: "05",
    Icon: Receipt as ElementType,
    title: "Receipt proves access",
    sub: "The API verifies the transfer and returns a structured result with ArcScan proof.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-b from-slate-50/60 via-transparent to-transparent">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          className="font-display text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-[-0.025em] leading-[1.08] text-[#18181B]"
        >
          From task to <span className="text-gradient-brand">on-chain receipt</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-[15px] text-[#71717A] max-w-lg leading-relaxed"
        >
          Five steps from task request to verified paid tool output.
        </motion.p>

        <div className="relative mt-16">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#0084FF]/30 via-[#0084FF]/15 to-transparent hidden sm:block" />

          <div className="grid gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  delay: i * 0.06,
                  type: "spring",
                  stiffness: 110,
                  damping: 18,
                }}
                className="relative grid sm:grid-cols-[48px_1fr] gap-4 items-start"
              >
                {/* Timeline dot */}
                <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)] relative z-10">
                  <s.Icon className="h-5 w-5 text-[#0084FF]" strokeWidth={1.75} />
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[rgba(226,232,240,0.7)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_40px_-12px_rgba(0,132,255,0.12)] transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-[11px] font-bold text-[#0084FF]/60">{s.num}</span>
                    <h3 className="font-display text-[16px] font-bold text-[#18181B] leading-snug">
                      {s.title}
                    </h3>
                  </div>
                  <p className="text-[13px] text-[#71717A] leading-[1.65] sm:pl-[calc(11px+0.75rem)]">
                    {s.sub}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
