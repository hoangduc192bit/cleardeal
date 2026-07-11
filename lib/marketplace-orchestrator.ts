import { createAgentBudgetPolicy } from "@/lib/agent-budget";
import {
  inspectCircleService,
  payCircleService,
  searchCircleServices,
  type CircleServiceMethod,
  type NormalizedCircleService,
} from "@/lib/circle-services";
import { generateStructured } from "@/lib/gemini";

export interface MarketplaceOrchestratorStep {
  step: number;
  action: string;
  status: "done" | "failed" | "skipped";
  service?: {
    resource: string;
    provider: string;
    description: string;
    method: CircleServiceMethod;
    priceUsdc: string | null;
    chain: string | null;
    scheme: string;
  };
  result?: unknown;
  durationMs: number;
}

export interface MarketplaceOrchestratorResult {
  request: string;
  mode: "dry_run" | "paid";
  searchQuery: string;
  selectedService: MarketplaceOrchestratorStep["service"] | null;
  payload: Record<string, unknown> | null;
  steps: MarketplaceOrchestratorStep[];
  finalAnswer: string;
  citations: string[];
  rawServiceResponse: unknown;
  budget: {
    maxBudgetUsdc: string;
    spentUsdc: string;
    remainingUsdc: string;
    enforced: true;
  };
  completedAt: number;
  status: "completed" | "planned" | "failed";
}

interface Plan {
  searchQuery: string;
  reason: string;
}

export async function runMarketplaceOrchestrator(params: {
  request: string;
  maxBudgetUsdc?: string;
  executePaid?: boolean;
  walletAddress?: string;
  chain?: string;
}) {
  const request = params.request.trim().slice(0, 500);
  const budget = createAgentBudgetPolicy(params.maxBudgetUsdc ?? "0.02");
  const steps: MarketplaceOrchestratorStep[] = [];
  const plan = await createPlan(request);
  const mode = params.executePaid ? "paid" : "dry_run";

  const searchStart = Date.now();
  let services: NormalizedCircleService[] = [];
  try {
    services = await searchCircleServices(plan.searchQuery, 6);
    steps.push({
      step: 1,
      action: `Searched Circle Agent Marketplace for "${plan.searchQuery}"`,
      status: "done",
      result: {
        reason: plan.reason,
        servicesFound: services.length,
        providers: services.slice(0, 4).map((service) => service.provider),
      },
      durationMs: Date.now() - searchStart,
    });
  } catch (error) {
    steps.push({
      step: 1,
      action: "Searched Circle Agent Marketplace",
      status: "failed",
      result: errorMessage(error),
      durationMs: Date.now() - searchStart,
    });
    return failedResult(request, mode, plan.searchQuery, steps, budget);
  }

  const selected = selectService(services, request);
  if (!selected) {
    steps.push({
      step: 2,
      action: "Selected a payable external service",
      status: "failed",
      result: "No suitable Circle Marketplace service was returned for this request.",
      durationMs: 0,
    });
    return failedResult(request, mode, plan.searchQuery, steps, budget);
  }

  const resolvedUrl = resolveServiceUrl(selected.resource, request);
  const payload = buildPayload(selected, request);
  const serviceSummary = summarizeService(selected, resolvedUrl);

  const inspectStart = Date.now();
  let priceUsdc = selected.priceUsdc;
  try {
    const inspection = await inspectCircleService({
      url: resolvedUrl,
      method: selected.method,
      data: payload,
    });
    priceUsdc = inspection.priceUsdc ?? priceUsdc;
    steps.push({
      step: 2,
      action: `Inspected ${selected.provider} service schema and payment terms`,
      status: "done",
      service: { ...serviceSummary, priceUsdc, chain: inspection.chain ?? selected.chain },
      result: {
        status: inspection.status,
        httpStatus: inspection.httpStatus,
        method: inspection.method,
        priceUsdc,
        chain: inspection.chain ?? selected.chain,
        scheme: inspection.scheme ?? selected.scheme,
      },
      durationMs: Date.now() - inspectStart,
    });
  } catch (error) {
    steps.push({
      step: 2,
      action: `Inspected ${selected.provider} service schema and payment terms`,
      status: "failed",
      service: serviceSummary,
      result: errorMessage(error),
      durationMs: Date.now() - inspectStart,
    });
  }

  const finalPrice = priceUsdc ?? "0";
  const decision = budget.approve(finalPrice);
  if (!decision.approved) {
    steps.push({
      step: 3,
      action: "Checked run budget before external payment",
      status: "skipped",
      service: { ...serviceSummary, priceUsdc: finalPrice },
      result: decision,
      durationMs: 0,
    });
    return plannedResult(request, mode, plan.searchQuery, serviceSummary, payload, steps, budget, finalPrice);
  }

  if (!params.executePaid) {
    steps.push({
      step: 3,
      action: "Prepared paid call without spending USDC",
      status: "skipped",
      service: { ...serviceSummary, priceUsdc: finalPrice },
      result: {
        dryRun: true,
        nextAction: "Set executePaid=true with a funded Circle services wallet to call this service.",
        payload,
      },
      durationMs: 0,
    });
    return plannedResult(request, mode, plan.searchQuery, serviceSummary, payload, steps, budget, finalPrice);
  }

  const walletAddress = params.walletAddress ?? process.env.CIRCLE_SERVICES_WALLET_ADDRESS;
  const chain = params.chain ?? process.env.CIRCLE_SERVICES_CHAIN ?? selected.chain ?? "BASE";
  if (!walletAddress) {
    steps.push({
      step: 3,
      action: "Paid selected Circle Marketplace service",
      status: "failed",
      service: { ...serviceSummary, priceUsdc: finalPrice, chain },
      result: "CIRCLE_SERVICES_WALLET_ADDRESS is not configured.",
      durationMs: 0,
    });
    return failedResult(request, mode, plan.searchQuery, steps, budget);
  }

  const payStart = Date.now();
  try {
    const paid = await payCircleService({
      url: resolvedUrl,
      method: selected.method,
      address: walletAddress,
      chain,
      data: payload,
      maxAmountUsdc: finalPrice === "0" ? undefined : finalPrice,
    });
    budget.recordSpend(finalPrice);
    const answer = await synthesizeAnswer(request, paid.raw);
    steps.push({
      step: 3,
      action: `Paid and called ${selected.provider}`,
      status: "done",
      service: { ...serviceSummary, priceUsdc: finalPrice, chain },
      result: summarizeExternalResponse(paid.raw),
      durationMs: Date.now() - payStart,
    });
    return {
      request,
      mode,
      searchQuery: plan.searchQuery,
      selectedService: { ...serviceSummary, priceUsdc: finalPrice, chain },
      payload,
      steps,
      finalAnswer: answer.answer,
      citations: answer.citations,
      rawServiceResponse: paid.raw,
      budget: budgetSnapshot(budget),
      completedAt: Date.now(),
      status: "completed",
    } satisfies MarketplaceOrchestratorResult;
  } catch (error) {
    steps.push({
      step: 3,
      action: `Paid and called ${selected.provider}`,
      status: "failed",
      service: { ...serviceSummary, priceUsdc: finalPrice, chain },
      result: errorMessage(error),
      durationMs: Date.now() - payStart,
    });
    return failedResult(request, mode, plan.searchQuery, steps, budget);
  }
}

