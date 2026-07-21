"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";

const links = [
  ["Product", "#product"],
  ["How it works", "#how-it-works"],
  ["Security", "#security"],
  ["Docs", "/docs"],
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,.02)] backdrop-blur-[20px]">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <ClearDealBrand />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <Link key={label} href={href} className="rounded-lg px-2 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="hidden min-h-10 items-center rounded-lg bg-blue-600 px-5 text-[12px] font-semibold !text-white transition-colors hover:bg-blue-500 md:inline-flex">
          Open rooms
        </Link>
        <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden" aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="border-t border-slate-200 bg-white p-5 shadow-xl md:hidden">
            <nav className="grid gap-1">
              {links.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">{label}</Link>)}
              <Link href="/dashboard" onClick={() => setOpen(false)} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold !text-white">Open settlement rooms</Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
