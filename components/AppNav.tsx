"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";
import { WalletButton } from "@/components/WalletButton";

const links = [
  ["Home", "/"],
  ["How it works", "/how-it-works"],
  ["Projects", "/dashboard"],
  ["Docs", "/docs"],
] as const;

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="cd-topbar fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-5 px-5 sm:px-8">
        <ClearDealBrand />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                className="cd-nav-link"
                data-active={active ? "true" : "false"}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 md:flex"><WalletButton /></div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -5, filter: "blur(2px)" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="border-t border-slate-200 bg-white/95 p-5 shadow-xl backdrop-blur-xl md:hidden"
          >
            <nav className="grid gap-1">
              {links.map(([label, href]) => {
                const active = href === "/" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={label}
                    href={href}
                    className="cd-nav-link"
                    data-active={active ? "true" : "false"}
                  >
                    {label}
                  </Link>
                );
              })}
              <div className="mt-3 grid gap-2 border-t border-slate-200 pt-4"><WalletButton /></div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
