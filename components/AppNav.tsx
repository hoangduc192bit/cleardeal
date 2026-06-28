"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Menu, X } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { AddNetworkButton } from "@/components/AddNetworkButton";

const NAV_LINKS = [
  ["Home", "/"],
  ["Tools", "/marketplace"],
  ["Tester Playground", "/playground"],
] as const;

export function AppNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-[1280px] pointer-events-auto transition-all duration-300 ${
            scrolled
              ? "bg-white/90 backdrop-blur-[30px] shadow-lg shadow-black/5 border border-black/8 rounded-[18px]"
              : "bg-white/70 backdrop-blur-[20px] shadow-sm border border-black/6 rounded-[18px]"
          }`}
        >
          <div className="flex items-center justify-between gap-6 px-5 py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 select-none group shrink-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #0084FF, #0055CC)",
                  boxShadow: "0 4px 12px rgba(0,132,255,0.3)",
                }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-[20px] font-extrabold tracking-tight text-black"
                style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
              >
                ArcStream
              </span>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map(([label, href]) => {
                const isActive =
                  pathname === href ||
                  (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`text-[14px] font-medium transition-colors ${
                      isActive
                        ? "text-[#0084FF] font-semibold"
                        : "text-black/60 hover:text-black"
                    }`}
                    style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <AddNetworkButton />
              <WalletButton />
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-black/5 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-black" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 z-[100] w-[280px] bg-white/95 backdrop-blur-[40px] border-l border-black/10 p-6 flex flex-col gap-6 shadow-2xl"
        >
          <button
            className="self-end p-2 rounded-xl hover:bg-black/5 transition-colors"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-black" />
          </button>
          {NAV_LINKS.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="text-[18px] font-semibold text-black/80 hover:text-black transition-colors"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              {label}
            </Link>
          ))}
          <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-black/10">
            <AddNetworkButton />
            <WalletButton />
          </div>
        </motion.div>
      )}
    </>
  );
}
