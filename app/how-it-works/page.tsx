import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { AnimatedHeroHeadline } from "@/components/site/AnimatedHeroHeadline";
import { Footer } from "@/components/site/Footer";

const steps = [
  ["01", "Commit the obligation graph", "A participant creates a cycle with economic wallets, independent verifiers, an arbitrator, outcome specifications, payment amounts, and performance bonds."],
  ["02", "Providers post assurance", "Each provider approves and posts its USDC performance bond before submitting a wallet-signed public evidence reference."],
  ["03", "Independent wallets verify", "Verifier wallets vote pass or fail. The configured quorum finalizes normal outcomes; the arbitrator can break a deadlock."],
  ["04", "Clear the graph", "Passed obligations become signed debit and credit positions. Failed obligations are removed and posted bonds are slashed to their payer."],
  ["05", "Settle only the net", "Net debtors fund the calculated difference. One settlement transaction pays all net creditors, returns successful bonds, and updates risk passports."],
] as const;

const heroPhrases = [
  "cleared USDC obligations.",
  "verified commercial outcomes.",
  "minimum final settlement.",
] as const;

export default function HowItWorksPage() {
  return <main className="cleardeal min-h-screen bg-[#05090d] text-white"><AppNav /><section className="mx-auto max-w-[1240px] px-5 pb-24 pt-32 sm:px-8"><header className="grid gap-8 border-b border-white/[0.09] pb-12 lg:grid-cols-[1.2fr_.8fr] lg:items-end"><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-blue-400">How it works</p><AnimatedHeroHeadline lead="From agent promises to" phrases={heroPhrases} className="mt-5 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-0.055em] sm:text-6xl" phraseClassName="text-amber-300" /></div><p className="max-w-lg text-[15px] leading-7 text-white/45">ClearDeal separates authorization, verification, clearing, and settlement so a raw payment is never mistaken for a valid commercial outcome.</p></header><div className="mt-14 border-y border-white/[0.09]">{steps.map(([number,title,description]) => <article key={number} className="grid gap-5 border-b border-white/[0.08] py-7 last:border-0 md:grid-cols-[70px_260px_1fr] md:items-start"><span className="font-mono text-[10px] text-blue-400">{number}</span><h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2><p className="max-w-2xl text-[13px] leading-6 text-white/42">{description}</p></article>)}</div><section className="mt-16 grid gap-px overflow-hidden border border-white/[0.09] bg-white/[0.08] md:grid-cols-3"><Principle title="Fail-closed outcomes" text="Missing bonds, evidence, or quorum cannot create a payable obligation." /><Principle title="Capital efficiency" text="A circular 270 USDC graph can require only 20 USDC of final settlement liquidity." /><Principle title="Accountable risk" text="Passed outcomes, slashed bonds, funded cycles, and settlement defaults update an onchain passport." /></section><section className="mt-16 flex flex-col justify-between gap-6 border border-blue-400/20 bg-blue-500/[0.07] p-7 md:flex-row md:items-center"><div><h2 className="text-xl font-semibold">Run a complete clearing cycle.</h2><p className="mt-2 text-[13px] text-white/42">Use separate Arc Testnet wallets for participants, verifiers, and arbitrator. Faucet USDC has no real-world value.</p></div><div className="flex flex-wrap gap-3"><Link href="/dashboard" className="bg-blue-600 px-5 py-3 text-[12px] font-semibold hover:bg-blue-500">Open clearing</Link><Link href="/docs" className="border border-white/[0.12] px-5 py-3 text-[12px] font-semibold text-white/65">Protocol docs</Link></div></section></section><Footer /></main>;
}

function Principle({ title, text }: { title: string; text: string }) { return <article className="bg-[#080d13] p-6"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-3 text-[12px] leading-6 text-white/38">{text}</p></article>; }
