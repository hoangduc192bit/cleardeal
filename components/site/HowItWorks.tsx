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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#0084FF]" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#0084FF]">
            How It Works
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.05 }}
          className="font-display text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-[-0.025em] leading-[1.08] text-[#18181B]"
        >
          How ArcStream <span className="text-gradient-vivid">works</span>
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

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                delay: i * 0.08,
                type: "spring",
                stiffness: 110,
                damping: 18,
              }}
              className="relative bg-white rounded-[1.5rem] p-6 border border-[rgba(226,232,240,0.7)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.05)]"
            >
              <p className="font-mono text-[11px] font-bold text-slate-300 mb-4">
                {s.num}
              </p>

              <div className="h-11 w-11 rounded-2xl bg-[#0084FF]/8 flex items-center justify-center mb-5">
                <s.Icon
                  className="h-5 w-5 text-[#0084FF]"
                  strokeWidth={1.75}
                />
              </div>

              <h3 className="font-display text-[15px] font-bold text-[#18181B] leading-snug mb-2">
                {s.title}
              </h3>
              <p className="text-[12.5px] text-[#71717A] leading-[1.65]">
                {s.sub}
              </p>

              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[2.6rem] -right-2.5 z-10">
                  <div className="h-5 w-5 rounded-full bg-white border-2 border-[#0084FF]/25 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#0084FF]/50" />
                  </div>
                </div>
              )}

              {i < steps.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.1 + 0.3,
                    ease: "easeOut",
                  }}
                  style={{ transformOrigin: "left" }}
                  className="hidden lg:block absolute top-[2.85rem] left-full w-4 h-[1.5px] bg-gradient-to-r from-[#0084FF]/30 to-transparent pointer-events-none"
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
