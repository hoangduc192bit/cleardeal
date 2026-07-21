"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Network } from "lucide-react";

import { AnimatedHeroHeadline } from "@/components/site/AnimatedHeroHeadline";
import { HoneyShader } from "@/components/site/HoneyShader";

const milestones = [
  ["Customer → Agency", "100 USDC", "approved"],
  ["Agency → Contractor", "90 USDC", "approved"],
  ["Contractor → Customer", "80 USDC", "approved"],
] as const;

const heroPhrases = [
  "Only the difference moves.",
  "One final balance settles.",
  "Less USDC gets locked.",
] as const;

export function Hero() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40">
      <HoneyShader opacity={0.72} />
      <div className="pointer-events-none absolute inset-0 cleardeal-grid mix-blend-multiply" aria-hidden="true" />
      <div className="relative mx-auto grid min-w-0 max-w-[1240px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20">
        <div className={`t-stagger min-w-0 ${shown ? "is-shown" : ""}`}>
          <div className="t-stagger-line t-stagger-line--1 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-800 shadow-sm backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live on Arc Testnet
            </div>
          </div>
          <AnimatedHeroHeadline
            lead="Many payments."
            phrases={heroPhrases}
            className="t-stagger-line t-stagger-line--1 max-w-[660px] font-display text-[clamp(3.15rem,6.2vw,5.75rem)] font-normal leading-[0.98] tracking-[-0.045em] text-slate-950"
            phraseClassName="text-amber-700"
          />
          <p className="t-stagger-line t-stagger-line--2 mt-7 max-w-[570px] text-[16px] leading-7 text-slate-600 sm:text-[18px] sm:leading-8">
            Put connected payments in one shared room, approve completed work, and let ClearDeal calculate the smallest final USDC transfers on Arc.
          </p>
          <div className="t-stagger-line t-stagger-line--2 mt-9">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-blue-600 px-6 text-[13px] font-semibold !text-white transition-colors hover:bg-blue-500">
                Open settlement rooms <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-6 text-[13px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700">
                See a simple example <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="honey-card relative min-w-0 overflow-hidden rounded-xl border border-amber-200/70 bg-[#fffcf0]/95 backdrop-blur-sm">
          <div className="flex h-1"><span className="w-4/5 bg-amber-400" /><span className="w-1/5 bg-emerald-500" /></div>
          <div className="flex items-start justify-between gap-6 border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-400">Settlement room #42</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl">Agency delivery network</h2>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500">Payments recorded</p>
              <strong className="mt-1 block text-xl font-semibold text-slate-950 sm:text-2xl">270 USDC</strong>
              <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700"><Check className="h-3.5 w-3.5" /> Work approved</span>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">Approved payments</p>
            <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
              {milestones.map(([title, amount, status], index) => (
                <div key={title} className="grid grid-cols-[30px_1fr_auto] items-center gap-3 px-3 py-4 sm:px-4">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-100 font-mono text-[10px] text-emerald-700">{index + 1}</span>
                  <div><p className="text-[12px] font-medium text-slate-800">{title}</p><p className="mt-1 text-[10px] capitalize text-emerald-700">{status}</p></div>
                  <span className="font-mono text-[11px] text-slate-700">{amount}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between text-[11px] font-medium text-slate-500"><span>Final USDC needed</span><span className="text-slate-800">20 USDC</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full w-[7.4%] rounded-full bg-emerald-500" /></div>
            <Link href="/dashboard?cycle=0" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[13px] font-semibold !text-white transition-colors hover:bg-blue-500"><Network className="h-4 w-4" /> View completed example</Link>
          </div>

          <div className="grid min-w-0 grid-cols-3 gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 font-mono text-[8px] uppercase leading-4 tracking-[0.1em] text-slate-500 sm:px-7 sm:text-[9px] sm:tracking-[0.12em]">
            <span>Arc Testnet</span><span className="text-center">250 USDC movement avoided</span><span className="text-right text-emerald-700">Complete</span>
          </div>
        </div>
      </div>
    </section>
  );
}
