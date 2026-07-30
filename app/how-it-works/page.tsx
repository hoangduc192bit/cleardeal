import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  HandCoins,
  Scale,
  WalletCards,
} from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { Footer } from "@/components/site/Footer";

const steps = [
  {
    verb: "Agree",
    icon: FileCheck2,
    title: "Define every delivery",
    description:
      "The client and team agree on the output, payment, due date, and approval rule.",
  },
  {
    verb: "Prepare",
    icon: WalletCards,
    title: "Deposit the budget",
    description:
      "The full project USDC is ready before the team starts working.",
  },
  {
    verb: "Submit",
    icon: HandCoins,
    title: "Share one delivery",
    description:
      "The team adds a clear note and protected files for review.",
  },
  {
    verb: "Review",
    icon: CheckCircle2,
    title: "Approve or respond",
    description:
      "The client approves, requests a bounded revision, or opens a dispute.",
  },
  {
    verb: "Resolve",
    icon: Scale,
    title: "Release the right amount",
    description:
      "Only the matching delivery is paid, refunded, or independently resolved.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main
      id="main-content"
      className="cleardeal cd-page-shell cd-page-enter min-h-[100dvh] text-[#111827]"
    >
      <AppNav />
      <section className="mx-auto max-w-[1240px] px-5 pb-24 pt-32 sm:px-8">
        <header className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white/80 px-6 py-10 shadow-[0_26px_70px_rgba(30,55,82,.10)] sm:px-10 sm:py-14 lg:px-14">
          <div
            className="cd-grid-floor pointer-events-none absolute inset-0 opacity-50"
            aria-hidden="true"
          />
          <div className="relative max-w-4xl">
            <p className="cd-kicker">ClearDeal workflow</p>
            <h1 className="cd-heading mt-5 max-w-4xl text-5xl leading-[.98] sm:text-6xl">
              From prepared money to protected delivery.
            </h1>
            <p className="cd-copy mt-6 max-w-2xl">
              Every project moves through the same visible states, so both sides
              always know what happens next.
            </p>
          </div>
        </header>

        <section className="mt-14" aria-labelledby="workflow-title">
          <h2 id="workflow-title" className="sr-only">
            Project workflow
          </h2>
          <div className="grid gap-3 lg:grid-cols-[1fr_42px_1fr_42px_1fr_42px_1fr_42px_1fr] lg:items-stretch">
            {steps.map(
              ({ verb, icon: Icon, title, description }, index) => (
                <div key={verb} className="contents">
                  <article className="cd-depth-card flex min-h-[224px] flex-col p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] font-extrabold text-slate-500">
                        {verb}
                      </span>
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
                        <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                      </span>
                    </div>
                    <h3 className="mt-9 text-[15px] font-extrabold leading-5 text-slate-900">
                      {title}
                    </h3>
                    <p className="mt-3 text-[12px] leading-5 text-slate-600">
                      {description}
                    </p>
                    <span className="mt-auto pt-7 font-mono text-[9px] text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </article>
                  {index < steps.length - 1 ? (
                    <div className="grid place-items-center py-1 text-slate-400 lg:py-0">
                      <ArrowDown
                        className="h-5 w-5 lg:-rotate-90"
                        aria-hidden="true"
                      />
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-2">
          <article className="cd-gradient-panel p-7 md:col-span-2 md:grid md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-10 md:p-10">
            <h2 className="cd-heading text-3xl">Both sides see the same truth.</h2>
            <p className="cd-copy mt-4 md:mt-0">
              The signed delivery, review deadline, decision, and USDC receipt
              stay attached to one project instead of living across chat,
              spreadsheets, and wallet history.
            </p>
          </article>
          <Principle
            title="Client protection"
            text="Approve, request a bounded revision, or pause only the disputed delivery."
          />
          <Principle
            title="Team protection"
            text="The budget is visible and silence cannot block payment forever."
          />
          <article className="cd-depth-card p-7 md:col-span-2 md:flex md:items-center md:justify-between md:gap-10">
            <div>
              <p className="cd-kicker">Why Arc</p>
              <h2 className="cd-heading mt-3 text-3xl">
                One stable unit from budget to final receipt.
              </h2>
            </div>
            <p className="cd-copy mt-4 max-w-xl md:mt-0">
              On Arc, the project payment and network fee both use USDC. The
              client does not need a second volatile coin just to approve or
              release completed work.
            </p>
          </article>
        </section>

        <section className="cd-soft-panel mt-16 flex flex-col justify-between gap-6 p-7 md:flex-row md:items-center md:p-9">
          <div>
            <h2 className="text-xl font-extrabold tracking-[-0.025em]">
              Open the 1,000 USDC sample project.
            </h2>
            <p className="mt-2 text-[13px] text-slate-500">
              Arc Testnet USDC has no real-world value.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="cd-button-primary">
              Open projects <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/docs" className="cd-button-secondary">
              Read docs
            </Link>
          </div>
        </section>
      </section>
      <Footer />
    </main>
  );
}

function Principle({ title, text }: { title: string; text: string }) {
  return (
    <article className="cd-soft-panel p-7">
      <h3 className="text-base font-extrabold">{title}</h3>
      <p className="mt-3 text-[13px] leading-6 text-slate-600">{text}</p>
    </article>
  );
}
