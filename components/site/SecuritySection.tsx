import { FileCheck2, LockKeyhole, RefreshCcw, ShieldCheck } from "lucide-react";

const features = [
  { icon: LockKeyhole, title: "Performance bonds", text: "Providers put USDC behind their promise. Failed outcomes slash the posted bond to the payer." },
  { icon: ShieldCheck, title: "Independent quorum", text: "Economic participants cannot serve as verifiers in the same clearing cycle." },
  { icon: RefreshCcw, title: "Fail-closed deadlines", text: "Missing evidence fails the obligation; missing debtor funding defaults the cycle without trapping deposits." },
  { icon: FileCheck2, title: "Risk passports", text: "Passes, failures, slashed bonds, funding, and defaults are derived from settled onchain outcomes." },
] as const;

export function SecuritySection() {
  return (
    <section data-reveal className="reveal-on-scroll border-t border-slate-200 bg-white py-24 sm:py-28">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Built for accountability</p>
          <h2 className="max-w-[420px] font-display text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-5xl">Commercial trust with financial consequences.</h2>
          <p className="mt-6 max-w-[400px] text-[14px] leading-7 text-slate-600">Verification changes balances. Defaults change risk history. Every claim can be audited.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-7 sm:p-8">
              <Icon className="h-6 w-6 text-blue-400" strokeWidth={1.5} />
              <h3 className="mt-7 text-[15px] font-semibold text-slate-950">{title}</h3>
              <p className="mt-3 text-[13px] leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
