"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, Search, Shield, Wallet, XCircle } from "lucide-react";

interface OrchestratorStep {
  step: number;
  action: string;
  status: "done" | "failed" | "skipped";
  durationMs: number;
  service?: {
    resource: string;
    provider: string;
    description: string;
    method: string;
    priceUsdc: string | null;
    chain: string | null;
    scheme: string;
  };
  result?: unknown;
}

interface OrchestratorResult {
  request: string;
  mode: "dry_run" | "paid";
  searchQuery: string;
  selectedService: OrchestratorStep["service"] | null;
  payload: Record<string, unknown> | null;
  steps: OrchestratorStep[];
  finalAnswer: string;
  citations: string[];
  budget: {
    maxBudgetUsdc: string;
    spentUsdc: string;
    remainingUsdc: string;
  };
  status: "completed" | "planned" | "failed";
}

const EXAMPLES = [
  "Search the web for recent Circle USDC agent wallet news and summarize the top findings",
  "Get current Bitcoin price data for a trading agent",
  "Find recent research about x402 payments for AI agents",
];

export function CircleMarketplaceOrchestrator() {
  const [request, setRequest] = useState(EXAMPLES[0]);
  const [maxBudgetUsdc, setMaxBudgetUsdc] = useState("0.02");
  const [result, setResult] = useState<OrchestratorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/agent/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, maxBudgetUsdc, executePaid: false }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "Orchestration failed");
      }
      setResult(body as OrchestratorResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Orchestration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_20px_70px_-45px_rgba(0,132,255,0.7)] md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#0084FF]">
            <Search className="h-3.5 w-3.5" />
            Circle Marketplace Orchestrator
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-neutral-950 md:text-3xl">
            Ask once. ArcStream finds the paid service, prepares payment, and returns the answer.
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-neutral-500">
            Preview connector: today ArcStream's live demo settles on Arc Testnet native tools. This tab shows the long-term vision for Arc mainnet, where ArcStream routes user requests into Circle Agent Marketplace services once those services support Arc/mainnet payment rails.
          </p>
        </div>
        <a
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] font-bold text-neutral-700 transition hover:border-blue-100 hover:bg-blue-50 hover:text-[#0084FF]"
          href="https://agents.circle.com/services"
          rel="noreferrer"
          target="_blank"
        >
          Circle Services <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-neutral-400">
            User request
          </label>
          <textarea
            className="min-h-[130px] w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-[14px] font-medium leading-relaxed text-neutral-900 outline-none transition focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-[#0084FF]"
                key={example}
                onClick={() => setRequest(example)}
                type="button"
              >
                {example.slice(0, 42)}...
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-neutral-400">
            Budget cap
          </label>
          <input
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] font-bold text-neutral-900 outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-50"
            value={maxBudgetUsdc}
            onChange={(event) => setMaxBudgetUsdc(event.target.value)}
          />

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3">
            <span>
              <span className="block text-[13px] font-black text-neutral-900">Services preview</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-neutral-500">
                Public runs never spend the server wallet. Paid automation requires a protected server workflow.
              </span>
            </span>
          </div>

          <button
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-4 py-3 text-[13px] font-black text-white shadow-[0_12px_35px_-18px_rgba(0,132,255,0.9)] transition hover:bg-[#0073df] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !request.trim()}
            onClick={run}
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {loading ? "Routing..." : "Plan external service call"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Selected service</div>
            {result.selectedService ? (
              <div className="mt-3">
                <div className="text-[18px] font-black text-neutral-950">{result.selectedService.provider}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{result.selectedService.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Metric label="Price" value={result.selectedService.priceUsdc ? `$${result.selectedService.priceUsdc}` : "free/x402"} />
                  <Metric label="Chain" value={result.selectedService.chain ?? "auto"} />
                  <Metric label="Method" value={result.selectedService.method} />
                  <Metric label="Mode" value={result.mode} />
                </div>
                <a
                  className="mt-4 inline-flex max-w-full items-center gap-2 truncate text-[12px] font-bold text-[#0084FF]"
                  href={result.selectedService.resource}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open endpoint <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-neutral-500">No service selected.</p>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-100 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Agent trace</div>
                <div className="mt-1 text-[13px] font-semibold text-neutral-500">
                  Search query: <span className="text-neutral-900">{result.searchQuery}</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                <Shield className="h-3.5 w-3.5" />
                Budget ${result.budget.maxBudgetUsdc}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {result.steps.map((step) => (
                <TraceStep key={step.step} step={step} />
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-[#0084FF]">
                <Wallet className="h-3.5 w-3.5" />
                Final answer
              </div>
              <p className="text-[14px] leading-relaxed text-neutral-800">{result.finalAnswer}</p>
              {result.payload && (
                <pre className="mt-3 max-h-[180px] overflow-auto rounded-xl bg-white p-3 text-[11px] text-neutral-600">
                  {JSON.stringify(result.payload, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{label}</div>
      <div className="mt-1 truncate text-[13px] font-black text-neutral-900">{value}</div>
    </div>
  );
}

function TraceStep({ step }: { step: OrchestratorStep }) {
  const icon =
    step.status === "done" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : step.status === "failed" ? (
      <XCircle className="h-4 w-4 text-red-500" />
    ) : (
      <Shield className="h-4 w-4 text-amber-500" />
    );

  return (
    <div className="flex gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-neutral-100 bg-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="text-[13px] font-bold text-neutral-900">{step.action}</div>
          <div className="text-[11px] font-mono text-neutral-400">{step.durationMs}ms</div>
        </div>
        {step.service && (
          <div className="mt-1 text-[12px] text-neutral-500">
            {step.service.provider} · {step.service.method} · {step.service.priceUsdc ? `$${step.service.priceUsdc}` : "price unknown"}
          </div>
        )}
      </div>
    </div>
  );
}
