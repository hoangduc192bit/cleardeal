"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

export function DevCTA() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
          className="relative overflow-hidden rounded-[28px] bg-[#0f172a] px-7 sm:px-12 py-12 sm:py-16"
        >
          <div className="pointer-events-none absolute -top-32 -right-20 h-[400px] w-[400px] rounded-full bg-[#0084FF] opacity-25 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-violet-500 opacity-15 blur-[100px]" />
          <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-lg">
                Build the agent economy.
              </h2>
              <p className="mt-5 text-[15px] text-slate-300/90 leading-relaxed max-w-xl">
                List your tool on ArcStream. Agents pay you in USDC per call. 10% protocol fee. 90% to you.
                Instant on-chain settlement.
              </p>
            </div>
            <div className="glass-card rounded-3xl p-6 bg-white/95">
              <div className="text-[12px] uppercase tracking-wider font-semibold text-slate-500">
                Your cut per call
              </div>
              <div className="mt-1 font-display text-5xl font-black text-[#0084FF]">90%</div>
              <div className="mt-4 flex flex-col gap-2">
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#0084FF] text-white text-sm font-semibold shadow-brand"
                >
                  Apply for early access <ArrowRight className="h-4 w-4" />
                </motion.button>
                <Link href="/docs">
                  <motion.div
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-2xl text-slate-700 text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4" /> Read the docs
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
