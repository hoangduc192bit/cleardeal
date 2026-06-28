import { AppNav } from "@/components/AppNav";

const catalogSnippet = `// Step 1 — Discover available AI tools
const res = await fetch('https://arcstream.app/api/catalog');
const { tools } = await res.json();
// → 5 live tools: summarize, analyze, web-intel, sentiment, report-writer

// Step 2 — Call a tool (no auth header → 402 Payment Required)
const call = await fetch('https://arcstream.app/api/tools/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ company: 'Stripe', focus: 'product' })
});
// → HTTP 402: { price: "0.05", providerWallet: "0x211F...", instructions: "..." }
const { price, providerWallet } = await call.json();

// Step 3 — Pay USDC on Arc Testnet (Chain ID 5042002)
const txHash = await sendUSDC(providerWallet, price); // your wallet lib

// Step 4 — Retry with payment proof
const unlocked = await fetch('https://arcstream.app/api/tools/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-arcstream-payment-tx': txHash,
  },
  body: JSON.stringify({ company: 'Stripe', focus: 'product' })
});
const { payload } = await unlocked.json();`;

const responseSnippet = `{
  "toolId": "analyze",
  "provider": "ArcStream Labs",
  "receipt": "x402-onchain-0x8f3a...2c",
  "dataHash": "0xabc123...",
  "settlement": "settled_onchain",
  "payload": {
    "company": "Stripe",
    "strengths": [
      "Dominant API-first payments brand",
      "Atlas startup ecosystem lock-in"
    ],
    "weaknesses": ["High fees vs incumbents"],
    "positioning": "Stripe owns the developer-first ...",
    "threats": ["Adyen enterprise push"],
    "opportunities": ["Stablecoin payment rails"],
    "analyzedAt": 1719500000000
  }
}`;

const tools = [
  { id: "summarize",      name: "Text Summarizer",      price: "$0.02", ms: "~1.2s", category: "Writing" },
  { id: "analyze",        name: "Competitor Analyzer",  price: "$0.05", ms: "~2.5s", category: "Analysis" },
  { id: "web-intel",      name: "Web Intelligence",     price: "$0.03", ms: "~3.0s", category: "Research" },
  { id: "sentiment",      name: "Sentiment Scorer",     price: "$0.02", ms: "~0.9s", category: "Analysis" },
  { id: "report-writer",  name: "Report Writer",        price: "$0.04", ms: "~2.0s", category: "Generation" },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <AppNav />
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-20">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-3.5 py-1.5 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600">
            Developer Guide
          </span>
        </div>

        <h1
          className="font-display text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-[-0.025em] leading-[1.08] text-[#18181B] max-w-3xl"
          style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
        >
          Build agents that{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #06B6D4 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            pay per tool call
          </span>
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-[#71717A] max-w-2xl">
          No SDK needed. ArcStream uses standard HTTP 402 — your agent calls a tool endpoint, gets a price, pays USDC on Arc Testnet, and retries with the transaction hash.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          {/* Code terminal */}
          <div className="bg-[#0d1117] rounded-[2rem] overflow-hidden border border-white/[0.06] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-5 py-3.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
              </div>
              <div className="text-[11.5px] font-mono text-white/30">agent.ts</div>
            </div>
            <pre className="overflow-x-auto p-6 text-[12.5px] font-mono leading-[1.85] text-slate-300">
              <code>{catalogSnippet}</code>
            </pre>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">

            {/* Response payload */}
            <div className="bg-white rounded-[2rem] border border-[rgba(226,232,240,0.7)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-emerald-600">
                  Unlocked response
                </span>
              </div>
              <pre className="text-[11.5px] font-mono text-emerald-900 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 leading-[1.7] overflow-x-auto">
                {responseSnippet}
              </pre>
            </div>

            {/* Protocol card */}
            <div className="bg-white rounded-[2rem] border border-[rgba(226,232,240,0.7)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0084FF]" />
                <span className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-[#0084FF]">
                  x402 Protocol
                </span>
              </div>
              <ol className="space-y-3">
                {[
                  ["POST /api/tools/:id", "No header → HTTP 402 + price"],
                  ["sendUSDC(wallet, price)", "Transfer USDC on Arc Testnet"],
                  ["Retry with x-arcstream-payment-tx", "Server verifies on-chain"],
                  ["200 OK + payload", "Settlement proof in response"],
                ].map(([code, desc]) => (
                  <li key={code} className="flex flex-col gap-0.5">
                    <code className="text-[11.5px] font-mono text-violet-600">{code}</code>
                    <span className="text-[12px] text-[#71717A]">{desc}</span>
                  </li>
                ))}
              </ol>
            </div>

          </div>
        </div>

        {/* Tool catalog table */}
        <div className="mt-10 bg-white rounded-[2rem] border border-[rgba(226,232,240,0.7)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] p-7 overflow-x-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">Live Tools</p>
              <h2
                className="text-xl font-extrabold text-[#18181B]"
                style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
              >
                5 native tools — all powered by Gemini AI
              </h2>
            </div>
            <code className="hidden sm:block text-[11px] font-mono bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-slate-500">
              GET /api/catalog
            </code>
          </div>
          <table className="w-full text-[13px] min-w-[520px]">
            <thead>
              <tr className="text-left border-b border-slate-100">
                <th className="pb-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Tool</th>
                <th className="pb-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Endpoint</th>
                <th className="pb-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 text-right">Price</th>
                <th className="pb-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 text-right">Latency</th>
                <th className="pb-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tools.map((t) => (
                <tr key={t.id} className="group">
                  <td className="py-3 font-semibold text-[#18181B]">{t.name}</td>
                  <td className="py-3 font-mono text-[11.5px] text-[#71717A] group-hover:text-violet-600 transition-colors">
                    POST /api/tools/{t.id}
                  </td>
                  <td className="py-3 text-right font-semibold text-emerald-600">{t.price}</td>
                  <td className="py-3 text-right text-slate-400">{t.ms}</td>
                  <td className="py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 font-medium">
                      {t.category}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom row */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Payment header */}
          <div className="bg-white rounded-[2rem] border border-[rgba(226,232,240,0.7)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-amber-600">
                Payment header
              </span>
            </div>
            <code className="block rounded-xl bg-slate-950 text-emerald-400 font-mono text-[12.5px] p-4 border border-slate-800 leading-7">
              x-arcstream-payment-tx: 0x8f3a...2c
            </code>
            <p className="mt-3 text-[13px] text-[#71717A] leading-relaxed">
              One header. Send a verified Arc Testnet USDC transaction hash and the tool unlocks instantly.
            </p>
          </div>

          {/* Network info */}
          <div className="bg-white rounded-[2rem] border border-[rgba(226,232,240,0.7)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-100 px-3 py-1 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-slate-500">
                Network
              </span>
            </div>
            <ul className="space-y-3">
              {[
                "Arc Testnet — Chain ID 5042002",
                "USDC as payment currency",
                "On-chain settlement proof per call",
                "10% platform fee → ArcStream protocol",
                "Verify payments on ArcScan",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-[#18181B]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0084FF] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </main>
  );
}
