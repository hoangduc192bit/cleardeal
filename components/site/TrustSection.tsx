import { Check, LockKeyhole } from "lucide-react";

const clientPoints = [
  "Time to review every delivery",
  "Limited revision requests",
  "Disputes pause only one step",
];
const teamPoints = [
  "Full budget is prepared",
  "Silence cannot block payment forever",
  "Delivery proof stays attached",
];

export function TrustSection() {
  return (
    <section
      id="product"
      data-reveal
      className="reveal-on-scroll border-t border-slate-200 py-24 sm:py-28"
    >
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.68fr_1.32fr] lg:items-center">
        <div>
          <h2 className="cd-heading max-w-[460px] text-4xl leading-[1.04] sm:text-5xl">
            Neither side takes the first risk.
          </h2>
          <p className="cd-copy mt-6 max-w-[470px]">
            The client does not pay everything before seeing the work. The team
            does not start with only a promise.
          </p>
        </div>

        <div className="cd-gradient-panel relative grid gap-4 overflow-hidden p-4 sm:grid-cols-2 sm:p-6">
          <div
            className="cd-grid-floor pointer-events-none absolute inset-0 opacity-50"
            aria-hidden="true"
          />
          <TrustList title="Client control" points={clientPoints} />
          <TrustList title="Team confidence" points={teamPoints} />
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-white bg-white text-emerald-700 shadow-xl sm:grid">
            <LockKeyhole className="h-7 w-7" strokeWidth={1.7} />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustList({
  title,
  points,
}: {
  title: string;
  points: readonly string[];
}) {
  return (
    <div className="relative rounded-2xl border border-white/90 bg-white/[0.82] p-6 shadow-[0_14px_34px_rgba(30,55,82,.09)] backdrop-blur-sm">
      <p className="text-sm font-extrabold text-slate-900">{title}</p>
      <ul className="mt-5 space-y-4">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-center gap-3 text-[13px] text-slate-600"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-3.5 w-3.5" />
            </span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
