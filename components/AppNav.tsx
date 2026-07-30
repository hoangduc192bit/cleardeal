"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";
import { WalletButton } from "@/components/WalletButton";

export function AppNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="cd-topbar fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-5 px-5 sm:px-8">
        <ClearDealBrand />
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
            <div className="grid gap-2"><WalletButton /></div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
