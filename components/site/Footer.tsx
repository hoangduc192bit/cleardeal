import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";

const groups = [
  {
    title: "Product",
    links: [
      ["Overview", "/#product"],
      ["How it works", "/how-it-works"],
      ["Project workspace", "/dashboard"],
      ["Clearing room", "/clearing"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Documentation", "/docs"],
      ["Arc explorer", "/arcscan"],
      ["Circle Faucet", "https://faucet.circle.com"],
      ["Official ArcScan", "https://testnet.arcscan.app"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/[0.76] backdrop-blur-sm">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_.8fr_.8fr_1fr]">
        <div>
          <ClearDealBrand />
          <p className="mt-5 max-w-[290px] text-[13px] leading-6 text-slate-500">
            Step-by-step USDC project payments for international clients and
            Vietnamese teams.
          </p>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] font-extrabold text-slate-700">
              {group.title}
            </p>
            <div className="mt-5 grid gap-2">
              {group.links.map(([label, href]) =>
                href.startsWith("http") ? (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center gap-1.5 text-[12px] text-slate-500 hover:text-blue-700"
                  >
                    {label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Link
                    key={label}
                    href={href}
                    className="inline-flex min-h-9 items-center text-[12px] text-slate-500 hover:text-blue-700"
                  >
                    {label}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
        <div className="cd-soft-panel p-5">
          <p className="text-[11px] font-extrabold text-slate-700">
            Arc Testnet
          </p>
          <p className="mt-4 flex items-center gap-2 text-[12px] font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Public testnet ready
          </p>
          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-10 items-center gap-2 text-[12px] font-bold text-blue-700"
          >
            Open ArcScan <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-5 text-[10px] leading-5 text-slate-400 sm:px-8 md:flex-row md:items-center md:justify-between">
          <p>
            ClearDeal is an independent product built on Arc. Testnet USDC has
            no real-world value.
          </p>
          <p>Copyright 2026 ClearDeal.</p>
        </div>
      </div>
    </footer>
  );
}
