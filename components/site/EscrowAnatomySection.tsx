import {
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  WalletCards,
} from "lucide-react";

const flow = [
  {
    icon: WalletCards,
    label: "Client",
    title: "Deposits the complete project budget",
    foot: "1,000 USDC ready",
    tone: "gold",
  },
  {
    icon: FileCheck2,
    label: "Vietnam team",
    title: "Submits one finished delivery",
    foot: "Preview + signed hash",
    tone: "mint",
  },
  {
    icon: CheckCircle2,
    label: "ClearDeal",
    title: "Releases only the approved step",
    foot: "Arc payment receipt",
    tone: "blue",
  },
] as const;

export function EscrowAnatomySection() {
  return (
    <section
      id="security"
      data-reveal
      className="reveal-on-scroll border-t border-slate-200 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="max-w-3xl">
          <h2 className="cd-heading text-4xl sm:text-5xl">
            Why Arc makes the payment flow simpler.
          </h2>
          <p className="cd-copy mt-6">
            The project budget, each release, and the network fee all use USDC.
            No second coin is needed to approve work.
          </p>
        </div>

        <div className="cd-gradient-panel relative mt-14 overflow-hidden p-5 sm:p-8 lg:p-10">
          <div
            className="cd-grid-floor pointer-events-none absolute inset-0 opacity-50"
            aria-hidden="true"
          />
          <div className="relative grid gap-3 md:grid-cols-[1fr_54px_1fr_54px_1fr] md:items-center">
            {flow.map((item, index) => (
              <div key={item.label} className="contents">
                <FlowNode {...item} />
                {index < flow.length - 1 ? (
                  <div className="grid place-items-center py-2 text-slate-400 md:py-0">
                    <ArrowDown
                      className="h-5 w-5 md:-rotate-90"
                      aria-hidden="true"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="relative mt-8 flex flex-col justify-between gap-4 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center">
            <p className="max-w-2xl text-[12px] leading-6 text-slate-600">
              Base Sepolia and Ethereum Sepolia users can bridge existing
              testnet USDC into the same wallet on Arc.
            </p>
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-700"
            >
              Verify on ArcScan <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowNode({
  icon: Icon,
  label,
  title,
  foot,
  tone,
}: {
  icon: typeof WalletCards;
  label: string;
  title: string;
  foot: string;
  tone: "gold" | "mint" | "blue";
}) {
  const toneClasses = {
    gold: "bg-amber-50 text-amber-800",
    mint: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <article className="cd-depth-card flex min-h-[230px] flex-col p-6">
      <div className="flex items-center justify-between gap-5">
        <span className="text-[11px] font-extrabold text-slate-500">
          {label}
        </span>
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.7} />
        </span>
      </div>
      <p className="mt-10 text-[15px] font-extrabold leading-6 text-slate-900">
        {title}
      </p>
      <p className="mt-auto pt-7 font-mono text-[10px] text-slate-500">
        {foot}
      </p>
    </article>
  );
}