async function createPlan(request: string): Promise<Plan> {
  return {
    searchQuery: inferSearchQuery(request),
    reason: "Heuristic keyword extraction from the user request.",
  };
}

function inferSearchQuery(request: string) {
  const lower = request.toLowerCase();
  if (/\b(btc|bitcoin|eth|ethereum|crypto|token|coin|price)\b/.test(lower)) return "crypto price";
  if (/\b(weather|forecast|rain|temperature)\b/.test(lower)) return "weather";
  if (/\b(sports|nba|nfl|score|odds)\b/.test(lower)) return "sports stats";
  if (/\b(tweet|twitter|x.com|social)\b/.test(lower)) return "twitter search";
  if (/\b(paper|academic|research)\b/.test(lower)) return "research papers";
  return "web search";
}

function selectService(services: NormalizedCircleService[], request: string) {
  const lower = request.toLowerCase();
  const symbolRequest = /\b(btc|bitcoin|eth|ethereum|sol|solana|usdc)\b/.test(lower);

  return [...services].sort((a, b) => scoreService(b, symbolRequest) - scoreService(a, symbolRequest))[0];
}

function scoreService(service: NormalizedCircleService, symbolRequest: boolean) {
  let score = 0;
  const text = `${service.provider} ${service.description} ${service.tags.join(" ")}`.toLowerCase();
  if (service.supportsVanillax402) score += 4;
  if (service.chain === "BASE") score += 3;
  if (service.priceUsdc) score += 2;
  if (service.method === "POST") score += 1;
  if (symbolRequest && text.includes("price")) score += 5;
  if (text.includes("search")) score += 2;
  if (service.supportsCircleGateway) score += 1;
  return score;
}

