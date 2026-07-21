import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";

const groups = [
  { title: "Product", links: [["Overview", "/#product"], ["How it works", "/#how-it-works"], ["Assurance", "/#security"], ["Clearing workspace", "/dashboard"]] },
  { title: "Resources", links: [["Documentation", "/docs"], ["Arc Testnet", "https://testnet.arcscan.app"], ["Circle Faucet", "https://faucet.circle.com"], ["Network status", "/arcscan"]] },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_.8fr_.8fr_1fr]">
        <div>
          <ClearDealBrand />
          <p className="mt-5 max-w-[250px] text-[13px] leading-6 text-slate-500">Shared USDC settlement for connected businesses, people, and agents.</p>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">{group.title}</p>
            <div className="mt-5 grid gap-3">
              {group.links.map(([label, href]) => href.startsWith("http") ? <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-blue-700">{label}<ExternalLink className="h-3 w-3" /></a> : <Link key={label} href={href} className="text-[12px] text-slate-500 hover:text-blue-700">{label}</Link>)}
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">Arc Testnet status</p>
          <p className="mt-4 flex items-center gap-2 text-[12px] font-medium text-slate-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Public testnet</p>
          <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-[12px] text-blue-400 hover:text-blue-300">Open ArcScan <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-5 text-[10px] leading-5 text-slate-400 sm:px-8 md:flex-row md:items-center md:justify-between">
          <p>ClearDeal is an independent product built on Arc. Arc Testnet USDC has no real-world value.</p>
          <p>© 2026 ClearDeal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
