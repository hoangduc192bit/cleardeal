import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { AnimatedHeroHeadline } from "@/components/site/AnimatedHeroHeadline";
import { Footer } from "@/components/site/Footer";
import { clearingHouseAddress } from "@/lib/clearing-contract";

const lifecycle = [
  [
    "Active",
    "Providers post USDC bonds, publish wallet-signed evidence, and independent verifiers vote on each obligation.",
  ],
  [
    "Passed / Failed",
    "Quorum or the independent arbitrator finalizes each outcome. Failed posted bonds are marked for slashing.",
  ],
  [
    "Funding",
    "The contract computes participant net positions. Only net debtors deposit the exact required USDC difference.",
  ],
  [
    "Settled",
    "One transaction pays net creditors, returns passed bonds, slashes failed bonds, and updates risk passports.",
  ],
  [
    "Defaulted",
    "After the funding deadline, deposits are returned and unfunded net debtors receive an onchain default record.",
  ],
] as const;

const heroPhrases = [
  "autonomous commerce.",
  "multi-party settlement.",
  "verifiable USDC outcomes.",
] as const;

export default function DocsPage() {
  const contractUrl = clearingHouseAddress
    ? `https://testnet.arcscan.app/address/${clearingHouseAddress}#code`
    : "https://testnet.arcscan.app";
  return (
    <main className="cleardeal min-h-screen bg-[#05090d] text-white">
      <AppNav />
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 pb-24 pt-32 sm:px-8 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit border-l border-white/[0.1] pl-5 lg:sticky lg:top-28">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/28">
            Documentation
          </p>
          <nav className="mt-5 grid gap-3 text-[12px] text-white/48">
            <a href="#overview">Overview</a>
            <a href="#lifecycle">State machine</a>
            <a href="#architecture">Data boundaries</a>
            <a href="#evidence">Evidence bundles</a>
            <a href="#arc">Arc integration</a>
            <a href="#status">Release status</a>
          </nav>
        </aside>
        <article className="min-w-0">
          <section id="overview" className="border-b border-white/[0.09] pb-12">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-blue-400">
              ClearDeal protocol
            </p>
            <AnimatedHeroHeadline
              lead="Clearing and assurance for"
              phrases={heroPhrases}
              className="mt-5 text-5xl font-semibold leading-[.98] tracking-[-0.055em] sm:text-6xl"
              phraseClassName="text-amber-300"
            />
            <p className="mt-6 max-w-3xl text-[15px] leading-7 text-white/45">
              ClearDeal converts outcome commitments into verifier-cleared
              obligations, calculates multilateral net positions, and settles
              the minimum required USDC on Arc Testnet.
            </p>
          </section>
          <DocSection
            id="lifecycle"
            eyebrow="State machine"
            title="Cycle lifecycle"
          >
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.09]">
              {lifecycle.map(([state, description]) => (
                <div
                  key={state}
                  className="grid gap-2 py-5 sm:grid-cols-[140px_1fr]"
                >
                  <code className="font-mono text-[11px] text-blue-300">
                    {state}
                  </code>
                  <p className="text-[13px] leading-6 text-white/42">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </DocSection>
          <DocSection
            id="architecture"
            eyebrow="Data boundaries"
            title="What is verifiable"
          >
            <div className="grid gap-px border border-white/[0.09] bg-white/[0.08] md:grid-cols-2">
              <Architecture
                title="Onchain"
                items={[
                  "Participants, verifiers, and arbitrator",
                  "Payment and performance-bond amounts",
                  "Evidence/spec hashes and verifier votes",
                  "Net debit/credit positions and deposits",
                  "Settlements, defaults, and risk passports",
                ]}
              />
              <Architecture
                title="Wallet-signed public records"
                items={[
                  "Cycle and participant display labels",
                  "Human-readable outcome specifications",
                  "Public evidence references",
                  "Signer address, signature, and timestamp",
                  "Arc Privacy remains roadmap—not a live claim",
                ]}
              />
            </div>
          </DocSection>
          <DocSection
            id="evidence"
            eyebrow="Evidence bundles"
            title="A result can carry a real receipt."
          >
            <p className="text-[13px] leading-7 text-white/44">
              Providers sign a delivery note and can attach up to two small
              PDF, PNG, JPEG, or text files. ClearDeal hashes each file in the
              browser, stores the public attachment offchain, and anchors the
              signed descriptor hash to the obligation on Arc. Reviewers can
              open the evidence receipt from the room before voting.
            </p>
            <div className="mt-6 grid gap-px border border-white/[0.09] bg-white/[0.08] sm:grid-cols-3">
              <Fact label="Attachment limit" value="2 files / 400 KB total" />
              <Fact label="Integrity" value="SHA-256 + wallet signature" />
              <Fact label="Visibility" value="Public Testnet record" />
            </div>
          </DocSection>
          <DocSection id="arc" eyebrow="Infrastructure" title="Why Arc">
            <p className="text-[13px] leading-7 text-white/44">
              Arc uses USDC as the native gas currency and supports EVM
              contracts. ClearDeal uses canonical 6-decimal USDC for bonds and
              settlement, while fast deterministic finality makes a multi-party
              clearing state machine practical.
            </p>
            <dl className="mt-6 grid gap-px border border-white/[0.09] bg-white/[0.08] sm:grid-cols-2">
              <Fact label="Network" value="Arc Testnet" />
              <Fact label="Chain ID" value="5042002" />
              <Fact label="Settlement asset" value="Canonical USDC" />
              <Fact label="Privacy" value="Roadmap only" />
            </dl>
          </DocSection>
          <DocSection
            id="status"
            eyebrow="Release status"
            title="Public Testnet product"
          >
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-[0_12px_32px_rgba(146,64,14,0.07)]">
              <div className="flex gap-4">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold text-amber-950">
                    Testnet safety notice
                  </h3>
                  <p className="mt-2 text-[13px] leading-7 text-amber-900">
                    The product performs real Arc Testnet contract reads/writes,
                    wallet signatures, USDC approvals, bond posting, quorum
                    voting, net funding, settlement, defaults, and durable
                    evidence storage. Faucet USDC has no real-world value. The
                    custom contracts are not professionally audited.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="bg-blue-600 px-5 py-3 text-[12px] font-semibold"
              >
                Open workspace
              </Link>
              <a
                href={contractUrl}
                target="_blank"
                rel="noreferrer"
                className="border border-white/[0.12] px-5 py-3 text-[12px] font-semibold text-white/65"
              >
                ClearingHouse on ArcScan
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
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-b border-white/[0.09] py-12 last:border-0"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-blue-400">
        {eyebrow}
      </p>
      <h2 className="mb-7 mt-3 text-2xl font-semibold tracking-[-0.035em]">
        {title}
      </h2>
      {children}
    </section>
  );
}
function Architecture({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-[#080d13] p-6">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-[12px] leading-5 text-white/40"
          >
            <span className="text-blue-400">—</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#080d13] p-5">
      <dt className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-[11px] text-white/66">{value}</dd>
    </div>
  );
}
