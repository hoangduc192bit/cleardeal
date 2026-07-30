import { ArrowRight, CheckCircle2, ExternalLink, FileCheck2, WalletCards } from "lucide-react";

export function EscrowAnatomySection() {
  return (
    <section id="security" data-reveal className="reveal-on-scroll border-t border-slate-200 py-24 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.55fr_1.45fr]">
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">Why Arc makes this simpler.</h2>
            <p className="mt-6 max-w-[390px] text-[14px] leading-7 text-slate-600">
              The project budget, each payment, and the network fee all use USDC. No second coin is needed just to approve a delivery.
            </p>
            <p className="mt-4 max-w-[390px] text-[12px] leading-6 text-slate-500">
              Clients with testnet USDC on Base Sepolia or Ethereum Sepolia can bridge it into Arc from the project funding screen.
            </p>
            <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              View ArcScan <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <FlowNode icon={WalletCards} label="Client" title="Deposits the full project budget" foot="1,000 USDC" />
            <ArrowRight className="mx-auto h-5 w-5 self-center text-slate-300 max-sm:rotate-90" />
            <FlowNode icon={FileCheck2} label="Vietnam team" title="Submits one finished delivery" foot="Files + note" accent />
            <ArrowRight className="mx-auto h-5 w-5 self-center text-slate-300 max-sm:rotate-90" />
            <FlowNode icon={CheckCircle2} label="ClearDeal" title="Pays after approval or a clear review deadline" foot="Fast Arc receipt" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowNode({ icon: Icon, label, title, foot, accent = false }: { icon: typeof WalletCards; label: string; title: string; foot: string; accent?: boolean }) {
  return (
    <div className={`flex min-h-[210px] flex-col rounded-2xl border p-5 shadow-sm ${accent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <Icon className={`mt-7 h-8 w-8 ${accent ? "text-amber-700" : "text-emerald-700"}`} strokeWidth={1.5} />
      <p className="mt-5 text-[13px] font-semibold leading-5 text-slate-800">{title}</p>
      <p className="mt-auto border-t border-slate-200 pt-3 font-mono text-[10px] text-slate-500">{foot}</p>
    </div>
  );
}
