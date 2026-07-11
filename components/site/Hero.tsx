"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { ArrowRight, Globe2, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

function Avatar({ i }: { i: number }) {
  const colors = [
    "from-[#0084FF] to-[#5BB2FF]",
    "from-sky-400 to-cyan-500",
    "from-emerald-400 to-teal-500",
  ];
  return <span className={`relative inline-block h-8 w-8 rounded-full bg-gradient-to-br ${colors[i]} ring-2 ring-white`} />;
}

export function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 20 });
  const sy = useSpring(my, { stiffness: 50, damping: 20 });
  const blob1X = useTransform(sx, (v) => v / 24);
  const blob1Y = useTransform(sy, (v) => v / 24);
  const blob2X = useTransform(sx, (v) => -v / 28);
  const blob2Y = useTransform(sy, (v) => -v / 28);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      mx.set(e.clientX - window.innerWidth / 2);
      my.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, [mx, my]);

  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pt-36 lg:pb-24">
      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        className="pointer-events-none absolute -left-24 -top-32 h-[520px] w-[520px] rounded-full bg-[#0084FF] opacity-[0.12] blur-[110px]"
      />
      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        className="pointer-events-none absolute -right-36 top-20 h-[520px] w-[520px] rounded-full bg-cyan-300 opacity-[0.14] blur-[110px]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              <Avatar i={0} />
              <Avatar i={1} />
              <Avatar i={2} />
            </div>
            <span className="text-xs font-medium text-slate-500 sm:text-[13px]">
              Circle agent wallet on Arc Testnet
            </span>
          </div>

          <h1 className="font-display text-[44px] font-black leading-[1.02] tracking-[-0.035em] text-slate-900 sm:text-[56px] lg:text-[64px]">
            Agents can pay
            <br />
            <span className="text-gradient-brand">for their own tools.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-slate-500">
            ArcStream turns Circle agent wallets into budget-aware x402 workflows. Agents discover tools,
            spend USDC on Arc, verify every receipt, and return a usable report.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/playground"
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #0084FF, #006EE6)",
                  boxShadow: "0 8px 24px rgba(0,132,255,0.32)",
                }}
              >
                Test the agent <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="#live-demo"
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white/70"
              >
                <ReceiptText className="h-4 w-4 text-[#0084FF]" /> See live receipts
              </Link>
            </motion.div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {["Circle Agent Wallet", "x402 Receipts", "Arc Chain ID 5042002", "Budget Policy"].map((t) => (
              <span key={t} className="glass-pill rounded-xl px-3 py-1.5 text-[12.5px] font-medium text-slate-700">
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.1 }}
          className="relative mx-auto aspect-square w-full max-w-[520px]"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[32px] bg-gradient-to-br from-white to-slate-100 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] ring-1 ring-black/5">
            <video
              src="https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/hero_robo_video.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          </div>

          <FloatingBadge
            className="-top-2 -right-4 sm:-right-8"
            delay={0}
            duration={3}
            color="bg-[#0084FF]"
            icon={<Sparkles className="h-4 w-4 text-white" />}
            title="Competitor Analyzer"
            sub="$0.05 USDC via x402"
          />
          <FloatingBadge
            className="bottom-10 -left-4 sm:-left-10"
            delay={0.5}
            duration={4}
            color="bg-emerald-500"
            icon={<Globe2 className="h-4 w-4 text-white" />}
            title="Web Intelligence"
            sub="$0.03 USDC fetched"
          />
          <FloatingBadge
            className="-bottom-3 right-2 sm:right-6"
            delay={1}
            duration={3.5}
            color="bg-cyan-600"
            icon={<ShieldCheck className="h-4 w-4 text-white" />}
            title="Budget enforced"
            sub="Receipts verified on Arc"
          />
        </motion.div>
      </div>
    </section>
  );
}

function FloatingBadge({
  className,
  delay,
  duration,
  color,
  icon,
  title,
  sub,
}: {
  className: string;
  delay: number;
  duration: number;
  color: string;
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration, delay, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`absolute glass-card flex min-w-[200px] items-center gap-2.5 rounded-2xl px-3 py-2.5 ${className}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color} shadow-sm`}>
        {icon}
      </span>
      <div className="leading-tight">
        <div className="text-[12.5px] font-semibold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>
    </motion.div>
  );
}
