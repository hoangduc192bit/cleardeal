import { createAgentBudgetPolicy } from "@/lib/agent-budget";
import { payWithCircleAgentWallet, type CircleTransferResult } from "@/lib/circle-agent-wallet";
import { getToolById } from "@/lib/tool-catalog";
import type { Tool } from "@/lib/tool-catalog";

export interface ResearchAgentStep {
  step: number;
  action: string;
  toolId: string | null;
  costUsdc: string | null;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  result: unknown;
  durationMs: number | null;
}

export interface ResearchAgentReport {
  topic: string;
  steps: ResearchAgentStep[];
  totalCostUsdc: string;
  toolsUsed: string[];
  report: {
    title: string;
    executiveSummary: string;
    sections: { heading: string; content: string }[];
    conclusion: string;
    generatedAt: number;
  } | null;
  completedAt: number;
  status: "completed" | "partial" | "failed";
  budget: {
    maxBudgetUsdc: string;
    spentUsdc: string;
    remainingUsdc: string;
    enforced: true;
  };
}

async function callTool<T>(
  tool: Tool,
  body: Record<string, unknown>,
  baseUrl: string,
  agentPrivateKey?: string,
): Promise<{ data: T | null; durationMs: number; payment: CircleTransferResult | null }> {
  const start = Date.now();
  try {
    const payment = await payWithCircleAgentWallet({
      to: tool.providerWallet,
      amountUsdc: tool.pricePerCall,
      agentPrivateKey,
    });
    const res = await fetch(`${baseUrl}${tool.endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-arcstream-payment-tx": payment.txHash,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return {
      data: res.ok ? (json.payload as T) : null,
      durationMs: Date.now() - start,
      payment,
    };
  } catch {
    return { data: null, durationMs: Date.now() - start, payment: null };
  }
}

function createBudgetSkippedStep(step: number, tool: Tool): ResearchAgentStep {
  return {
    step,
    action: `Skipped ${tool.name} because the run budget would be exceeded`,
    toolId: tool.id,
    costUsdc: tool.pricePerCall,
    status: "skipped",
    result: { reason: "budget_exceeded" },
    durationMs: 0,
  };
}

export async function runResearchAgent(
  topic: string,
  baseUrl: string,
  maxBudgetUsdc = process.env.DEFAULT_AGENT_MAX_BUDGET_USDC ?? "0.50",
  persona = "business",
  agentPrivateKey?: string,
  instructions?: string,
): Promise<ResearchAgentReport> {
  const steps: ResearchAgentStep[] = [];
  const budget = createAgentBudgetPolicy(maxBudgetUsdc);
  const toolsUsed: string[] = [];

  steps.push({
    step: 1,
    action: "Querying ArcStream catalog for research tools",
    toolId: null,
    costUsdc: null,
    status: "running",
    result: null,
    durationMs: null,
  });

  const catalogStart = Date.now();
  let tools: Tool[] = [];
  try {
    const catalogRes = await fetch(`${baseUrl}/api/catalog?maxPrice=0.10`);
    const catalogData = await catalogRes.json();
    tools = catalogData.tools ?? [];
    steps[0].status = "done";
    steps[0].result = {
      toolsFound: tools.length,
      tools: tools.map((t: Tool) => `${t.name} ($${t.pricePerCall})`),
      maxBudgetUsdc: budget.maxBudgetUsdc,
    };
    steps[0].durationMs = Date.now() - catalogStart;
  } catch {
    steps[0].status = "failed";
    steps[0].durationMs = Date.now() - catalogStart;
  }

  const getToolFromCatalog = (id: string): Tool | undefined => tools.find((t: Tool) => t.id === id);

  // Define active tools for the selected persona
  const activeToolIds =
    persona === "web3"
      ? ["sentiment", "web-intel"]
      : persona === "social"
        ? ["summarize", "sentiment"]
        : ["analyze", "web-intel"]; // default "business"

  const findings: string[] = [];
  let stepCounter = 2;

  // Run each tool sequentially
  for (const toolId of activeToolIds) {
    const tool = getToolFromCatalog(toolId);
    if (!tool) continue;

    if (!budget.approve(tool.pricePerCall).approved) {
      steps.push(createBudgetSkippedStep(stepCounter++, tool));
      continue;
    }

    const currentStepIndex = steps.length;
    steps.push({
      step: stepCounter++,
      action: `Calling ${tool.name} - $${tool.pricePerCall} USDC`,
      toolId: tool.id,
      costUsdc: tool.pricePerCall,
      status: "running",
      result: null,
      durationMs: null,
    });

    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1`;

    let toolInput: Record<string, unknown> = {};
    if (toolId === "analyze") {
      toolInput = { company: topic, focus: "full" };
    } else if (toolId === "web-intel") {
      toolInput = { url: searchUrl, query: topic };
    } else if (toolId === "sentiment") {
      toolInput = { text: topic, context: persona === "web3" ? "finance" : "general" };
    } else if (toolId === "summarize") {
      toolInput = { text: topic, maxWords: 150 };
    }

    const { data: resultData, durationMs, payment } = await callTool<unknown>(
      tool,
      toolInput,
      baseUrl,
      agentPrivateKey,
    );

    steps[currentStepIndex].status = resultData ? "done" : "failed";
    steps[currentStepIndex].result = resultData
      ? { ...(resultData as Record<string, unknown>), x402Payment: payment }
      : { x402Payment: payment };
    steps[currentStepIndex].durationMs = durationMs;

    if (resultData) {
      budget.recordSpend(tool.pricePerCall);
      toolsUsed.push(toolId);

      // Format findings
      if (toolId === "analyze") {
        const r = resultData as { strengths?: string[]; weaknesses?: string[]; positioning?: string };
        findings.push(`Strengths: ${r.strengths?.join(", ")}. Weaknesses: ${r.weaknesses?.join(", ")}. Positioning: ${r.positioning}`);
      } else if (toolId === "web-intel") {
        const r = resultData as { summary?: string; keyFacts?: string[] };
        findings.push(`Web search context: ${r.summary}. Key facts: ${r.keyFacts?.slice(0, 3).join("; ")}`);
      } else if (toolId === "sentiment") {
        const r = resultData as { score?: number; label?: string; reasoning?: string };
        findings.push(`Sentiment analysis: Score is ${r.score} (${r.label}). Reasoning: ${r.reasoning}`);
      } else if (toolId === "summarize") {
        const r = resultData as { summary?: string; keyPoints?: string[] };
        findings.push(`Text summary: ${r.summary}. Key highlights: ${r.keyPoints?.join("; ")}`);
      }
    }
  }

  // 3. Synthesis Report step
  let finalReport: ResearchAgentReport["report"] = null;
  const reportTool = getToolById("report-writer")!;
  const reportStepIndex = steps.length;

  // Customize prompt based on persona
  let customFormat = "brief";
  if (persona === "social") {
    customFormat = "social digest email format with subject line";
  } else if (persona === "web3") {
    customFormat = "market token signal report format";
  }

  if (!budget.approve(reportTool.pricePerCall).approved) {
    steps.push(createBudgetSkippedStep(stepCounter, reportTool));
  } else if (findings.length === 0) {
    steps.push({
      step: stepCounter,
      action: "Skipped Report Writer because there were no successful findings to synthesize",
      toolId: "report-writer",
      costUsdc: reportTool.pricePerCall,
      status: "skipped",
      result: { reason: "no_findings" },
      durationMs: 0,
    });
  } else {
    steps.push({
      step: stepCounter,
      action: `Calling Report Writer - $${reportTool.pricePerCall} USDC`,
      toolId: "report-writer",
      costUsdc: reportTool.pricePerCall,
      status: "running",
      result: null,
      durationMs: null,
    });

    const reportTitle =
      persona === "web3"
        ? `Crypto Sentiment Report: ${topic}`
        : persona === "social"
          ? `Social Digest: ${topic}`
          : `Business Report: ${topic}`;

    const { data: reportResult, durationMs, payment } = await callTool<NonNullable<ResearchAgentReport["report"]>>(
      reportTool,
      { topic: reportTitle, findings, format: customFormat, instructions },
      baseUrl,
      agentPrivateKey,
    );
    finalReport = reportResult;
    if (reportResult) {
      budget.recordSpend(reportTool.pricePerCall);
      toolsUsed.push("report-writer");
      steps[reportStepIndex].status = "done";
    } else {
      steps[reportStepIndex].status = "failed";
    }
    steps[reportStepIndex].durationMs = durationMs;
    steps[reportStepIndex].result = reportResult
      ? { ...reportResult, x402Payment: payment }
      : { x402Payment: payment };
  }

  const successCount = steps.filter((s) => s.status === "done").length;
  const status = successCount === steps.length ? "completed" : successCount > 0 ? "partial" : "failed";

  return {
    topic,
    steps,
    totalCostUsdc: budget.spentUsdc(),
    toolsUsed,
    report: finalReport,
    completedAt: Date.now(),
    status,
    budget: {
      maxBudgetUsdc: budget.maxBudgetUsdc,
      spentUsdc: budget.spentUsdc(),
      remainingUsdc: budget.remainingUsdc(),
      enforced: true,
    },
  };
}
