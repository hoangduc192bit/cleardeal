import type { Metadata } from "next";
import { ArrowUpRight, Mail, Store } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ToolCatalogGrid } from "@/components/ToolCatalogGrid";
import { toolCatalog } from "@/lib/tool-catalog";

export const metadata: Metadata = {
  title: "Tool Catalog - ArcStream",
  description:
    "Discover paid tools that agents can call with Circle Agent Wallet payments and x402 receipts on Arc Testnet.",
};

export default function MarketplacePage() {
  const nativeCount = toolCatalog.filter((t) => t.isNative).length;

  const stats = [
    { label: "Native tools", value: String(nativeCount) },
    { label: "Protocol fee", value: "10%" },
    { label: "Payment", value: "USDC x402" },
    { label: "Network", value: "Arc Testnet" },
  ];

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#f9fafb]"
      style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
    >
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: "-5%",
            right: "5%",
            width: 650,
            height: 650,
            background:
              "radial-gradient(circle, rgba(96,177,255,0.12) 0%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "10%",
            left: "5%",
            width: 450,
            height: 450,
            background:
              "radial-gradient(circle, rgba(108,71,255,0.07) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <AppNav />

      <main className="relative z-10 mx-auto max-w-[1280px] px-4 pb-24 pt-32 sm:px-6">
        <div className="mb-12">
          <span
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-[#0084FF]"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            <Store className="h-3.5 w-3.5" />
            Agent Tool Catalog
          </span>
          <h1
            className="mb-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-neutral-900 md:text-5xl"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Paid tools for<br className="hidden md:block" /> autonomous agents.
          </h1>
          <p
            className="max-w-2xl text-[16px] leading-relaxed text-neutral-500"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Agents discover callable tools, check price and schema metadata,
            pay per call from a Circle Agent Wallet, and receive structured
            output with x402 receipt proof on Arc Testnet.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
            >
              <div
                className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                {s.label}
              </div>
              <div
                className="font-mono text-2xl font-black tracking-tight text-neutral-900"
                style={{
                  fontFamily: "var(--font-outfit, Outfit, sans-serif)",
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <ToolCatalogGrid tools={toolCatalog} />

        <div className="relative mt-16 flex flex-wrap items-start justify-between gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] md:p-10">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 80% 50%, rgba(0,132,255,0.04) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10">
            <div
              className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#0084FF]"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              For tool providers
            </div>
            <h2
              className="mb-3 max-w-xl text-2xl font-black leading-tight text-neutral-900 md:text-3xl"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              Sell your tools to budget-aware agents.
            </h2>
            <p
              className="max-w-xl text-[15px] leading-relaxed text-neutral-500"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              List your endpoint on ArcStream. Agents pay in USDC per call via
              x402, ArcStream enforces a 10% protocol fee, and every unlocked
              response can be tied back to an Arc Testnet receipt.
            </p>
          </div>
          <div className="relative z-10 flex shrink-0 flex-col gap-3">
            <div
              className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-50/60 p-5"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                Your cut per call
              </div>
              <div
                className="text-3xl font-black text-[#0084FF]"
                style={{
                  fontFamily: "var(--font-outfit, Outfit, sans-serif)",
                }}
              >
                90%
              </div>
              <div className="text-[12px] text-neutral-500">of list price</div>
            </div>
            <a
              href="mailto:hoangduc1922016@gmail.com?subject=ArcStream Provider Application"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0084FF] to-[#006EE6] px-6 text-[14px] font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              <Mail className="h-4 w-4" />
              Apply for early access
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
