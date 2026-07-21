import { Check, LockKeyhole } from "lucide-react";

const clientPoints = ["Bound agent mandate", "Maximum loss defined", "Net debtor position"];
const agencyPoints = ["Performance bond", "Verifier-backed outcome", "Portable risk passport"];

export function TrustSection() {
  return (
    <section id="product" data-reveal className="reveal-on-scroll border-t border-slate-200 bg-white py-24 sm:py-28">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
        <div>
          <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Why clearing matters</p>
          <h2 className="max-w-[420px] font-display text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-5xl">
            Agents can pay. They still cannot clear risk.
          </h2>
          <p className="mt-6 max-w-[460px] text-[15px] leading-7 text-slate-600">
            Raw payments do not prove authorization, service quality, liability, or final obligation. ClearDeal turns an execution graph into verified, bonded, net-settled commercial state.
          </p>
        </div>

        <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto_1fr]">
          <TrustList title="Principal control" points={clientPoints} tone="blue" />
          <div className="hidden items-center gap-3 sm:flex" aria-hidden="true">
            <span className="h-px w-8 border-t border-dashed border-slate-300" />
            <span className="grid h-16 w-16 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm">
              <LockKeyhole className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <span className="h-px w-8 border-t border-dashed border-slate-300" />
          </div>
          <TrustList title="Provider assurance" points={agencyPoints} tone="green" />
        </div>
      </div>
    </section>
  );
}

function TrustList({ title, points, tone }: { title: string; points: readonly string[]; tone: "blue" | "green" }) {
  const color = tone === "blue" ? "text-blue-400" : "text-emerald-300";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,.05)]">
      <p className={`font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${color}`}>{title}</p>
      <ul className="mt-5 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-3 text-[13px] text-slate-600">
            <span className={`grid h-5 w-5 place-items-center rounded-full border border-current ${color}`}><Check className="h-3 w-3" /></span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
