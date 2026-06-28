"use client";
// v2
import { motion } from "framer-motion";
import { Plug, CreditCard, Search } from "lucide-react";

const problems = [
  {
    num: "01",
    Icon: Plug,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    tag: "Discovery",
    title: "Tools are siloed",
    body: "Each AI tool requires separate API keys, billing accounts, and integration work. Agents can't discover or pay for tools autonomously.",
    stat: "100+ platforms",
    statSub: "each requiring separate auth",
  },
  {
    num: "02",
    Icon: CreditCard,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    tag: "Economics",
    title: "No micro-payments",
    body: "Existing payment rails charge minimums that make per-call billing economically impossible. Agents need $0.02 payments, not $29/mo subscriptions.",
    stat: "$29/mo minimum",
    statSub: "vs $0.02 per call needed",
  },
  {
    num: "03",
    Icon: Search,
    iconBg: "bg-blue-50",
    iconColor: "text-[#0084FF]",
    tag: "Auditability",
    title: "No verifiable receipts",
    body: "When an agent calls a tool, there's no on-chain proof. No audit trail. No way to verify spend or detect manipulation.",
    stat: "0 proofs",
    statSub: "zero on-chain verification today",
  },
];

const hoverSpring = { type: "spring" as const, stiffness: 300, damping: 22 };

function ProblemCard({
  p,
  big,
  delay,
}: {
  p: (typeof problems)[number];
  big?: boolean;
  delay?: number;
}) {
  const Icon = p.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, transition: hoverSpring }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ type: "spring", stiffness: 100, damping: 18, delay: delay ?? 0 }}
      className={`bg-white rounded-[2rem] border border-[rgba(226,232,240,0.65)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] flex flex-col justify-between ${
        big ? "p-8 sm:p-10 min-h-[340px]" : "p-7 flex-1"
      }`}
    >
      <div>
        <div className={`flex items-start justify-between ${big ? "mb-8" : "mb-5"}`}>
          <span className={`inline-flex items-center justify-center rounded-2xl ${big ? "h-12 w-12" : "h-10 w-10"} ${p.iconBg}`}>
            <Icon className={`${big ? "h-5 w-5" : "h-4 w-4"} ${p.iconColor}`} strokeWidth={1.75} />
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-200 select-none">{p.num}</span>
        </div>
        <p className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-slate-400 mb-1.5">
          {p.tag}
        </p>
        <h3
          className={`font-display font-extrabold text-[#18181B] tracking-tight leading-snug ${
            big ? "text-[26px] sm:text-3xl" : "text-[17px]"
          }`}
        >
          {p.title}
        </h3>
        <p className={`leading-[1.72] text-[#71717A] ${big ? "mt-4 text-[15px]" : "mt-3 text-[13.5px]"}`}>
          {p.body}
        </p>
      </div>
      <div className={`border-t border-slate-100 flex items-baseline gap-2 ${big ? "mt-8 pt-6" : "mt-5 pt-4"}`}>
        <span className={`font-display font-extrabold text-[#18181B] ${big ? "text-xl" : "text-base"}`}>
          {p.stat}
        </span>
        <span className="text-[11px] text-slate-400">{p.statSub}</span>
      </div>
    </motion.div>
  );
}

export function Problem() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-100 px-3.5 py-1.5 mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-rose-500">
            The Problem
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.05 }}
          className="font-display text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-[-0.025em] leading-[1.08] text-[#18181B] max-w-2xl"
        >
          The agent economy has{" "}
          <span className="text-gradient-vivid">no infrastructure</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-[15px] leading-relaxed text-[#71717A] max-w-lg"
        >
          Three structural gaps stop autonomous agents from using paid tools at scale.
        </motion.p>

        {/* Magazine bento: left tall (2fr) + right stacked (1fr) */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5">
          <ProblemCard p={problems[0]} big delay={0} />
          <div className="flex flex-col gap-5">
            <ProblemCard p={problems[1]} delay={0.1} />
            <ProblemCard p={problems[2]} delay={0.2} />
          </div>
        </div>
      </div>
    </section>
  );
}
