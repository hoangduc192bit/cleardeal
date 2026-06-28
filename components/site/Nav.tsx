"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Bot, Menu, Play, X } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Tools" },
  { href: "/playground", label: "Tester Playground" },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 110, damping: 18 }}
        className="fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4"
      >
        <nav
          className={`glass-pill flex items-center gap-1 rounded-2xl py-2 pl-3 pr-2 transition-shadow duration-300 sm:gap-2 sm:pl-4 ${
            scrolled ? "shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)]" : "shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
          }`}
        >
          <Link href="/" className="group flex items-center gap-2 pl-1 pr-2 sm:pr-3">
            <span
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #0084FF, #006EE6)", boxShadow: "0 6px 16px rgba(0,132,255,0.35)" }}
            >
              <Bot className="h-4 w-4 text-white" strokeWidth={2.5} />
            </span>
            <span className="font-display text-[17px] font-extrabold tracking-tight text-slate-900">ArcStream</span>
          </Link>

          <div className="mx-1 hidden items-center gap-0.5 md:flex">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <motion.div key={l.href} whileTap={{ scale: 0.96 }}>
                  <Link
                    href={l.href}
                    className={`relative rounded-lg px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                      active ? "text-[#0084FF]" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {l.label}
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full bg-[#0084FF]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className="ml-1 hidden md:flex">
            <Link
              href="/playground"
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #0084FF, #006EE6)", boxShadow: "0 4px 14px rgba(0,132,255,0.35)" }}
            >
              <Play className="h-3.5 w-3.5" /> Test Agent
            </Link>
          </motion.div>

          <button
            onClick={() => setOpen(true)}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-white/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0084FF]">
                  <Bot className="h-4 w-4 text-white" />
                </span>
                <span className="font-display text-lg font-extrabold">ArcStream</span>
              </div>
              <button onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-full max-w-sm"
                >
                  <Link href={l.href} onClick={() => setOpen(false)} className="block w-full py-4 text-center font-display text-2xl font-bold text-slate-900">
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <Link
                href="/playground"
                onClick={() => setOpen(false)}
                className="mt-6 w-full max-w-sm rounded-2xl bg-[#0084FF] px-4 py-3 text-center text-sm font-semibold text-white shadow-brand"
              >
                Test Agent
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
