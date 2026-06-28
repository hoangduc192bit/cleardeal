"use client";

import Link from "next/link";

const glassCard =
  "bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl";

export function DynamicStreamPanel({
  unlocked,
  data,
  error,
}: {
  unlocked: boolean;
  data: any;
  error: string | undefined;
}) {
  if (!unlocked) {
    return (
      <section className={`${glassCard} relative min-h-[360px] overflow-hidden p-7`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-5" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Live data stream</p>
        <div className="mt-6 grid gap-4 blur-sm opacity-40 pointer-events-none" aria-hidden="true">
          <div className="bg-neutral-950 rounded-xl p-4 font-mono text-[12px] text-emerald-400">
            {`{\n  "status": "encrypted",\n  "data": "[LOCKED]"\n}`}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 p-6 text-center backdrop-blur-sm">
          <div>
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mx-auto mb-4">🔒</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Data locked</p>
            <h2
              className="text-2xl font-extrabold text-neutral-900 mb-3"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              Start a stream to unlock
            </h2>
            <p className="text-[14px] text-neutral-600 mx-auto max-w-md leading-6" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
              Deposit USDC to access the real-time encrypted data stream.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${glassCard} p-7 text-red-500 text-[13px]`} style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        Live data error: {error}
      </section>
    );
  }

  if (!data) {
    return (
      <section className={`${glassCard} min-h-[360px] animate-pulse p-7 text-neutral-500 text-[13px]`} style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        Unlocking live stream…
      </section>
    );
  }

  return (
    <section className={`${glassCard} min-w-0 p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Live data stream</p>
          <h2
            className="text-xl font-extrabold text-neutral-900"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Encrypted Agent Payload
          </h2>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Decrypted &amp; Verified On-chain
        </div>
      </div>
      <div className="relative overflow-hidden bg-neutral-950 rounded-xl p-4">
        <div className="absolute right-4 top-4 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0084FF]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#0084FF]">Live Sync</span>
        </div>
        <pre
          className="relative z-10 overflow-x-auto font-mono text-[12px] leading-relaxed text-emerald-400"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data, null, 2)
              .replace(/"([^"]+)":/g, '<span style="color:#8B5CF6">"$1"</span>:')
              .replace(/: ([\d.]+)/g, ': <span style="color:#0084FF">$1</span>')
              .replace(/: "([^"]+)"/g, ': <span style="color:#059669">"$1"</span>')
          }}
        />
      </div>
    </section>
  );
}
