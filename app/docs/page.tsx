import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { Footer } from "@/components/site/Footer";
import { clearDealEscrowAddress } from "@/lib/cleardeal-contract";

const lifecycle = [
  ["Created", "The project records the client, team, dispute helper, delivery steps, amounts, and deadlines."],
  ["Funded", "The client deposits the complete USDC budget into the project contract."],
  ["Submitted", "The team adds a signed delivery note and optional sample files for one step."],
  ["Paid", "The client approves the step and its USDC amount is sent to the team wallet."],
  ["Completed", "Every delivery step has been approved and paid."],
] as const;

export default function DocsPage() {
  const contractUrl = clearDealEscrowAddress
    ? `https://testnet.arcscan.app/address/${clearDealEscrowAddress}#code`
    : "https://testnet.arcscan.app";
  return (
    <main className="cleardeal min-h-screen bg-[#fffcf0] text-[#2b2118]">
      <AppNav />
      <div className="mx-auto grid max-w-[1180px] gap-12 px-5 pb-24 pt-32 sm:px-8 lg:grid-cols-[210px_1fr]">
        <aside className="h-fit border-l border-[#ded5c6] pl-5 lg:sticky lg:top-28">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#766b5d]">Documentation</p>
          <nav className="mt-5 grid gap-3 text-[12px] text-[#766b5d]">
            <a href="#overview">Overview</a>
            <a href="#lifecycle">Project stages</a>
            <a href="#roles">Who does what</a>
            <a href="#crosschain">Bring USDC to Arc</a>
            <a href="#data">What is public</a>
            <a href="#arc">Why Arc</a>
            <a href="#status">Release status</a>
          </nav>
        </aside>
        <article className="min-w-0">
          <section id="overview" className="border-b border-[#ded5c6] pb-12">
            <h1 className="font-display text-5xl leading-[.98] tracking-[-0.055em] sm:text-6xl">
              Step-by-step USDC payments for real project work.
            </h1>
            <p className="mt-6 max-w-3xl text-[15px] leading-7 text-[#766b5d]">
              ClearDeal helps an international client and a Vietnamese team agree on a project, prepare the money, submit work, and pay each approved delivery.
            </p>
          </section>

          <DocSection id="lifecycle" title="Project stages">
            <div className="divide-y divide-[#ded5c6] border-y border-[#ded5c6]">
              {lifecycle.map(([state, description]) => (
                <div key={state} className="grid gap-2 py-5 sm:grid-cols-[140px_1fr]">
                  <code className="font-mono text-[11px] text-[#a66c00]">{state}</code>
                  <p className="text-[13px] leading-6 text-[#766b5d]">{description}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="roles" title="Who does what">
            <div className="grid gap-px border border-[#ded5c6] bg-[#ded5c6] md:grid-cols-3">
              <Info title="Client" items={["Creates the project", "Deposits USDC", "Approves finished work", "Can request unpaid funds back"]} />
              <Info title="Vietnam team" items={["Sees the prepared budget", "Submits delivery proof", "Receives each approved payment"]} />
              <Info title="Dispute helper" items={["Uses a separate wallet", "Steps in only when both sides disagree", "Splits the unpaid balance if needed"]} />
            </div>
          </DocSection>

          <DocSection id="crosschain" title="Bring USDC to Arc">
            <p className="text-[13px] leading-7 text-[#766b5d]">
              A client can bridge existing testnet USDC from Base Sepolia or Ethereum Sepolia into the same wallet on Arc Testnet, then deposit it into the project. Circle App Kit handles the crosschain USDC steps. ClearDeal never asks for a private key.
            </p>
            <div className="mt-6 grid gap-px border border-[#ded5c6] bg-[#ded5c6] sm:grid-cols-3">
              <Fact label="Source" value="Base Sepolia / Ethereum Sepolia" />
              <Fact label="Token" value="Testnet USDC only" />
              <Fact label="Destination" value="Same wallet on Arc Testnet" />
            </div>
            <p className="mt-5 border border-amber-300 bg-amber-50 p-4 text-[11px] leading-6 text-amber-900">
              App Kit does not support token swaps on Base Sepolia or Ethereum Sepolia. ClearDeal therefore bridges existing testnet USDC and does not claim to convert test ETH or other source-testnet tokens.
            </p>
          </DocSection>

          <DocSection id="data" title="What is public on this testnet">
            <p className="text-[13px] leading-7 text-[#766b5d]">
              Wallet addresses, USDC amounts, deadlines, file hashes, approvals, and payment receipts are public. Project names and sample files are stored separately but linked by signed hashes. Do not upload private client work or personal data.
            </p>
            <div className="mt-6 grid gap-px border border-[#ded5c6] bg-[#ded5c6] sm:grid-cols-3">
              <Fact label="Files" value="3 files / 2 MB total" />
              <Fact label="File check" value="SHA-256 + wallet signature" />
              <Fact label="Network" value="Public Arc Testnet" />
            </div>
          </DocSection>

          <DocSection id="arc" title="Why Arc">
            <p className="text-[13px] leading-7 text-[#766b5d]">
              Arc uses USDC for both project payments and network fees. ClearDeal therefore keeps the full flow in one stable unit, and approved payments receive fast final confirmation.
            </p>
            <dl className="mt-6 grid gap-px border border-[#ded5c6] bg-[#ded5c6] sm:grid-cols-2">
              <Fact label="Network" value="Arc Testnet" />
              <Fact label="Chain ID" value="5042002" />
              <Fact label="Payment" value="USDC" />
              <Fact label="Main story" value="Pay after approval" />
            </dl>
          </DocSection>

          <DocSection id="status" title="Public Testnet product">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
              <div className="flex gap-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-950">Testnet safety notice</h3>
                  <p className="mt-2 text-[13px] leading-7 text-amber-900">
                    ClearDeal performs real Testnet wallet signatures, crosschain USDC bridging, USDC approvals, project funding, delivery submissions, payments, refunds, and dispute resolution. Test USDC has no real-world value, and the custom contract is not professionally audited.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="bg-[#d58b00] px-5 py-3 text-[12px] font-semibold text-white">Open projects</Link>
              <a href={contractUrl} target="_blank" rel="noreferrer" className="border border-[#ded5c6] bg-white px-5 py-3 text-[12px] font-semibold">ClearDeal contract on ArcScan</a>
            </div>
          </DocSection>
        </article>
      </div>
      <Footer />
    </main>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-[#ded5c6] py-12 last:border-0">
      <h2 className="mb-7 font-display text-3xl tracking-[-0.035em]">{title}</h2>
      {children}
    </section>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white p-6">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-5 space-y-3">
        {items.map((item) => <li key={item} className="text-[12px] leading-5 text-[#766b5d]">— {item}</li>)}
      </ul>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-5">
      <dt className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#766b5d]">{label}</dt>
      <dd className="mt-2 font-mono text-[11px]">{value}</dd>
    </div>
  );
}
