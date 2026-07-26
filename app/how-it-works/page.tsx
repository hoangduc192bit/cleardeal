import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { Footer } from "@/components/site/Footer";

const steps = [
  ["01", "Agree on the delivery steps", "The client and team define what will be delivered, how much each step pays, and when it is due."],
  ["02", "Prepare the complete budget", "The client deposits the project USDC once. The team can verify that payment is ready before starting."],
  ["03", "Submit one delivery", "The team adds a clear delivery note and optional sample files for the client to review."],
  ["04", "Approve and release payment", "The client approves the finished step. ClearDeal immediately sends only that step’s agreed USDC amount."],
  ["05", "Finish, refund, or resolve a problem", "The same project keeps its paid steps, unpaid balance, deadlines, and dispute helper together."],
] as const;

export default function HowItWorksPage() {
  return (
    <main className="cleardeal min-h-screen bg-[#fffcf0] text-[#2b2118]">
      <AppNav />
      <section className="mx-auto max-w-[1180px] px-5 pb-24 pt-32 sm:px-8">
        <header className="grid gap-8 border-b border-[#ded5c6] pb-12 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <h1 className="max-w-4xl font-display text-5xl leading-[.98] tracking-[-0.055em] sm:text-6xl">
            From prepared money to approved work.
          </h1>
          <p className="max-w-lg text-[15px] leading-7 text-[#766b5d]">
            ClearDeal gives the client control over approval and gives the team proof that the project budget is already prepared.
          </p>
        </header>
        <div className="mt-14 border-y border-[#ded5c6]">
          {steps.map(([number, title, description]) => (
            <article key={number} className="grid gap-5 border-b border-[#ded5c6] py-7 last:border-0 md:grid-cols-[70px_280px_1fr] md:items-start">
              <span className="font-mono text-[10px] text-[#a66c00]">{number}</span>
              <h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2>
              <p className="max-w-2xl text-[13px] leading-6 text-[#766b5d]">{description}</p>
            </article>
          ))}
        </div>
        <section className="mt-16 grid gap-px overflow-hidden border border-[#ded5c6] bg-[#ded5c6] md:grid-cols-3">
          <Principle title="Client protected" text="Work is reviewed before each payment is released." />
          <Principle title="Team protected" text="The full project budget can be verified before work begins." />
          <Principle title="Simple on Arc" text="The project payment and network fee both use USDC." />
        </section>
        <section className="mt-16 flex flex-col justify-between gap-6 border border-amber-300 bg-amber-50 p-7 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Open the 1,000 USDC sample project.</h2>
            <p className="mt-2 text-[13px] text-[#766b5d]">Arc Testnet USDC has no real-world value.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="bg-[#d58b00] px-5 py-3 text-[12px] font-semibold text-white">Open projects</Link>
            <Link href="/docs" className="border border-[#ded5c6] bg-white px-5 py-3 text-[12px] font-semibold">Read docs</Link>
          </div>
        </section>
      </section>
      <Footer />
    </main>
  );
}

function Principle({ title, text }: { title: string; text: string }) {
  return <article className="bg-white p-6"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-3 text-[12px] leading-6 text-[#766b5d]">{text}</p></article>;
}
