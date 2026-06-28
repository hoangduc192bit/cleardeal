"use client";

import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function Counter({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const v = useMotionValue(0);
  const [val, setVal] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(v, to, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = v.on("change", (n) => setVal(n.toFixed(decimals)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, to, v, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}

const items = [
  { label: "Native tools", sublabel: "live on Arc Testnet", to: 5, prefix: "", suffix: "" },
  { label: "Arc Chain", sublabel: "Chain ID 5042002", to: 1, prefix: "", suffix: "" },
  { label: "Min per call", sublabel: "no subscriptions", to: 0.02, prefix: "$", suffix: "", decimals: 2 },
  { label: "Settlement", sublabel: "on-chain finality", to: 1, prefix: "<", suffix: "s" },
];

export function Stats() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Outer shell — double-bezel */}
        <div className="rounded-[2rem] bg-[#0f172a] p-[1.5px]">
          <div className="rounded-[calc(2rem-1.5px)] bg-[#0f172a] overflow-hidden">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem]">
              <div className="absolute -top-24 -left-12 h-64 w-64 rounded-full bg-[#0084FF] opacity-20 blur-[80px]" />
              <div className="absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-violet-500 opacity-15 blur-[80px]" />
            </div>

            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06]">
              {items.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-[#0f172a] px-8 py-10 sm:py-12 text-center"
                >
                  <div className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums">
                    <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={(s as any).decimals} />
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-white/70">{s.label}</div>
                  <div className="mt-1 text-[11px] text-white/35">{s.sublabel}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
