import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section data-reveal className="reveal-on-scroll border-t border-slate-200 px-5 py-20 text-center sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[980px] rounded-[24px] border border-blue-200 bg-blue-50 px-6 py-14 sm:px-12">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">Try the live protocol</p>
        <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">Settle the network, not every invoice.</h2>
        <p className="mx-auto mt-5 max-w-[520px] text-[14px] leading-7 text-slate-600">Start a shared room, approve real work, and see how much unnecessary USDC movement ClearDeal removes.</p>
        <Link href="/dashboard" className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-blue-600 px-7 text-[13px] font-semibold !text-white transition-colors hover:bg-blue-500">Create a settlement room <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
