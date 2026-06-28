import Link from "next/link";
import { Bot } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Tools" },
  { href: "/playground", label: "Playground" },
  { href: "/docs", label: "Docs" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-slate-200/70 py-12">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0084FF] shadow-brand">
            <Bot className="h-5 w-5 text-white" />
          </span>
          <div>
            <div className="font-display font-extrabold text-slate-900">ArcStream</div>
            <div className="text-[12.5px] text-slate-500">Agent wallet workflows on Arc Testnet</div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[13px] font-medium text-slate-600 transition hover:text-[#0084FF]">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-500">Chain ID: 5042002</span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-500">x402 Protocol</span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-500">Circle Wallet</span>
        </div>
      </div>
    </footer>
  );
}