function resolveServiceUrl(resource: string, request: string) {
  if (!resource.includes("{symbol}")) return resource;
  return resource.replace("{symbol}", encodeURIComponent(extractSymbol(request)));
}

function extractSymbol(request: string) {
  const lower = request.toLowerCase();
  if (lower.includes("ethereum") || /\beth\b/.test(lower)) return "ETH";
  if (lower.includes("solana") || /\bsol\b/.test(lower)) return "SOL";
  if (lower.includes("usdc")) return "USDC";
  return "BTC";
}

function buildPayload(service: NormalizedCircleService, request: string) {
  if (service.method === "GET") return null;

  const resource = service.resource.toLowerCase();
  if (resource.includes("parallelmpp.dev/api/search")) {
    return { query: request, objective: request, mode: "fast" };
  }
  if (resource.includes("tavily/search")) {
    return { query: request, topic: "general", max_results: 5, search_depth: "basic", include_answer: true };
  }
  if (resource.includes("perplexity") || resource.includes("sonar")) {
    return {
      model: "sonar",
      messages: [{ role: "user", content: request }],
      temperature: 0.2,
      return_citations: true,
      search_context: "low",
    };
  }
  return { query: request };
}

function summarizeService(service: NormalizedCircleService, resource?: string) {
  return {
    resource: resource ?? service.resource,
    provider: service.provider,
    description: service.description,
    method: service.method,
    priceUsdc: service.priceUsdc,
    chain: service.chain,
    scheme: service.scheme,
  };
}

async function synthesizeAnswer(request: string, raw: unknown) {
  const fallback = {
    answer: `The selected Circle Marketplace service returned data for: ${request}. See the raw response for details.`,
    citations: extractCitations(raw),
  };
  return generateStructured<{ answer: string; citations: string[] }>(
    `Summarize this paid Circle Marketplace service response for the user.

User request: ${request}
Raw response JSON:
${JSON.stringify(raw).slice(0, 12000)}

Return JSON with a concise answer and citations array.`,
    fallback,
  );
}

function summarizeExternalResponse(raw: unknown) {
  const json = JSON.stringify(raw);
  return {
    preview: json.length > 1200 ? `${json.slice(0, 1200)}...` : json,
    citations: extractCitations(raw).slice(0, 5),
  };
}

function extractCitations(raw: unknown): string[] {
  const citations = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || citations.size >= 12) return;
    if (typeof value === "string") {
      if (/^https?:\/\//.test(value)) citations.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  visit(raw);
  return [...citations];
}

function plannedResult(
  request: string,
  mode: "dry_run" | "paid",
  searchQuery: string,
  service: MarketplaceOrchestratorStep["service"],
  payload: Record<string, unknown> | null,
  steps: MarketplaceOrchestratorStep[],
  budget: ReturnType<typeof createAgentBudgetPolicy>,
  priceUsdc: string,
) {
  return {
    request,
    mode,
    searchQuery,
    selectedService: service ? { ...service, priceUsdc } : null,
    payload,
    steps,
    finalAnswer:
      "ArcStream found a Circle Marketplace service and prepared the paid API call. Payment is disabled for this run, so no USDC was spent.",
    citations: [],
    rawServiceResponse: null,
    budget: budgetSnapshot(budget),
    completedAt: Date.now(),
    status: "planned",
  } satisfies MarketplaceOrchestratorResult;
}

function failedResult(
  request: string,
  mode: "dry_run" | "paid",
  searchQuery: string,
  steps: MarketplaceOrchestratorStep[],
  budget: ReturnType<typeof createAgentBudgetPolicy>,
) {
  return {
    request,
    mode,
    searchQuery,
    selectedService: null,
    payload: null,
    steps,
    finalAnswer: "ArcStream could not complete the Circle Marketplace orchestration for this request.",
    citations: [],
    rawServiceResponse: null,
    budget: budgetSnapshot(budget),
    completedAt: Date.now(),
    status: "failed",
  } satisfies MarketplaceOrchestratorResult;
}

function budgetSnapshot(budget: ReturnType<typeof createAgentBudgetPolicy>) {
  return {
    maxBudgetUsdc: budget.maxBudgetUsdc,
    spentUsdc: budget.spentUsdc(),
    remainingUsdc: budget.remainingUsdc(),
    enforced: true as const,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
