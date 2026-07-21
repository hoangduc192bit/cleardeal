import Link from "next/link";
import { ArrowRight, ExternalLink, Network, ShieldCheck, Users } from "lucide-react";

export function EscrowAnatomySection() {
  return (
    <section id="security" data-reveal className="reveal-on-scroll border-t border-slate-200 py-24 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.52fr_1.48fr]">
          <div>
            <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Onchain by design</p>
            <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">Clearing anatomy.</h2>
            <p className="mt-3 text-lg text-slate-500">Evidence in. Net settlement out.</p>
            <p className="mt-6 max-w-[370px] text-[14px] leading-7 text-slate-600">
              Every cycle binds obligations, provider bonds, verifier votes, deadlines, net positions, and settlement receipts to one Arc Testnet state machine.
            </p>
            <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300">
              View ArcScan <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div>
            <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
              <EscrowNode icon={Users} label="Participants" title="Commit obligations and bonds" foot="Gross graph" />
              <ArrowRight className="mx-auto h-5 w-5 self-center text-slate-300 max-sm:rotate-90" />
              <EscrowNode icon={ShieldCheck} label="Verifier quorum" title="Clear signed outcomes" foot="Pass / fail" accent />
              <ArrowRight className="mx-auto h-5 w-5 self-center text-slate-300 max-sm:rotate-90" />
              <EscrowNode icon={Network} label="ClearingHouse" title="Compute and settle net positions" foot="Arc USDC" />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="min-h-[190px] rounded-2xl border border-slate-200 bg-white p-5 font-mono text-[11px] leading-6 text-slate-600 shadow-sm">
                <p className="mb-3 uppercase tracking-[0.14em] text-white/30">Transaction memo</p>
                <p>Cycle: CC-AGENTS-0042</p>
                <p>Cleared gross: 270 USDC</p>
                <p>Net debit: 20 USDC</p>
                <p>Liquidity saved: 250 USDC</p>
                <p className="text-emerald-300">Status: quorum cleared</p>
              </div>
              <div className="min-h-[190px] rounded-2xl border border-slate-200 bg-white p-5 font-mono text-[11px] leading-6 text-slate-600 shadow-sm">
                <p className="mb-3 uppercase tracking-[0.14em] text-white/30">ArcScan receipt</p>
                <div className="grid grid-cols-[90px_1fr] gap-y-2"><span>Network</span><span className="text-right text-white/80">Arc Testnet</span><span>State</span><span className="text-right text-emerald-300">Confirmed</span><span>Gas</span><span className="text-right text-white/80">Paid in USDC</span><span>Proof</span><span className="text-right text-blue-400">Onchain</span></div>
                <Link href="/docs" className="mt-5 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">Read the clearing model <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EscrowNode({ icon: Icon, label, title, foot, accent = false }: { icon: typeof Users; label: string; title: string; foot: string; accent?: boolean }) {
  return (
    <div className={`flex min-h-[190px] flex-col rounded-2xl border p-5 shadow-sm ${accent ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">{label}</p>
      <Icon className={`mt-7 h-8 w-8 ${accent ? "text-blue-400" : "text-white/65"}`} strokeWidth={1.5} />
      <p className="mt-5 text-[13px] font-semibold leading-5 text-white/80">{title}</p>
      <p className="mt-auto border-t border-white/[0.08] pt-3 font-mono text-[10px] text-white/40">{foot}</p>
    </div>
  );
}
