"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Play,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Shield,
  AlertCircle,
  RotateCcw,
  Globe,
} from "lucide-react";
import type {
  ResearchAgentReport,
  ResearchAgentStep,
} from "@/agents/research-agent";

type Phase = "idle" | "running" | "revealing" | "done" | "failed";

interface PersonaConfig {
  id: "business" | "web3" | "social";
  name: string;
  emoji: string;
  cost: string;
  description: string;
  topics: string[];
}

const PERSONAS: PersonaConfig[] = [
  {
    id: "business",
    name: "Business Analyst",
    emoji: "💼",
    cost: "0.12",
    description: "Runs business SWOT analysis and market trend research.",
    topics: [
      "Analyze competitors in the offset printing market",
      "Evaluate the SWOT of Circle Financial's USDC payment model",
      "Research 2026 carton paper raw material price trends"
    ],
  },
  {
    id: "web3",
    name: "Web3 Researcher",
    emoji: "🌐",
    cost: "0.09",
    description: "Scans Web3 signals and scores crypto market sentiment.",
    topics: [
      "Measure market sentiment around Bitcoin price forecasts",
      "Analyze DeFi trends and gas costs on Arc",
      "Evaluate USDC stablecoin growth on Base"
    ],
  },
  {
    id: "social",
    name: "Social Writer",
    emoji: "📝",
    cost: "0.08",
    description: "Summarizes news and writes email digests or brand posts.",
    topics: [
      "Write a social post promoting eco-friendly offset printing",
      "Draft a newsletter about AI Agent wallet benefits for businesses",
      "Write a short post about 2026 remote-work trends"
    ],
  },
];

const glass =
  "bg-gradient-to-br from-white/80 to-white/55 backdrop-blur-[24px] border border-white/75 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.85),0_8px_32px_-4px_rgba(0,0,0,0.06)]";

