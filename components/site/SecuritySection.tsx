import { FileCheck2, LockKeyhole, RefreshCcw, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: LockKeyhole,
    title: "Money is prepared",
    text: "The complete project budget is deposited before work is paid step by step.",
  },
  {
    icon: ShieldCheck,
    title: "Review has a deadline",
    text: "The client can approve, request a limited revision, or dispute within the agreed review time.",
  },
  {
    icon: RefreshCcw,
    title: "Submitted work stays protected",
    text: "A refund cannot pull money away from a delivery that is already waiting for review.",
  },
  {
    icon: FileCheck2,
    title: "Proof stays connected",
    text: "Delivery notes, files, approvals, and Arc receipts remain attached to one project.",
  },
] as const;

export function SecuritySection() {
  return (
    <section
      data-reveal
      className="reveal-on-scroll border-t border-slate-200 py-24 sm:py-28"
    >
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.68fr_1.32fr]">
        <div>
          <h2 className="cd-heading max-w-[430px] text-4xl leading-[1.04] sm:text-5xl">
            Clear rules before work starts.
          </h2>
          <p className="cd-copy mt-6 max-w-[420px]">
            Both sides can see the delivery, due date, review time, and exact
            USDC payment before signing.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className={`cd-soft-panel p-7 sm:p-8 ${
                index === 0
                  ? "bg-amber-50/80"
                  : index === 2
                    ? "bg-emerald-50/70"
                    : ""
              }`}
            >
              <Icon
                className={index % 2 ? "h-6 w-6 text-blue-600" : "h-6 w-6 text-[#a66a00]"}
                strokeWidth={1.7}
              />
              <h3 className="mt-7 text-[15px] font-extrabold text-slate-950">
                {title}
              </h3>
              <p className="mt-3 text-[13px] leading-6 text-slate-600">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
