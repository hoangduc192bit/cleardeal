import Link from "next/link";
import { ArrowRight, FolderKanban, ShieldCheck } from "lucide-react";

export function FinalCTA() {
  return (
    <section
      data-reveal
      className="reveal-on-scroll border-t border-slate-200 px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="cd-gradient-panel relative mx-auto grid max-w-[1100px] gap-10 overflow-hidden px-6 py-12 sm:px-10 lg:grid-cols-[1fr_320px] lg:items-center lg:px-14 lg:py-14">
        <div
          className="cd-grid-floor pointer-events-none absolute inset-0 opacity-45"
          aria-hidden="true"
        />
        <div className="relative">
          <h2 className="cd-heading text-4xl sm:text-5xl">
            Start with a complete sample project.
          </h2>
          <p className="cd-copy mt-5 max-w-[570px]">
            Explore a 1,000 USDC website project split into design, build, and
            source handoff.
          </p>
          <Link href="/dashboard" className="cd-button-primary mt-8">
            Open ClearDeal <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative grid gap-3">
          <SummaryLine
            icon={FolderKanban}
            label="Three project milestones"
          />
          <SummaryLine
            icon={ShieldCheck}
            label="Protected USDC on Arc Testnet"
          />
        </div>
      </div>
    </section>
  );
}

function SummaryLine({
  icon: Icon,
  label,
}: {
  icon: typeof FolderKanban;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-800">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <p className="text-[12px] font-bold text-slate-700">{label}</p>
    </div>
  );
}
