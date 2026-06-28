import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { StatusLegend } from "@/components/StatusLegend";

const streaming = [
  ["Deposit", "The consumer approves and deposits Arc Testnet USDC into StreamPayment."],
  ["Unlock", "Pulse Price Feed becomes available while the subscription is active."],
  ["Accrue", "The provider earns 0.0001 USDC for every second consumed."],
  ["Stop", "The user manually confirms Stop Stream in their wallet."],
  ["Settle", "The contract pays the provider and refunds unused USDC to the user."],
  ["Prove", "The final transaction is linked on ArcScan."],
];

const x402 = [
  ["Request", "The Consumer Agent calls GET /api/x402/pulse-price."],
  ["402", "The API responds with HTTP 402 Payment Required and a price."],
  ["Authorize", "The user authorizes a real USDC payment via MetaMask on Arc Testnet."],
  ["Verify", "The server checks the on-chain transaction receipt via RPC."],
  ["Unlock", "Price data, timestamp, data hash, and real receipt are returned."],
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <AppNav />
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-20">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-3.5 py-1.5 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600">
            How it works
          </span>
        </div>
        <h1
          className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] leading-[1.08] text-[#18181B] max-w-4xl"
          style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
        >
          Two simple ways for an agent to{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #06B6D4 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            buy data
          </span>
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-[#71717A] max-w-3xl">
          ArcStream combines a real time-based streaming payment with a fully on-chain x402 pay-per-call flow.
        </p>

        <div className="mt-10"><StatusLegend /></div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Flow title="A. Streaming subscription" badge="Real on Arc Testnet" steps={streaming} />
          <Flow title="B. x402 pay-per-call" badge="Real on Arc Testnet" steps={x402} />
        </div>

        <section className="bg-white rounded-[2rem] border border-[rgba(226,232,240,0.65)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.05)] mt-8 p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-6">Contract and network</p>
          <dl className="grid gap-6 text-sm md:grid-cols-2">
            <Detail label="Network" value="Arc Testnet · Chain ID 5042002" />
            <Detail label="Currency" value="Arc Testnet USDC" />
            <Detail label="StreamPayment" value="0x685D00B7821416F99B21aF31c80D3d3856e072d9" />
            <Detail label="USDC" value="0x3600000000000000000000000000000000000000" />
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-[#0084FF] text-white text-sm font-semibold hover:brightness-110 transition"
              href="/marketplace"
            >
              Explore Marketplace →
            </Link>
            <a
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-[rgba(226,232,240,0.8)] text-sm font-semibold text-[#18181B] hover:border-[#0084FF]/30 hover:text-[#0084FF] transition"
              href="https://testnet.arcscan.app/address/0x685D00B7821416F99B21aF31c80D3d3856e072d9"
              target="_blank"
            >
              Open ArcScan
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}

function Flow({ title, badge, steps }: { title: string; badge: string; steps: string[][] }) {
  return (
    <section className="bg-white rounded-[2rem] border border-[rgba(226,232,240,0.65)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.05)] p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2
          className="font-display text-xl font-extrabold tracking-tight text-[#18181B]"
          style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
        >
          {title}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {badge}
        </span>
      </div>
      <ol className="space-y-1">
        {steps.map(([stepTitle, text], index) => (
          <li className="grid grid-cols-[2rem_1fr] gap-3 py-3.5 border-t border-slate-100 first:border-t-0" key={stepTitle}>
            <span className="font-mono text-[12px] font-semibold text-[#0084FF]">0{index + 1}</span>
            <div>
              <h3 className="text-[14px] font-bold text-[#18181B]">{stepTitle}</h3>
              <p className="mt-1 text-[13px] text-[#71717A] leading-relaxed">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">{label}</dt>
      <dd className="break-all font-mono text-[12.5px] text-[#18181B]">{value}</dd>
    </div>
  );
}
