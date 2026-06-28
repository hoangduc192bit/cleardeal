import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { ProviderRegistrationForm } from "@/components/ProviderRegistrationForm";
import { ProviderListing } from "@/components/ProviderListing";

export const metadata: Metadata = {
  title: "Become a Provider - ArcStream",
  description:
    "Register your AI data agent on the ArcStream marketplace. List your data stream on-chain and earn USDC from subscribers.",
};

const cardClass =
  "bg-white rounded-[2rem] border border-[rgba(226,232,240,0.65)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.05)]";

export default function BecomeProviderPage() {
  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <AppNav />
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 pb-20">
        {/* Hero */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            AgentRegistry · Arc Testnet
          </span>
          <h1
            className="mt-5 font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-[#18181B]"
            style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
          >
            Become a Data Provider
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-[#71717A] leading-relaxed">
            Register your AI agent on-chain and start earning USDC every second your data stream is consumed. No intermediaries. No approval process. Fully permissionless.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-12 grid gap-4 md:grid-cols-3">
          {[
            {
              num: "01",
              title: "Register On-chain",
              desc: "Call registerAgent() on the AgentRegistry smart contract with your wallet. Your agent is immutably listed on Arc Testnet.",
            },
            {
              num: "02",
              title: "Consumers Subscribe",
              desc: "Subscribers deposit USDC into the StreamPayment contract. The contract streams USDC directly to your wallet per second.",
            },
            {
              num: "03",
              title: "Earn Continuously",
              desc: "Every second your stream is active, USDC accumulates on-chain. Stop anytime — subscribers get an instant refund of unused balance.",
            },
          ].map((step) => (
            <div key={step.num} className={`${cardClass} p-6`}>
              <p className="font-mono text-[12px] font-bold text-slate-300 mb-3">{step.num}</p>
              <h3
                className="font-display text-[16px] font-bold text-[#18181B]"
                style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
              >
                {step.title}
              </h3>
              <p className="mt-2 text-[13px] text-[#71717A] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Registration Form */}
          <div className={`${cardClass} p-8`}>
            <h2
              className="font-display text-xl font-extrabold tracking-tight text-[#18181B]"
              style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
            >
              Register Your Agent
            </h2>
            <p className="mt-1.5 text-[12.5px] text-[#71717A]">
              Stored permanently on Arc Testnet · No gas fees on testnet
            </p>
            <div className="mt-6">
              <ProviderRegistrationForm />
            </div>
          </div>

          {/* Contract Info */}
          <div className="space-y-4">
            <div className={`${cardClass} p-6`}>
              <h3
                className="font-display text-[16px] font-bold text-[#18181B] mb-4"
                style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
              >
                Contract Details
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "AgentRegistry", value: "0xd362...140", href: "https://testnet.arcscan.app/address/0xd3624284C138E537465ED99bB1C79eaB9a6Ce140" },
                  { label: "Network", value: "Arc Testnet (Chain ID: 5042002)" },
                  { label: "Token", value: "USDC (0x3600...0000)" },
                  { label: "Registration Fee", value: "Free (no USDC required)" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-4">
                    <span className="text-[13px] text-slate-400">{item.label}</span>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noreferrer" className="font-mono text-[12px] text-[#0084FF] hover:underline">
                        {item.value}
                      </a>
                    ) : (
                      <span className="font-mono text-[12px] text-[#18181B] text-right">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50 rounded-[2rem] border border-emerald-100 p-6">
              <h3
                className="font-display text-[16px] font-bold text-emerald-700 mb-1"
                style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
              >
                Revenue Calculator
              </h3>
              <p className="text-[12px] text-emerald-600/80">At 0.0001 USDC/second with 10 subscribers:</p>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  ["Per hour", `${(0.0001 * 3600 * 10).toFixed(2)} USDC`],
                  ["Per day", `${(0.0001 * 86400 * 10).toFixed(2)} USDC`],
                  ["Per month", `${(0.0001 * 86400 * 30 * 10).toFixed(2)} USDC`],
                ].map(([period, amount]) => (
                  <div key={period} className="flex justify-between">
                    <span className="text-[13px] text-emerald-700/80">{period}</span>
                    <span className="font-mono text-[13px] font-semibold text-emerald-700">{amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Existing providers */}
        <div className="mt-16">
          <h2
            className="font-display text-2xl font-extrabold tracking-tight text-[#18181B] mb-2"
            style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
          >
            Registered Providers
          </h2>
          <p className="text-[13.5px] text-[#71717A] mb-6">All providers registered on the AgentRegistry smart contract.</p>
          <ProviderListing />
        </div>
      </section>
    </main>
  );
}
