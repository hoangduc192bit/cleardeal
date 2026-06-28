import { AppNav } from "@/components/AppNav";
import { StatusLegend } from "@/components/StatusLegend";
import { X402PayPerCallPanel } from "@/components/X402PayPerCallPanel";

export default function ApiDemoPage() {
  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <AppNav />
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-20">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0084FF]" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#0084FF]">
            x402 pay-per-call
          </span>
        </div>
        <h1
          className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] leading-[1.08] text-[#18181B] max-w-4xl"
          style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
        >
          One request. One price.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #06B6D4 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            One unlocked response.
          </span>
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-[#71717A] max-w-3xl">
          This endpoint executes the x402 interaction pattern using real USDC transfers verified on Arc Testnet.
        </p>
        <div className="mt-8"><StatusLegend compact /></div>
        <div className="mt-6"><X402PayPerCallPanel /></div>
      </section>
    </main>
  );
}
