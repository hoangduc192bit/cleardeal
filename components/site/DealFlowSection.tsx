import { Check, FileText, Network } from "lucide-react";

const steps = [
  { number: "01", icon: FileText, title: "Record connected payments", text: "Add who should pay whom, what work is expected, the USDC amount, and the deadline." },
  { number: "02", icon: Check, title: "Approve completed work", text: "Providers submit proof and independent reviewers approve or reject it against clear rules." },
  { number: "03", icon: Network, title: "Pay only final balances", text: "ClearDeal offsets approved payments and moves only the remaining USDC difference on Arc." },
] as const;

export function DealFlowSection() {
  return (
    <section id="how-it-works" data-reveal className="reveal-on-scroll border-t border-slate-200 py-24 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <p className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Three clear steps</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-center font-display text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
          Record every payment. Move only the difference.
        </h2>
        <div className="mt-16 grid gap-10 lg:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, text }, index) => (
            <div key={title} className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_12px_30px_rgba(15,23,42,.04)]">
              {index < steps.length - 1 ? <span className="absolute -right-5 top-[-1px] hidden h-px w-10 bg-blue-500/70 lg:block" /> : null}
              <div className="flex items-start justify-between gap-6">
                <span className="font-mono text-4xl font-semibold text-blue-500">{number}</span>
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
              </div>
              <h3 className="mt-8 text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-3 max-w-[330px] text-[14px] leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
