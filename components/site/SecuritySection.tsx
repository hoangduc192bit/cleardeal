import { FileCheck2, LockKeyhole, RefreshCcw, ShieldCheck } from "lucide-react";

const features = [
  { icon: LockKeyhole, title: "Money is prepared", text: "The complete project budget is deposited before work is paid step by step." },
  { icon: ShieldCheck, title: "Client approval matters", text: "A delivery cannot pay itself. The client wallet must approve the completed step." },
  { icon: RefreshCcw, title: "Unpaid money can return", text: "The agreement includes a deadline and a path to return money that has not been paid." },
  { icon: FileCheck2, title: "Proof stays connected", text: "Delivery notes, sample files, approvals, and payment receipts remain connected to the same project." },
] as const;

export function SecuritySection() {
  return (
    <section data-reveal className="reveal-on-scroll border-t border-slate-200 bg-white py-24 sm:py-28">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <h2 className="max-w-[420px] font-display text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-5xl">Clear rules before anyone starts.</h2>
          <p className="mt-6 max-w-[400px] text-[14px] leading-7 text-slate-600">Both sides can see what must be delivered, when it is due, and how much will be paid.</p>
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
