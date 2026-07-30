import { Check, FileText, WalletCards } from "lucide-react";

const steps = [
  {
    verb: "Prepare",
    icon: WalletCards,
    title: "Lock the project budget",
    text: "The client deposits the complete USDC budget once. The team can verify that payment is ready.",
    className: "lg:col-span-5 lg:row-span-2",
    visual: "from-amber-100 via-white to-white",
  },
  {
    verb: "Deliver",
    icon: FileText,
    title: "Submit one finished step",
    text: "The team adds a delivery note and protected sample files for review.",
    className: "lg:col-span-7",
    visual: "from-emerald-100/80 via-white to-white",
  },
  {
    verb: "Release",
    icon: Check,
    title: "Review, then move USDC",
    text: "Approve, request a bounded revision, or dispute. No objection before the timer ends unlocks payment.",
    className: "lg:col-span-7",
    visual: "from-blue-100/70 via-white to-white",
  },
] as const;

export function DealFlowSection() {
  return (
    <section
      id="how-it-works"
      data-reveal
      className="reveal-on-scroll border-t border-slate-200 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="max-w-3xl">
          <h2 className="cd-heading text-4xl sm:text-5xl">
            One project. Three clear actions.
          </h2>
          <p className="cd-copy mt-5">
            The budget, delivery proof, review clock, and payment receipt stay
            connected from start to finish.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-12 lg:grid-rows-2">
          {steps.map(({ verb, icon: Icon, title, text, className, visual }) => (
            <article
              key={title}
              className={`cd-depth-card group overflow-hidden bg-gradient-to-br p-7 sm:p-8 ${visual} ${className}`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-sm font-extrabold text-slate-500">
                    {verb}
                  </span>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white bg-white/80 text-[#a66a00] shadow-sm">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                </div>
                <div className="mt-auto pt-12 lg:pt-16">
                  <h3 className="text-xl font-extrabold tracking-[-0.025em] text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-[520px] text-[14px] leading-6 text-slate-600">
                    {text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
