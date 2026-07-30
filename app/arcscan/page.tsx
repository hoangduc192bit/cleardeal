import type { Metadata } from "next";
import {
  CheckCircle2,
  Database,
  ExternalLink,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { Footer } from "@/components/site/Footer";
import {
  clearingHouseAddress,
  clearingHouseConfigured,
} from "@/lib/clearing-contract";
import { isDurableKvConfigured } from "@/lib/kv-rest";

export const metadata: Metadata = {
  title: "Arc Testnet Proof | ClearDeal",
  description:
    "Verify ClearDeal contract configuration, signed evidence, and clearing state on Arc Testnet.",
};

export default function ArcScanPage() {
  const contractUrl = clearingHouseAddress
    ? `https://testnet.arcscan.app/address/${clearingHouseAddress}`
    : "https://testnet.arcscan.app";

  return (
    <main
      id="main-content"
      className="cleardeal cd-page-shell cd-page-enter min-h-[100dvh] text-[#111827]"
    >
      <AppNav />
      <section className="mx-auto max-w-[1160px] px-5 pb-24 pt-32 sm:px-8">
        <header className="cd-gradient-panel relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div
            className="cd-grid-floor pointer-events-none absolute inset-0 opacity-55"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="cd-kicker">Arc Testnet proof</p>
            <h1 className="cd-heading mt-5 max-w-4xl text-5xl leading-[.98] sm:text-6xl">
              Verify the contract, not a screenshot.
            </h1>
            <p className="cd-copy mt-6 max-w-3xl">
              ClearDeal reads obligations, file hashes, decisions, balances,
              and settlement state directly from Arc and wallet-signed records.
            </p>
          </div>
        </header>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <article className="cd-depth-card flex min-h-[330px] flex-col overflow-hidden p-7 sm:p-9">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <p className="text-[11px] font-extrabold text-slate-500">
                  ClearDeal ClearingHouse
                </p>
                <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.035em] text-slate-950">
                  {clearingHouseConfigured
                    ? "Contract configured"
                    : "Writes are disabled"}
                </h2>
              </div>
              <span
                className={`grid h-14 w-14 place-items-center rounded-2xl ${
                  clearingHouseConfigured
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {clearingHouseConfigured ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
              </span>
            </div>
            <code className="mt-10 break-all rounded-2xl bg-slate-100 p-4 font-mono text-[11px] leading-6 text-slate-700">
              {clearingHouseAddress ?? "Contract address is not configured."}
            </code>
            <a
              href={contractUrl}
              target="_blank"
              rel="noreferrer"
              className="cd-button-primary mt-auto w-fit"
            >
              Open official ArcScan <ExternalLink className="h-4 w-4" />
            </a>
          </article>

          <div className="grid gap-5">
            <StatusCard
              icon={ScanSearch}
              label="Network"
              value="Arc Testnet"
              detail="Chain ID 5042002"
              tone="blue"
            />
            <StatusCard
              icon={Database}
              label="Signed evidence store"
              value={isDurableKvConfigured ? "Available" : "Not configured"}
              detail={
                isDurableKvConfigured
                  ? "Wallet-signed records"
                  : "Evidence creation is disabled"
              }
              tone={isDurableKvConfigured ? "green" : "gold"}
            />
          </div>
        </section>

        <section className="cd-soft-panel mt-8 p-7 sm:p-9">
          <div className="flex gap-4">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
            <div>
              <h2 className="text-lg font-extrabold">Deployment fails closed</h2>
              <p className="cd-copy mt-3 max-w-3xl text-[13px]">
                If the contract or durable storage is unavailable, ClearDeal
                shows the configuration error and blocks writes. It does not
                create sample receipts or simulated settlement links.
              </p>
            </div>
          </div>
        </section>
      </section>
      <Footer />
    </main>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof ScanSearch;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "gold";
}) {
  const toneClass = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    gold: "bg-amber-100 text-amber-800",
  }[tone];
  return (
    <article className="cd-soft-panel flex min-h-[152px] items-center gap-5 p-6">
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${toneClass}`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500">{label}</p>
        <strong className="mt-2 block text-[14px] font-extrabold text-slate-900">
          {value}
        </strong>
        <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
      </div>
    </article>
  );
}
