import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { ArcScanExplorer } from "@/components/ArcScanExplorer";

export const metadata: Metadata = {
  title: "ArcScan - Transaction Explorer | ArcStream",
  description:
    "Explore real on-chain transactions on the ArcStream protocol. View all StreamStarted, StreamStopped, and PaymentSettled events on Arc Testnet.",
};

export default function ArcScanPage() {
  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <AppNav />
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-20">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-emerald-600">
              Arc Testnet · Live
            </span>
          </div>
          <h1
            className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-[#18181B]"
            style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
          >
            ArcScan Explorer
          </h1>
          <p className="mt-4 max-w-xl text-[15px] text-[#71717A] leading-relaxed">
            Real-time on-chain transaction feed for the ArcStream protocol. Every stream started, stopped, and USDC payment settled is recorded immutably on Arc Testnet.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <a
              href="https://testnet.arcscan.app/address/0x685D00B7821416F99B21aF31c80D3d3856e072d9"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[rgba(226,232,240,0.8)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#18181B] transition hover:border-[#0084FF]/30 hover:text-[#0084FF]"
            >
              StreamPayment Contract →
            </a>
            <a
              href="https://testnet.arcscan.app/address/0xd3624284C138E537465ED99bB1C79eaB9a6Ce140"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[rgba(226,232,240,0.8)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#18181B] transition hover:border-[#0084FF]/30 hover:text-[#0084FF]"
            >
              AgentRegistry Contract →
            </a>
          </div>
        </div>
        <ArcScanExplorer />
      </section>
    </main>
  );
}
