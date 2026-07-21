import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileCheck2, ShieldCheck } from "lucide-react";
import type { Hex } from "viem";

import { AppNav } from "@/components/AppNav";
import { Footer } from "@/components/site/Footer";
import { clearingHouseAddress } from "@/lib/clearing-contract";
import { hashClearingEvidence } from "@/lib/clearing-evidence";
import { getStoredClearingEvidence } from "@/lib/clearing-evidence-store";
import { shortWallet } from "@/lib/clearing-data";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export const metadata: Metadata = {
  title: "Signed Evidence | ClearDeal",
  description: "Inspect wallet-signed evidence anchored to a ClearDeal obligation on Arc Testnet.",
  robots: { index: false, follow: false },
};

function isPublicUrl(reference: string) {
  try {
    const url = new URL(reference);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default async function EvidencePage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!HASH_PATTERN.test(hash)) notFound();
  const stored = await getStoredClearingEvidence(hash as Hex);
  if (!stored) notFound();
  const integrityVerified = hashClearingEvidence(stored.evidence).toLowerCase() === hash.toLowerCase();
  const contractUrl = clearingHouseAddress ? `https://testnet.arcscan.app/address/${clearingHouseAddress}` : "https://testnet.arcscan.app";

  return (
    <main className="cleardeal min-h-screen bg-[#fffcf0] text-slate-950">
      <AppNav />
      <section className="mx-auto max-w-[980px] px-5 pb-24 pt-32 sm:px-8">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-600">Wallet-signed evidence</p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Proof attached to clearing room #{stored.evidence.cycleId}.</h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-6 text-slate-600">This public Testnet record is signed by the provider wallet and committed to obligation #{stored.evidence.obligationId} through its evidence hash.</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] ${integrityVerified ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-700"}`}>
            <ShieldCheck className="h-4 w-4" /> {integrityVerified ? "Hash verified" : "Integrity failed"}
          </span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <article className="border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2 text-blue-600"><FileCheck2 className="h-4 w-4" /><p className="font-mono text-[9px] uppercase tracking-[0.14em]">Completion evidence</p></div>
            <div className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">
              {isPublicUrl(stored.evidence.reference)
                ? <a href={stored.evidence.reference} target="_blank" rel="noreferrer" className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-4">{stored.evidence.reference}</a>
                : stored.evidence.reference}
            </div>

            {stored.evidence.attachments?.length ? <section className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-sm font-semibold">Attached files</h2><div className="mt-4 space-y-3">{stored.evidence.attachments.map((attachment, index) => <a key={attachment.sha256} href={`/api/clearing/evidence/attachment?hash=${hash}&index=${index}`} className="flex items-center justify-between gap-4 border border-slate-200 bg-slate-50 p-4 hover:border-blue-300"><span className="min-w-0"><strong className="block truncate text-[12px]">{attachment.name}</strong><span className="mt-1 block font-mono text-[9px] text-slate-500">{attachment.contentType} · {(attachment.size / 1_000).toFixed(1)} KB</span></span><Download className="h-4 w-4 shrink-0 text-blue-600" /></a>)}</div></section> : <p className="mt-8 border-t border-slate-200 pt-6 text-[12px] text-slate-500">No file was attached. The signed public reference is the complete evidence record.</p>}
          </article>

          <aside className="h-fit border border-slate-200 bg-[#fffaf0] p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">Evidence receipt</p>
            <dl className="mt-5 space-y-5">
              <Receipt label="Provider" value={shortWallet(stored.providerAddress)} mono />
              <Receipt label="Submitted" value={new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(stored.evidence.submittedAt)) + " UTC"} />
              <Receipt label="Stored" value={new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(stored.storedAt)) + " UTC"} />
              <Receipt label="Evidence hash" value={hash} mono />
            </dl>
            <div className="mt-6 grid gap-2">
              <Link href={`/dashboard?cycle=${stored.evidence.cycleId}`} className="bg-blue-600 px-4 py-3 text-center text-[11px] font-semibold text-white">Open settlement room</Link>
              <a href={contractUrl} target="_blank" rel="noreferrer" className="border border-slate-200 bg-white px-4 py-3 text-center text-[11px] font-semibold text-slate-700">Verify contract on ArcScan</a>
            </div>
          </aside>
        </div>

        <div className="mt-6 border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-800">Arc Testnet only. Evidence and attachments on this page are public. Do not upload personal data, bank details, confidential invoices, or production secrets.</div>
      </section>
      <Footer />
    </main>
  );
}

function Receipt({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-400">{label}</dt><dd className={`mt-1 break-all text-[11px] leading-5 text-slate-700 ${mono ? "font-mono" : ""}`}>{value}</dd></div>;
}
