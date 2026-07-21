import type { Metadata } from "next";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { AnimatedHeroHeadline } from "@/components/site/AnimatedHeroHeadline";
import { Footer } from "@/components/site/Footer";
import { clearingHouseAddress, clearingHouseConfigured } from "@/lib/clearing-contract";
import { isDurableKvConfigured } from "@/lib/kv-rest";

export const metadata: Metadata = { title: "Arc Testnet Clearing | ClearDeal", description: "Verify ClearDeal clearing, bonds, net positions, and settlement on Arc Testnet." };

const heroPhrases = [
  "not our interface.",
  "directly on Arc.",
  "from contract evidence.",
] as const;

export default function ArcScanPage() {
  const contractUrl = clearingHouseAddress ? `https://testnet.arcscan.app/address/${clearingHouseAddress}` : "https://testnet.arcscan.app";
  return <main className="cleardeal min-h-screen bg-[#05090d] text-white"><AppNav /><section className="mx-auto max-w-[1100px] px-5 pb-24 pt-32 sm:px-8"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300">Arc Testnet clearing</p><AnimatedHeroHeadline lead="Verify the clearing state," phrases={heroPhrases} className="mt-5 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-0.055em] sm:text-6xl" phraseClassName="text-amber-300" /><p className="mt-6 max-w-2xl text-[15px] leading-7 text-white/45">ClearDeal reads obligations, bonds, verifier votes, net positions, risk passports, and settlement status from ClearDealClearingHouse. Human-readable records are accepted only when their signed payload matches the onchain hash.</p><div className="mt-12 grid gap-px border border-white/[0.09] bg-white/[0.08] md:grid-cols-3"><Status label="Network" value="Arc Testnet" state="Available" /><Status label="ClearingHouse" value={clearingHouseAddress ?? "Not configured"} state={clearingHouseConfigured ? "Configured" : "Writes disabled"} /><Status label="Evidence store" value={isDurableKvConfigured ? "Durable KV" : "Not configured"} state={isDurableKvConfigured ? "Wallet-signed" : "Creation disabled"} /></div><div className="mt-8 border border-emerald-400/18 bg-emerald-400/[0.05] p-7"><div className="flex gap-4"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-300" /><div><h2 className="text-base font-semibold">Deployment is fail-closed</h2><p className="mt-2 text-[13px] leading-6 text-white/42">If the contract or durable storage is unavailable, ClearDeal exposes the configuration error and blocks writes. No sample receipts or simulated settlement links are generated.</p><a href={contractUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 bg-white px-4 py-3 text-[12px] font-semibold text-black">Open official ArcScan <ExternalLink className="h-3.5 w-3.5" /></a></div></div></div></section><Footer /></main>;
}

function Status({ label, value, state }: { label: string; value: string; state: string }) { return <div className="min-w-0 bg-[#080d13] p-6"><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">{label}</span><strong className="mt-3 block break-all font-mono text-[10px] font-semibold">{value}</strong><span className="mt-3 block font-mono text-[8px] uppercase tracking-wider text-blue-300/70">{state}</span></div>; }
