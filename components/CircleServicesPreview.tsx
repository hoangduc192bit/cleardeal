"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Zap, Shield } from "lucide-react";

interface Service {
  resource: string;
  provider: string;
  description: string;
  category: string;
  tags: string[];
  priceUsdc: string | null;
  chain: string | null;
  scheme: string;
  supportsCircleGateway: boolean;
  supportsVanillax402: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All",
  WEB_SEARCH_RESEARCH: "Web Search",
  FINANCIAL_ANALYSIS: "Financial Analysis",
  INFRASTRUCTURE: "Infrastructure",
  CREATIVE: "Creative",
  SOCIAL_INTELLIGENCE: "Social Intelligence",
  PREDICTION_MARKETS: "Prediction Markets",
};

export function CircleServicesPreview() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("ALL");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/circle-services/search?q=market data&limit=16", {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error((body as { error?: string }).error ?? "Search failed");
        }
        if (!cancelled) {
          setServices((body as { services: Service[] }).services);
          setSource((body as { source?: string }).source ?? null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load services");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const categories = ["ALL", ...Array.from(new Set(services.map((s) => s.category)))];
  const filtered = activeCategory === "ALL"
    ? services
    : services.filter((s) => s.category === activeCategory);

  return (
    <section className="mb-12 rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_12px_48px_-32px_rgba(0,132,255,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#0084FF]">
              Circle Agent Marketplace
            </div>
            {source && (
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                {source === "circle_cli" ? "Live CLI" : "Verified Snapshot"}
              </span>
            )}
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[9px] font-bold text-neutral-500">
              {services.length} services
            </span>
          </div>
          <h2
            className="mt-2 text-2xl font-black tracking-tight text-neutral-900"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Discover what your agent can do.
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-neutral-500">
            ArcStream agents autonomously discover, inspect, and pay for real services on
            Circle&apos;s Agent Marketplace using <strong>Circle CLI</strong> and <strong>x402 protocol</strong>.
            Every API call is settled in USDC with an on-chain receipt.
          </p>
        </div>
        <a
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] font-bold text-neutral-850 transition hover:border-gray-300 hover:bg-neutral-100 hover:text-neutral-900"
          href="https://agents.circle.com/services"
          rel="noreferrer"
          target="_blank"
        >
          Open Circle Marketplace <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Category Filter Tabs */}
      {!loading && services.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border transition-all ${
                activeCategory === cat
                  ? "bg-[#0084FF] text-white border-[#0084FF] shadow-md shadow-blue-500/20"
                  : "bg-white text-neutral-500 border-gray-200 hover:border-blue-200 hover:text-[#0084FF]"
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, index) => (
            <div
              className="flex min-h-[160px] items-center justify-center rounded-2xl border border-gray-100 bg-gray-50"
              key={index}
            >
              <Loader2 className="h-5 w-5 animate-spin text-[#0084FF]" />
            </div>
          ))}

        {!loading &&
          filtered.map((service) => (
            <a
              className="group rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-[0_4px_16px_rgba(0,132,255,0.08)]"
              href="https://agents.circle.com/services"
              key={service.resource}
              rel="noreferrer"
              target="_blank"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 group-hover:text-[#0084FF] transition-colors truncate">
                  {service.provider}
                </span>
                <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {service.priceUsdc ? `$${service.priceUsdc}` : "x402"}
                </span>
              </div>
              <div className="mt-2 line-clamp-2 text-[13px] font-bold leading-snug text-neutral-900">
                {service.description}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {service.supportsVanillax402 && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-600 uppercase tracking-wider">
                    <Zap className="h-2 w-2" />
                    x402
                  </span>
                )}
                {service.supportsCircleGateway && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-50 border border-purple-100 px-1.5 py-0.5 text-[8px] font-bold text-purple-600 uppercase tracking-wider">
                    <Shield className="h-2 w-2" />
                    Gateway
                  </span>
                )}
                {service.chain && (
                  <span className="rounded-md bg-white border border-gray-100 px-1.5 py-0.5 text-[8px] font-bold text-neutral-500 uppercase tracking-wider">
                    {service.chain}
                  </span>
                )}
              </div>
            </a>
          ))}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          Circle Services discovery unavailable: {error}
        </p>
      )}
    </section>
  );
}
