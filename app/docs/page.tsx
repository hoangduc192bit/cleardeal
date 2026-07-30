import Link from "next/link";
import { AlertTriangle, Check, ExternalLink } from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { Footer } from "@/components/site/Footer";
import { clearDealEscrowAddress } from "@/lib/cleardeal-contract";

const lifecycle = [
  ["Created", "The project records the people, delivery steps, amounts, and deadlines."],
  ["Funded", "The client deposits the complete USDC budget into the project contract."],
  ["Submitted", "The team adds a signed delivery note and protected sample files."],
  ["Reviewed", "The client approves, requests a bounded revision, or disputes that step."],
  ["Paid", "Approval, or an objection-free review deadline, releases the step's USDC."],
  ["Completed", "Every delivery is paid, refunded, or independently resolved."],
] as const;

const sections = [
  ["overview", "Overview"],
  ["product", "Product workflow"],
  ["lifecycle", "Project stages"],
  ["roles", "Who does what"],
  ["crosschain", "Bring USDC to Arc"],
  ["recovery", "Passkey recovery"],
  ["data", "What is public"],
  ["arc", "Why Arc"],
  ["status", "Release status"],
] as const;

export default function DocsPage() {
  const contractUrl = clearDealEscrowAddress
    ? `https://testnet.arcscan.app/address/${clearDealEscrowAddress}#code`
    : "https://testnet.arcscan.app";

  return (
    <main
      id="main-content"
      className="cleardeal cd-page-shell cd-page-enter min-h-[100dvh] text-[#111827]"
    >
      <AppNav />
      <div className="mx-auto grid max-w-[1180px] gap-12 px-5 pb-24 pt-32 sm:px-8 lg:grid-cols-[220px_1fr]">
        <aside className="cd-soft-panel h-fit p-4 lg:sticky lg:top-28">
          <p className="px-3 pt-2 text-[11px] font-extrabold text-slate-700">
            Documentation
          </p>
          <nav className="mt-3 grid gap-1" aria-label="Documentation sections">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="cd-doc-link">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0">
          <section
            id="overview"
            className="cd-gradient-panel relative scroll-mt-28 overflow-hidden p-7 sm:p-10"
          >
            <div
              className="cd-grid-floor pointer-events-none absolute inset-0 opacity-45"
              aria-hidden="true"
            />
            <div className="relative">
              <p className="cd-kicker">ClearDeal guide</p>
              <h1 className="cd-heading mt-5 text-5xl leading-[.98] sm:text-6xl">
                Step-by-step USDC payments for real project work.
              </h1>
              <p className="cd-copy mt-6 max-w-3xl">
                ClearDeal helps a client and a team agree on work, prepare the
                money, review each delivery, and keep every Arc receipt in one
                place.
              </p>
            </div>
          </section>

          <DocSection id="product" title="A complete project workspace">
            <p className="cd-copy">
              Start from a website, video, design, software, or custom template.
              Each payment step states what must be delivered and how the client
              decides it is complete.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Info
                title="Create clearly"
                items={[
                  "Choose a practical template",
                  "Select saved wallets by name",
                  "Define every deliverable and approval check",
                ]}
              />
              <Info
                title="Know what is next"
                items={[
                  "Search every project",
                  "Filter work that needs your action",
                  "See the current review or payment step",
                ]}
              />
              <Info
                title="Share safely"
                items={[
                  "Copy a read-only project link",
                  "Keep protected files behind a signature",
                  "Unlock clean files after payment",
                ]}
              />
              <Info
                title="Keep a record"
                items={[
                  "Download a project receipt",
                  "Verify payments on ArcScan",
                  "Read the signed project timeline",
                ]}
              />
            </div>
          </DocSection>

          <DocSection id="lifecycle" title="Project stages">
            <div className="cd-soft-panel divide-y divide-slate-200 overflow-hidden">
              {lifecycle.map(([state, description]) => (
                <div
                  key={state}
                  className="grid gap-2 p-5 sm:grid-cols-[140px_1fr]"
                >
                  <code className="font-mono text-[11px] font-bold text-amber-800">
                    {state}
                  </code>
                  <p className="text-[13px] leading-6 text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="roles" title="Who does what">
            <div className="grid gap-4 md:grid-cols-3">
              <Info
                title="Client"
                items={[
                  "Creates and funds the project",
                  "Approves, requests changes, or disputes",
                  "Reclaims only work that was never submitted",
                ]}
              />
              <Info
                title="Team"
                items={[
                  "Sees the prepared budget",
                  "Submits delivery proof",
                  "Can release payment after review ends",
                ]}
              />
              <Info
                title="Dispute helper"
                items={[
                  "Uses a separate wallet",
                  "Acts only on a disputed milestone",
                  "Splits only that milestone if needed",
                ]}
              />
            </div>
          </DocSection>

          <DocSection id="crosschain" title="Bring USDC to Arc">
            <p className="cd-copy">
              A client can bridge existing testnet USDC from Base Sepolia or
              Ethereum Sepolia into the same wallet on Arc Testnet. Circle App
              Kit handles the crosschain steps. ClearDeal never asks for a
              private key.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Fact label="Source" value="Base Sepolia or Ethereum Sepolia" />
              <Fact label="Token" value="Testnet USDC only" />
              <Fact label="Destination" value="The same wallet on Arc" />
            </div>
            <Notice>
              App Kit does not swap test ETH into USDC on these testnets.
              ClearDeal bridges existing testnet USDC only.
            </Notice>
          </DocSection>

          <DocSection id="recovery" title="Passkey backup and recovery">
            <p className="cd-copy">
              A Circle passkey cannot be exported as a seed phrase. ClearDeal
              can register a separate 12-word recovery key for the smart wallet
              on Arc Testnet.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Fact label="Passkey" value="Stays on the user's device" />
              <Fact label="Recovery phrase" value="Shown once in the browser" />
              <Fact label="ClearDeal server" value="Never receives the phrase" />
            </div>
            <Notice>
              Anyone with the recovery phrase can replace the passkey. Store it
              offline or in a trusted password manager.
            </Notice>
          </DocSection>

          <DocSection id="data" title="What is public on this testnet">
            <p className="cd-copy">
              Wallet addresses, USDC amounts, deadlines, file hashes, approvals,
              and payment receipts are public. Do not upload private client work
              or personal data.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Fact label="Files" value="3 files, 2 MB total" />
              <Fact label="File check" value="SHA-256 and wallet signature" />
              <Fact label="Network" value="Public Arc Testnet" />
            </div>
          </DocSection>

          <DocSection id="arc" title="Why Arc">
            <p className="cd-copy">
              Arc uses USDC for both project payments and network fees.
              ClearDeal keeps the full payment workflow in one stable unit, with
              fast final confirmation.
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Fact label="Network" value="Arc Testnet" />
              <Fact label="Chain ID" value="5042002" />
              <Fact label="Payment" value="USDC" />
              <Fact label="Product rule" value="Review first, then pay" />
            </dl>
          </DocSection>

          <DocSection id="status" title="Public Testnet product">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
              <div className="flex gap-4">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-amber-950">
                    Testnet safety notice
                  </h3>
                  <p className="mt-2 text-[13px] leading-7 text-amber-900">
                    ClearDeal performs real Testnet signatures, bridging,
                    funding, delivery submissions, timed releases, refunds, and
                    milestone dispute resolution. The custom contract is not
                    professionally audited.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="cd-button-primary">
                Open projects
              </Link>
              <a
                href={contractUrl}
                target="_blank"
                rel="noreferrer"
                className="cd-button-secondary"
              >
                Contract on ArcScan <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </DocSection>
        </article>
      </div>
      <Footer />
    </main>
  );
}

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-b border-slate-200 py-12 last:border-0"
    >
      <h2 className="cd-heading mb-7 text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="cd-soft-panel p-6">
      <h3 className="text-sm font-extrabold">{title}</h3>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-[12px] leading-5 text-slate-600"
          >
            <Check
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="cd-soft-panel p-5">
      <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-[11px] font-bold text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[11px] leading-6 text-amber-900">
      {children}
    </p>
  );
}
