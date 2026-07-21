"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";
import { WalletButton } from "@/components/WalletButton";

const links = [
  ["Product", "/"],
  ["How it works", "/how-it-works"],
  ["Clearing", "/dashboard"],
  ["Docs", "/docs"],
] as const;

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-[24px]">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8">
        <ClearDealBrand />
        <nav className="hidden h-full items-center gap-1 md:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return <Link key={label} href={href} className={`relative grid h-full place-items-center px-4 text-[13px] font-medium transition-colors ${active ? "text-blue-600" : "text-slate-500 hover:text-slate-950"}`}>{label}{active ? <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-blue-600" /> : null}</Link>;
          })}
        </nav>
        <div className="hidden items-center gap-2 md:flex"><WalletButton /></div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden" aria-label={open ? "Close menu" : "Open menu"}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      <AnimatePresence>
        {open ? <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="border-t border-slate-200 bg-white p-5 shadow-xl md:hidden"><nav className="grid gap-1">{links.map(([label, href]) => <Link key={label} href={href} className={`rounded-xl px-3 py-3 text-sm ${pathname === href ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>{label}</Link>)}<div className="mt-3 grid gap-2 border-t border-slate-200 pt-4"><WalletButton /></div></nav></motion.div> : null}
      </AnimatePresence>
    </header>
  );
}