function StepCard({
  step,
  index,
}: {
  step: ResearchAgentStep;
  index: number;
}) {
  const statusConfig = {
    done: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      ring: "ring-emerald-200 bg-emerald-50",
    },
    failed: {
      icon: <XCircle className="w-4 h-4 text-red-500" />,
      ring: "ring-red-200 bg-red-50",
    },
    skipped: {
      icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
      ring: "ring-amber-200 bg-amber-50",
    },
    running: {
      icon: <Loader2 className="w-4 h-4 text-[#0084FF] animate-spin" />,
      ring: "ring-blue-200 bg-blue-50",
    },
    pending: {
      icon: <Clock className="w-4 h-4 text-gray-400" />,
      ring: "ring-gray-200 bg-gray-50",
    },
  }[step.status];

  const registryMapping: Record<string, { name: string; url: string; registryId: string; provider: "1P" | "3P" }> = {
    summarize: { name: "AgentMail (1P)", url: "https://agents.circle.com/services", registryId: "01", provider: "1P" },
    "web-intel": { name: "Tavily Search (3P)", url: "https://agents.circle.com/services", registryId: "04", provider: "3P" },
    analyze: { name: "Perplexity AI (3P)", url: "https://agents.circle.com/services", registryId: "08", provider: "3P" },
    sentiment: { name: "Sentiment Scorer (3P)", url: "https://agents.circle.com/services", registryId: "12", provider: "3P" },
  };

  const circleTool = step.toolId ? registryMapping[step.toolId] : null;

  const resultLabel =
    step.status === "done" && step.result
      ? step.toolId === "analyze"
        ? "Strengths, weaknesses, opportunities extracted"
        : step.toolId === "web-intel"
          ? "Key facts extracted from web source"
          : step.toolId === "sentiment"
            ? "External sentiment signal scored"
            : step.toolId === "summarize"
              ? "External document digested"
              : step.toolId === null && (step.result as { internalReasoning?: boolean }).internalReasoning
                ? "Internal synthesis completed - no x402 payment charged"
                : `${(step.result as { toolsFound?: number }).toolsFound ?? 0} tools found in catalog`
      : step.status === "failed"
        ? "Tool call failed"
        : step.status === "skipped"
          ? "Budget policy blocked this call before payment"
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.45,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`${glass} rounded-2xl p-4 flex items-start gap-3.5`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center ring-1 flex-shrink-0 mt-0.5 ${statusConfig.ring}`}
      >
        {statusConfig.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[14px] font-semibold text-neutral-800 leading-tight"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            {step.action}
          </span>
          {step.costUsdc && (
            <span
              className="text-[12px] font-mono font-bold text-[#0084FF] shrink-0"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              ${step.costUsdc}
            </span>
          )}
        </div>
        {resultLabel && (
          <p
            className="text-[12px] text-neutral-500 mt-1 leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            {resultLabel}
          </p>
        )}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {step.durationMs !== null && (
            <span
              className="text-[11px] text-neutral-400 font-mono mr-1"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              {step.durationMs}ms
            </span>
          )}

          {circleTool && (
            <a
              href={circleTool.url}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                circleTool.provider === "1P"
                  ? "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100/60"
                  : "bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-100/60"
              }`}
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              <Globe className="w-3 h-3" />
              Circle Registry: #{circleTool.registryId} ({circleTool.name})
            </a>
          )}

          {(() => {
            const tx = (step.result as { x402Payment?: { txHash?: string } } | null)?.x402Payment?.txHash;
            return tx ? (
              <a
                href={`https://testnet.arcscan.app/tx/${tx}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-100 bg-emerald-50 text-[10px] font-mono font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                Receipt: {tx.slice(0, 6)}...{tx.slice(-4)}
              </a>
            ) : null;
          })()}
        </div>
      </div>
    </motion.div>
  );
}

export function ResearchAgentDemo() {
  const [persona, setPersona] = useState<"business" | "web3" | "social">("business");
  const [topic, setTopic] = useState(PERSONAS[0].topics[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleSteps, setVisibleSteps] = useState<ResearchAgentStep[]>([]);
  const [report, setReport] = useState<ResearchAgentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accruedCost, setAccruedCost] = useState(0);
  const [runningLog, setRunningLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const [activeAgent, setActiveAgent] = useState<{
    id: string;
    name: string;
    persona: "business" | "web3" | "social";
    address: string;
    instructions?: string;
  } | null>(null);

  function addRunLog(msg: string) {
    setRunningLog((prev) => [msg, ...prev].slice(0, 20));
  }

  // Sync active agent from localStorage
  useEffect(() => {
    const loadActiveAgent = () => {
      const saved = localStorage.getItem("arcstream_active_agent");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setActiveAgent(parsed);
          setPersona(parsed.persona);
        } catch (e) {
          console.error(e);
        }
      } else {
        setActiveAgent(null);
      }
    };

    loadActiveAgent();
    window.addEventListener("activeAgentChanged", loadActiveAgent);
    return () => {
      window.removeEventListener("activeAgentChanged", loadActiveAgent);
    };
  }, []);

  const handlePersonaChange = (p: "business" | "web3" | "social") => {
    setPersona(p);
    const config = PERSONAS.find((x) => x.id === p);
    if (config) {
      setTopic(config.topics[0]);
    }
  };

  async function runAgent() {
    if (!topic.trim()) return;

    // Check for scheduling intent keywords (Vietnamese & English)
    const isSchedulingKeyword = /every day|daily|every monday|schedule|cron|at 5am|at 5:00/i.test(topic);
    if (isSchedulingKeyword) {
      setPhase("running");
      setVisibleSteps([]);
      setReport(null);
      setError(null);
      setAccruedCost(0);
      setRunningLog([
        "Analyzing scheduling intent with Google Gemini...",
        `Prompt: "${topic}"`,
      ]);

      try {
        const scheduleRes = await fetch("/api/agent/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: topic }),
        });

        if (scheduleRes.ok) {
          const parsedSchedule = await scheduleRes.json();
          if (parsedSchedule.isSchedule) {
            // Save to localStorage
            const savedWorkflows = localStorage.getItem("arcstream_workflows");
            const list = savedWorkflows ? JSON.parse(savedWorkflows) : [];
            const newWorkflow = {
              id: Math.random().toString(36).substring(2, 9),
              agentId: activeAgent ? activeAgent.id : "default",
              agentName: activeAgent ? activeAgent.name : "Default Agent",
              name: parsedSchedule.subject || "AI Report",
              objective: parsedSchedule.subject || "Build and deliver a recurring agent report.",
              trigger: parsedSchedule.humanReadable || "Daily at 5:00 UTC",
              cronExpression: parsedSchedule.cronExpression || "0 5 * * *",
              budgetUsdc: parsedSchedule.budgetUsdc || "0.50",
              tools: parsedSchedule.tools || ["ArcStream tool catalog"],
              destinations: parsedSchedule.destinations || ["Gmail", "Telegram"],
              status: "ready",
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem("arcstream_workflows", JSON.stringify([...list, newWorkflow]));
            window.dispatchEvent(new Event("workflowsChanged"));

            setPhase("idle");
            alert(`🎉 Workflow created!\n\nWorkflow: "${newWorkflow.name}"\nTrigger: ${newWorkflow.trigger}\nBudget: ${newWorkflow.budgetUsdc} USDC/day\nDelivery: ${newWorkflow.destinations.join(", ")}`);
            setTopic("");
            return;
          }
        }
      } catch (err) {
        console.error("Failed to parse scheduling intent:", err);
      }
    }

    setPhase("running");
    setVisibleSteps([]);
    setReport(null);
    setError(null);
    setAccruedCost(0);
    setRunningLog([
      `Initializing ${activeAgent ? activeAgent.name : (PERSONAS.find((p) => p.id === persona)?.name ?? "Agent")}...`,
      `Run role: ${PERSONAS.find((p) => p.id === persona)?.name ?? "Agent"}`,
      activeAgent ? `Agent Wallet: ${activeAgent.address}` : `Using Server Default Wallet`,
      `Topic: "${topic}"`,
      `Loading policy: max $0.50 USDC | enforced before each x402 call`,
    ]);

    const logInterval = setInterval(() => {
      const logs = [
        "Querying ArcStream Tool Catalog...",
        "Filtering by capability: analyze, research...",
        "Selecting optimal tools within budget...",
        "Dispatching agent tasks...",
        "Waiting for Gemini analysis...",
        "Processing web intelligence...",
        "Synthesizing findings...",
      ];
      addRunLog(logs[Math.floor(Math.random() * logs.length)]);
    }, 800);

    try {
      const res = await fetch("/api/agent/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          maxBudgetUsdc: "0.50",
          persona,
          paymentMode: "demo",
          agentAddress: activeAgent ? activeAgent.address : undefined,
          instructions: activeAgent ? activeAgent.instructions : undefined,
        }),
      });

      clearInterval(logInterval);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }

      const data: ResearchAgentReport = await res.json();
      setPhase("revealing");

      for (let i = 0; i < data.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 450));
        setVisibleSteps((prev) => [...prev, data.steps[i]]);
        if (data.steps[i].status === "done" && data.steps[i].costUsdc) {
          setAccruedCost(
            (prev) => prev + parseFloat(data.steps[i].costUsdc!),
          );
        }
      }

      await new Promise((r) => setTimeout(r, 300));
      setReport(data);
      setPhase("done");
    } catch (e) {
      clearInterval(logInterval);
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setPhase("failed");
    }
  }

  const isBusy = phase === "running" || phase === "revealing";
  const showLog = phase === "running";
  const showSteps =
    phase === "revealing" || phase === "done" || phase === "failed";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* ── Left: Config ── */}
      <div className={`${glass} rounded-3xl p-7 flex flex-col gap-6`}>
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0084FF, #0055CC)",
                boxShadow: "0 4px 10px rgba(0,132,255,0.25)",
              }}
            >
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="text-[11px] font-bold text-[#0084FF] uppercase tracking-widest"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Research Agent
            </span>
          </div>
          <h2
            className="text-2xl font-black text-neutral-900 tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Watch an agent pay per call,<br /> build a report.
          </h2>
          <p
            className="text-[14px] text-neutral-500 mt-2 leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Agent queries the catalog, selects tools, pays via x402, then
            synthesizes a report. Every call has an on-chain receipt.
          </p>
        </div>




        {/* Topic input */}
        <div>
          <label
            className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest block mb-2"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Task prompt / Details
          </label>
          <input
            className="w-full bg-white/80 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-neutral-800 outline-none focus:border-[#0084FF] focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-neutral-400 disabled:opacity-50"
            disabled={isBusy}
            maxLength={200}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Analyze competitors in the offset printing market..."
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            type="text"
            value={topic}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Analyze competitors in the offset printing market",
              "Measure market sentiment around Bitcoin price forecasts",
              "Evaluate USDC stablecoin growth on Base and Arc",
            ].map((t) => (
              <button
                className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[11px] font-medium text-neutral-500 hover:border-[#0084FF] hover:text-[#0084FF] hover:bg-neutral-50 transition-all disabled:opacity-40 cursor-pointer"
                disabled={isBusy}
                key={t}
                onClick={() => setTopic(t)}
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Policy badge */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
          <Shield className="w-4 h-4 text-[#0084FF] flex-shrink-0" />
          <div>
            <div
              className="text-[12px] font-semibold text-[#0084FF]"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              On-Chain Cap Active
            </div>
            <div
              className="text-[12px] text-blue-700/85 mt-0.5"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Estimated cost: ~$0.10 USDC · Enforced on-chain
            </div>
          </div>
        </div>

        {/* Run button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#0084FF] to-[#006EE6] text-white font-bold text-[15px] flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          disabled={isBusy || !topic.trim()}
          onClick={runAgent}
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          type="button"
        >
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {phase === "running" ? "Agent running..." : "Revealing steps..."}
            </>
          ) : phase === "done" ? (
            <>
              <RotateCcw className="w-4 h-4" />
              Run again
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run research agent
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        {/* Live terminal log */}
        <AnimatePresence>
          {showLog && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                ref={logRef}
                className="bg-neutral-950 rounded-2xl p-4 max-h-[160px] overflow-y-auto"
              >
                {runningLog.map((line, i) => (
                  <motion.div
                    key={`${line}-${i}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[12px] font-mono text-emerald-400 leading-6"
                  >
                    <span className="text-emerald-600 mr-2">›</span>
                    {line}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        {phase === "failed" && error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100"
          >
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <div
                className="text-[13px] font-semibold text-red-700"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                Agent failed
              </div>
              <div
                className="text-[12px] text-red-600 mt-0.5 font-mono"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                {error}
              </div>
            </div>
          </motion.div>
        )}

        {/* How it works (idle) */}
        {phase === "idle" && (
          <div
            className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
              How it works
            </div>
            <ol className="space-y-2">
              {[
                ["01", "Choose an Agent Role and topic"],
                ["02", "Agent discovers required tools from catalog"],
                ["03", "Pays only for external data/tool calls"],
                ["04", "Synthesizes the final report internally at no extra x402 charge"],
              ].map(([n, text]) => (
                <li key={n} className="flex gap-3 text-[12px]">
                  <span className="text-[#0084FF] font-bold font-mono shrink-0">
                    {n}
                  </span>
                  <span className="text-neutral-500">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* ── Right: Results ── */}
      <div className={`${glass} rounded-3xl p-7 flex flex-col gap-6`}>
        {/* Cost counter */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Total cost
            </div>
            <motion.div
              key={Math.round(accruedCost * 10000)}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-4xl font-black font-mono tracking-tight text-neutral-900"
            >
              ${accruedCost.toFixed(4)}
            </motion.div>
            <div
              className="text-[12px] text-neutral-400 mt-0.5"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              USDC - Arc Testnet
            </div>
          </div>
          {phase === "done" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 250 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span
                className="text-[12px] font-semibold text-emerald-700"
                style={{
                  fontFamily: "var(--font-inter, Inter, sans-serif)",
                }}
              >
                Budget enforced
              </span>
            </motion.div>
          )}
          {(phase === "running" || phase === "revealing") && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
              <Loader2 className="w-3 h-3 text-[#0084FF] animate-spin" />
              <span
                className="text-[12px] font-semibold text-[#0084FF]"
                style={{
                  fontFamily: "var(--font-inter, Inter, sans-serif)",
                }}
              >
                {phase === "running" ? "Running" : "Revealing"}
              </span>
            </div>
          )}
        </div>

        {/* Budget bar */}
        {(report || accruedCost > 0) && (
          <div>
            <div
              className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1.5"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              <span>Budget used</span>
              <span>${accruedCost.toFixed(2)} / $0.50</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#0084FF] to-[#006EE6]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (accruedCost / 0.5) * 100)}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        )}

        {/* Cost breakdown (done) */}
        {report && (
          <div className="grid grid-cols-2 gap-2 p-4 rounded-2xl bg-white/60 border border-gray-100">
            {report.steps
              .filter((s) => s.costUsdc)
              .map((s) => (
                <div
                  key={s.step}
                  className="flex justify-between text-[12px]"
                  style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                >
                  <span className="text-neutral-500 capitalize">{s.toolId}</span>
                  <span className="font-mono font-bold text-[#0084FF]">
                    ${s.costUsdc}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Idle state placeholder */}
        {phase === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #e8f2ff 0%, #d4e8ff 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 16px rgba(0,132,255,0.10)",
              }}
            >
              <Zap className="w-7 h-7 text-[#0084FF]" />
            </div>
            <div>
              <div
                className="text-[16px] font-bold text-neutral-700"
                style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
              >
                Ready to run
              </div>
              <div
                className="text-[13px] text-neutral-400 mt-1"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                Select a topic and click Run Agent to begin
              </div>
            </div>
          </div>
        )}

        {/* Running placeholder */}
        {phase === "running" && visibleSteps.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="w-8 h-8 text-[#0084FF] animate-spin" />
            <div
              className="text-[14px] text-neutral-500"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Agent is working...
            </div>
          </div>
        )}

        {/* Steps */}
        {showSteps && visibleSteps.length > 0 && (
          <div className="flex flex-col gap-3">
            <div
              className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Agent steps
            </div>
            {visibleSteps.map((step, i) => (
              <StepCard key={`${step.step}-${i}`} step={step} index={i} />
            ))}
          </div>
        )}

        {/* Final report */}
        {report?.report && phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Final report
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.04)] max-h-[440px] overflow-y-auto">
              <h3
                className="text-[18px] font-black text-neutral-900 tracking-tight mb-3"
                style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
              >
                {report.report.title}
              </h3>
              <p
                className="text-[13px] text-neutral-600 leading-relaxed mb-4"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                {report.report.executiveSummary}
              </p>
              {report.report.sections.map((section, i) => (
                <div className="mb-4" key={i}>
                  <div
                    className="text-[10px] font-bold text-[#0084FF] uppercase tracking-widest mb-1.5"
                    style={{
                      fontFamily: "var(--font-inter, Inter, sans-serif)",
                    }}
                  >
                    {section.heading}
                  </div>
                  <p
                    className="text-[13px] text-neutral-500 leading-relaxed"
                    style={{
                      fontFamily: "var(--font-inter, Inter, sans-serif)",
                    }}
                  >
                    {section.content}
                  </p>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <div
                  className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5"
                  style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                >
                  Conclusion
                </div>
                <p
                  className="text-[13px] text-neutral-600 leading-relaxed"
                  style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                >
                  {report.report.conclusion}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span
                  className="text-[11px] font-mono text-neutral-400"
                  style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                >
                  Status: {report.status.toUpperCase()}
                </span>
                <span
                  className="text-[11px] font-mono text-neutral-400"
                  style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
                >
                  Spent ${report.budget.spentUsdc} of ${report.budget.maxBudgetUsdc}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
