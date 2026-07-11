"use client";

import { useEffect, useState } from "react";
import { WalletCards, Plus, Loader2, Coins, Trash2, CheckCircle2, User, Image as ImageIcon, Workflow as WorkflowIcon } from "lucide-react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";

import { AddNetworkButton } from "@/components/AddNetworkButton";
import { WalletButton } from "@/components/WalletButton";
import { arcTestnet } from "@/config/chain";
import {
  publicClient,
  usdcAddress,
  agentBudgetGuardAddress,
  agentBudgetGuardAbi,
  erc20Abi,
} from "@/lib/contracts";

interface AgentInstance {
  id: string;
  name: string;
  persona: "business" | "web3" | "social";
  address: Address;
  balanceUsdc: string;
  remainingBudget: string;
  registered: boolean;
  instructions?: string;
  avatarUrl?: string;
}

function shortAddress(address?: string) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface Workflow {
  id: string;
  agentId: string;
  agentName: string;
  name: string;
  objective: string;
  trigger: string;
  cronExpression: string;
  budgetUsdc: string;
  tools: string[];
  destinations: string[];
  status: "ready" | "paused";
  createdAt: string;
}

function normalizeWorkflow(item: Record<string, unknown>): Workflow {
  const destinations = Array.isArray(item.destinations)
    ? item.destinations.filter((destination): destination is string => typeof destination === "string")
    : ["Gmail", "Telegram"];
  const tools = Array.isArray(item.tools)
    ? item.tools.filter((tool): tool is string => typeof tool === "string")
    : ["ArcStream tool catalog"];
  const name = typeof item.name === "string"
    ? item.name
    : typeof item.subject === "string"
      ? item.subject
      : "Recurring agent workflow";
  const objective = typeof item.objective === "string"
    ? item.objective
    : typeof item.subject === "string"
      ? item.subject
      : "Build and deliver a recurring agent report.";

  return {
    id: typeof item.id === "string" ? item.id : Math.random().toString(36).substring(2, 9),
    agentId: typeof item.agentId === "string" ? item.agentId : "default",
    agentName: typeof item.agentName === "string" ? item.agentName : "Default Agent",
    name,
    objective,
    trigger: typeof item.trigger === "string"
      ? item.trigger
      : typeof item.humanReadable === "string"
        ? item.humanReadable
        : "Daily at 5:00 UTC",
    cronExpression: typeof item.cronExpression === "string" ? item.cronExpression : "0 5 * * *",
    budgetUsdc: typeof item.budgetUsdc === "string" ? item.budgetUsdc : "0.50",
    tools,
    destinations,
    status: item.status === "paused" ? "paused" : "ready",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
  };
}

export function PlaygroundWalletPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract } = useWriteContract();

  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState("");
  const [newPersona, setNewPersona] = useState<"business" | "web3" | "social">("business");
  const [newInstructions, setNewInstructions] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [topUpAmounts, setTopUpAmounts] = useState<Record<string, string>>({});
  
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [subTab, setSubTab] = useState<"wallets" | "workflows">("wallets");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);

  // Load Telegram Config on mount
  useEffect(() => {
    const savedChatId = localStorage.getItem("arcstream_telegram_chat_id");
    if (savedChatId) {
      setTelegramChatId(savedChatId);
    }
    localStorage.removeItem("arcstream_telegram_bot_token");
  }, []);

  const handleTelegramChatIdChange = (val: string) => {
    setTelegramChatId(val);
    localStorage.setItem("arcstream_telegram_chat_id", val);
  };

  const handleAvatarFileChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file for the Agent avatar.");
      return;
    }
    if (file.size > 750_000) {
      alert("Please choose an avatar image under 750 KB so it can be stored locally for the demo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNewAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadWorkflows = () => {
    const saved = localStorage.getItem("arcstream_workflows") ?? localStorage.getItem("arcstream_schedules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item) => normalizeWorkflow(item as Record<string, unknown>));
          setWorkflows(normalized);
          localStorage.setItem("arcstream_workflows", JSON.stringify(normalized));
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Default pre-seeded workflows to avoid empty cold-start
    const defaultWorkflows: Workflow[] = [
      {
        id: "wf-1",
        agentId: "default",
        agentName: "Web3 Researcher",
        name: "Daily Market Brief",
        objective: "Scan top web3 sources and provide a brief report on Bitcoin, Ethereum, and general sentiment.",
        trigger: "Every day at 8:00 AM UTC",
        cronExpression: "0 8 * * *",
        budgetUsdc: "0.20",
        tools: ["Market Sentiment", "Web Intelligence"],
        destinations: ["Telegram", "Gmail"],
        status: "ready",
        createdAt: new Date().toISOString(),
      },
      {
        id: "wf-2",
        agentId: "default",
        agentName: "Business Analyst",
        name: "Weekly Competitor Scan",
        objective: "Analyze competitors packaging trends and paper cost shifts from offset printing sector news.",
        trigger: "Every Monday at 9:00 AM UTC",
        cronExpression: "0 9 * * 1",
        budgetUsdc: "0.30",
        tools: ["Market Intelligence", "Document Digest"],
        destinations: ["Gmail"],
        status: "ready",
        createdAt: new Date().toISOString(),
      },
      {
        id: "wf-3",
        agentId: "default",
        agentName: "Price Alert Bot",
        name: "BTC Price Volatility Alert",
        objective: "Check current BTC price, alert if 24h change exceeds 5%, and summarize market driver reasons.",
        trigger: "Hourly at minute 0",
        cronExpression: "0 * * * *",
        budgetUsdc: "0.10",
        tools: ["Web Intelligence"],
        destinations: ["Telegram"],
        status: "ready",
        createdAt: new Date().toISOString(),
      },
      {
        id: "wf-4",
        agentId: "default",
        agentName: "DeFi Yield Hunter",
        name: "Stablecoin Yield Digest",
        objective: "Scan top decentralized lending pools and synthesize the highest yielding safe opportunities.",
        trigger: "Every Friday at 5:00 PM UTC",
        cronExpression: "0 17 * * 5",
        budgetUsdc: "0.40",
        tools: ["Web Intelligence", "Market Sentiment"],
        destinations: ["Telegram", "Gmail"],
        status: "paused",
        createdAt: new Date().toISOString(),
      }
    ];

    setWorkflows(defaultWorkflows);
    localStorage.setItem("arcstream_workflows", JSON.stringify(defaultWorkflows));
  };

  useEffect(() => {
    loadWorkflows();
    window.addEventListener("workflowsChanged", loadWorkflows);
    window.addEventListener("schedulesChanged", loadWorkflows);
    return () => {
      window.removeEventListener("workflowsChanged", loadWorkflows);
      window.removeEventListener("schedulesChanged", loadWorkflows);
    };
  }, []);

  const toggleWorkflowStatus = (id: string) => {
    const updated: Workflow[] = workflows.map((workflow) => {
      if (workflow.id === id) {
        return { ...workflow, status: workflow.status === "ready" ? "paused" : "ready" };
      }
      return workflow;
    });
    setWorkflows(updated);
    localStorage.setItem("arcstream_workflows", JSON.stringify(updated));
  };

  const deleteWorkflow = (id: string) => {
    const updated = workflows.filter((workflow) => workflow.id !== id);
    setWorkflows(updated);
    localStorage.setItem("arcstream_workflows", JSON.stringify(updated));
  };

  const runWorkflowNow = async (wf: Workflow) => {
    if (runningWorkflowId) return;
    setRunningWorkflowId(wf.id);

    try {
      // Find the active agent or fallback to default
      const activeAgentJson = localStorage.getItem("arcstream_active_agent");
      const activeAgent = activeAgentJson ? JSON.parse(activeAgentJson) : null;

      const res = await fetch("/api/agent/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: wf.objective,
          maxBudgetUsdc: wf.budgetUsdc || "0.50",
          executePaid: false, // Default to dry-run (no USDC cost) for demo ease, or let agent run naturally
          walletAddress: activeAgent?.address,
          telegramChatId: telegramChatId.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const result = await res.json();
      if (result.status === "failed") {
        throw new Error(result.finalAnswer || "Workflow execution failed");
      }

      alert(`✅ Workflow "${wf.name}" executed successfully!\n\nAgent Answer: ${result.finalAnswer}\n\n${telegramChatId ? "📤 Result pushed to Telegram!" : "💡 Add a Chat ID to receive this directly on Telegram."}`);
    } catch (err) {
      alert(`❌ Workflow execution failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningWorkflowId(null);
    }
  };

  // Load agents on mount
  useEffect(() => {
    const saved = localStorage.getItem("arcstream_agents");
    const active = localStorage.getItem("arcstream_active_agent_id");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AgentInstance[];
        setAgents(parsed);
        if (active) {
          setActiveAgentId(active);
        } else if (parsed.length > 0) {
          setActiveAgentId(parsed[0].id);
          localStorage.setItem("arcstream_active_agent_id", parsed[0].id);
          localStorage.setItem("arcstream_active_agent", JSON.stringify(parsed[0]));
        }
      } catch (e) {
        console.error("Failed to parse saved agents", e);
      }
    }
  }, []);

  // Update on-chain balances and budget limits
  async function refreshBalances(list = agents) {
    if (list.length === 0) return;
    setRefreshing(true);
    try {
      const updated = await Promise.all(
        list.map(async (agent) => {
          let balance = "0.00";
          let remaining = "5.00";
          try {
            const bal = await publicClient.readContract({
              address: usdcAddress,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [agent.address],
            });
            balance = formatUnits(bal, 6);
          } catch (e) {
            console.error("Failed to fetch balance for", agent.address, e);
          }

          if (agentBudgetGuardAddress) {
            try {
              const rem = await publicClient.readContract({
                address: agentBudgetGuardAddress,
                abi: agentBudgetGuardAbi,
                functionName: "remainingToday",
                args: [agent.address],
              });
              remaining = formatUnits(rem, 6);
            } catch (e) {
              console.error("Failed to fetch remaining budget for", agent.address, e);
            }
          }

          return { ...agent, balanceUsdc: balance, remainingBudget: remaining };
        })
      );
      setAgents(updated);
      localStorage.setItem("arcstream_agents", JSON.stringify(updated));

      // Also sync active agent details
      if (activeAgentId) {
        const act = updated.find((a) => a.id === activeAgentId);
        if (act) {
          localStorage.setItem("arcstream_active_agent", JSON.stringify(act));
          window.dispatchEvent(new Event("activeAgentChanged"));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }

  // Refresh balance updates periodically
  useEffect(() => {
    if (agents.length > 0) {
      refreshBalances(agents);
    }
    const interval = setInterval(() => {
      refreshBalances();
    }, 15_000);
    return () => clearInterval(interval);
  }, [activeAgentId, agents.length]);

  // Handle creating new agent
  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;

    setCreating(true);
    try {
      // 1. Provision a Circle agent wallet (MPC-signed; no raw key ever leaves Circle)
      //    + activate its on-chain daily spending policy.
      const res = await fetch("/api/agent/wallet/create", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? "Failed to create Circle agent wallet");
      }
      const { address: agentAddress } = (await res.json()) as { address: Address };

      // 2. Save agent instance (no private key — Circle MPC holds it)
      const newAgent: AgentInstance = {
        id: Math.random().toString(36).substring(2, 9),
        name: newName.trim(),
        persona: newPersona,
        address: agentAddress,
        balanceUsdc: "0.00",
        remainingBudget: "5.00",
        registered: true,
        instructions: newInstructions.trim(),
        avatarUrl: newAvatarUrl,
      };

      const updated = [...agents, newAgent];
      setAgents(updated);
      localStorage.setItem("arcstream_agents", JSON.stringify(updated));

      // Set active
      setActiveAgentId(newAgent.id);
      localStorage.setItem("arcstream_active_agent_id", newAgent.id);
      localStorage.setItem("arcstream_active_agent", JSON.stringify(newAgent));
      window.dispatchEvent(new Event("activeAgentChanged"));

      setNewName("");
      setNewInstructions("");
      setNewAvatarUrl("");
      // Fetch dynamic balance immediately
      await refreshBalances(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating agent");
    } finally {
      setCreating(false);
    }
  }

  // Handle funding agent wallet via MetaMask
  function fundAgent(targetAgent: AgentInstance) {
    const amount = (topUpAmounts[targetAgent.id] || "2").trim();
    const parsedAmount = Number(amount);
    if (!isConnected || !address) {
      alert("Please connect your MetaMask wallet first.");
      return;
    }
    if (chainId !== arcTestnet.id) {
      alert("Please switch MetaMask to Arc Testnet before funding an Agent wallet.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert("Enter a valid USDC top-up amount greater than 0.");
      return;
    }
    try {
      writeContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [targetAgent.address, parseUnits(amount, 6)],
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Handle deleting agent
  function deleteAgent(id: string) {
    const updated = agents.filter((a) => a.id !== id);
    setAgents(updated);
    localStorage.setItem("arcstream_agents", JSON.stringify(updated));

    if (activeAgentId === id) {
      if (updated.length > 0) {
        setActiveAgentId(updated[0].id);
        localStorage.setItem("arcstream_active_agent_id", updated[0].id);
        localStorage.setItem("arcstream_active_agent", JSON.stringify(updated[0]));
      } else {
        setActiveAgentId(null);
        localStorage.removeItem("arcstream_active_agent_id");
        localStorage.removeItem("arcstream_active_agent");
      }
      window.dispatchEvent(new Event("activeAgentChanged"));
    }
  }

  // Select active agent
  function selectActive(agent: AgentInstance) {
    setActiveAgentId(agent.id);
    localStorage.setItem("arcstream_active_agent_id", agent.id);
    localStorage.setItem("arcstream_active_agent", JSON.stringify(agent));
    window.dispatchEvent(new Event("activeAgentChanged"));
  }

  return (
    <section className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      {/* ── Multi-Agent List Card ── */}
      <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_12px_40px_-28px_rgba(0,132,255,0.45)]">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0084FF]">
              <WalletCards className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#0084FF]">
                Circle Agent Stack
              </div>
              <h2
                className="mt-1 text-[20px] font-black tracking-tight text-neutral-900"
                style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
              >
                Multi-Agent Manager
              </h2>
            </div>
          </div>
          <button
            onClick={() => refreshBalances()}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-semibold text-neutral-500 hover:bg-gray-50 transition-all disabled:opacity-50"
            type="button"
          >
            {refreshing ? "Refreshing..." : "Refresh balances"}
          </button>
        </div>

        {/* Sub-tab selection */}
        <div className="flex gap-4 border-b border-gray-100 mb-5 pb-1">
          <button
            onClick={() => setSubTab("wallets")}
            className={`pb-2 text-[13px] font-bold transition-all relative cursor-pointer ${
              subTab === "wallets" ? "text-[#0084FF]" : "text-neutral-400 hover:text-neutral-600"
            }`}
            type="button"
          >
            Agent Wallets
            {subTab === "wallets" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0084FF] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setSubTab("workflows")}
            className={`pb-2 text-[13px] font-bold transition-all relative flex items-center gap-1.5 cursor-pointer ${
              subTab === "workflows" ? "text-[#0084FF]" : "text-neutral-400 hover:text-neutral-600"
            }`}
            type="button"
          >
            <WorkflowIcon className="w-3.5 h-3.5" />
            Workflows (Coming Soon)
            {workflows.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] text-[#0084FF] font-bold">
                {workflows.length}
              </span>
            )}
            {subTab === "workflows" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0084FF] rounded-full" />
            )}
          </button>
        </div>

        {subTab === "workflows" ? (
          <>
            {/* Telegram Configuration Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 mb-4 rounded-2xl bg-blue-50/30 border border-blue-100">
              <div className="max-w-md">
                <h4 className="text-[13px] font-bold text-neutral-800 flex items-center gap-1.5">
                  <span>📱</span> Telegram Delivery Configuration
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Enter the destination Chat ID. The bot token stays protected in the server environment.
                </p>
              </div>
              <div className="w-full md:w-auto flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1 w-full sm:w-[150px]">
                  <span className="text-[9px] font-bold uppercase text-neutral-400">Your Chat ID / Channel ID</span>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => handleTelegramChatIdChange(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[12px] text-neutral-800 outline-none focus:border-[#0084FF]"
                  />
                </div>
              </div>
            </div>

            {workflows.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                <WorkflowIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <div className="text-[13px] font-medium text-neutral-500">No workflows yet</div>
                <div className="text-[11px] text-neutral-400 mt-1 max-w-[320px] mx-auto leading-relaxed">
                  Create a workflow by entering a recurring prompt like: <span className="font-semibold text-neutral-600">&quot;Every day at 8:00 AM, send a crypto market brief to Telegram&quot;</span>. Your Agent will use paid tools, stay within budget, and deliver reports automatically.
                </div>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[420px] overflow-y-auto pr-1">
                {workflows.map((wf) => {
                  const isRunning = runningWorkflowId === wf.id;
                  return (
                    <div
                      key={wf.id}
                      className="relative p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-100 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] group"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[14px] ${
                            wf.status === "ready" ? "bg-gradient-to-br from-blue-50 to-indigo-50 text-[#0084FF]" : "bg-neutral-100 text-neutral-400"
                          }`}>
                            <WorkflowIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-bold text-neutral-800 leading-tight">{wf.name}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                wf.status === "ready"
                                  ? "bg-emerald-50 border border-emerald-100 text-emerald-600"
                                  : "bg-amber-50 border border-amber-100 text-amber-600"
                              }`}>
                                {wf.status === "ready" ? "Ready" : "Paused"}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-0.5 max-w-[280px] sm:max-w-[340px] truncate">
                              {wf.objective}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => runWorkflowNow(wf)}
                            disabled={runningWorkflowId !== null}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 bg-[#0084FF] text-white hover:bg-[#0073E6] disabled:opacity-50`}
                            type="button"
                          >
                            {isRunning ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Running...
                              </>
                            ) : (
                              "Run Now"
                            )}
                          </button>
                          <button
                            onClick={() => toggleWorkflowStatus(wf.id)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              wf.status === "ready"
                                ? "bg-amber-50 text-amber-600 hover:bg-amber-100/60"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100/60"
                            }`}
                            type="button"
                          >
                            {wf.status === "ready" ? "Pause" : "Activate"}
                          </button>
                          <button
                            onClick={() => deleteWorkflow(wf.id)}
                            className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                            type="button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Workflow details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        <div className="bg-neutral-50 rounded-lg px-2.5 py-1.5">
                          <div className="text-[9px] font-bold uppercase text-neutral-400 tracking-wide">Trigger</div>
                          <div className="text-[11px] font-semibold text-neutral-700 mt-0.5 truncate">{wf.trigger}</div>
                        </div>
                        <div className="bg-neutral-50 rounded-lg px-2.5 py-1.5">
                          <div className="text-[9px] font-bold uppercase text-neutral-400 tracking-wide">Budget</div>
                          <div className="text-[11px] font-semibold text-neutral-700 mt-0.5">{wf.budgetUsdc} USDC</div>
                        </div>
                        <div className="bg-neutral-50 rounded-lg px-2.5 py-1.5">
                          <div className="text-[9px] font-bold uppercase text-neutral-400 tracking-wide">Agent</div>
                          <div className="text-[11px] font-semibold text-neutral-700 mt-0.5 truncate">{wf.agentName}</div>
                        </div>
                        <div className="bg-neutral-50 rounded-lg px-2.5 py-1.5">
                          <div className="text-[9px] font-bold uppercase text-neutral-400 tracking-wide">Delivery</div>
                          <div className="text-[11px] font-semibold text-neutral-700 mt-0.5 truncate">{wf.destinations.join(", ")}</div>
                        </div>
                      </div>

                      {/* Tools row */}
                      {wf.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {wf.tools.map((tool) => (
                            <span key={tool} className="px-2 py-0.5 rounded-full bg-blue-50 text-[9px] font-semibold text-[#0084FF] border border-blue-100">
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Create Agent form */}
            <form onSubmit={createAgent} className="flex flex-col gap-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 mb-6">
              <div className="flex flex-wrap gap-2.5 items-end w-full">
                <div className="w-[76px]">
                  <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Avatar</label>
                  <label className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white text-neutral-400 transition-all hover:border-[#0084FF] hover:text-[#0084FF]">
                    {newAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={newAvatarUrl} alt="New Agent avatar preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={creating}
                      onChange={(e) => handleAvatarFileChange(e.target.files?.[0])}
                    />
                  </label>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Agent name</label>
                  <input
                    type="text"
                    required
                    disabled={creating}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. CEO printing assistant, Crypto Scout Bot..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-[#0084FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Custom instructions / training rules</label>
                <textarea
                  disabled={creating}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="e.g. You are the CEO of a printing factory. Focus SWOT analysis on paper costs, packaging trends, and offset printing efficiency..."
                  rows={2}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-[#0084FF] resize-none"
                />
              </div>

              <div className="flex justify-end w-full">
                <button
                  type="submit"
                  disabled={creating}
                  className="h-9 px-4 rounded-xl bg-[#0084FF] text-white text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#0073E6] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Agent wallet and setting daily limit...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Create Agent
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* List of Agents */}
            {agents.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                <User className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <div className="text-[13px] font-medium text-neutral-500">No agents yet</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Use the form above to create your first Agent wallet</div>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-1">
                {agents.map((agent) => {
                  const active = activeAgentId === agent.id;
                  const hasBalance = parseFloat(agent.balanceUsdc) > 0;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => selectActive(agent)}
                      className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                        active
                          ? "border-[#0084FF] bg-blue-50/20 shadow-sm ring-1 ring-blue-500/10"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[14px] ${
                          active ? "bg-[#0084FF] text-white" : "bg-neutral-100 text-neutral-500"
                        }`}>
                          {agent.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={agent.avatarUrl} alt={`${agent.name} avatar`} className="h-full w-full rounded-xl object-cover" />
                          ) : (
                            agent.persona === "business" ? "B" : agent.persona === "web3" ? "W3" : "S"
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-neutral-800 leading-tight">{agent.name}</span>
                            {active && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-600">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Selected
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-neutral-400 mt-1">
                            Wallet: {agent.address}
                          </div>
                          {agent.instructions && (
                            <div className="text-[11px] text-neutral-500 italic mt-1 max-w-[280px] sm:max-w-[400px] truncate">
                              Training prompt: {agent.instructions}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Metrics */}
                        <div className="flex gap-3">
                          <div className="text-right">
                            <div className="text-[9px] font-bold uppercase text-neutral-400">Balance</div>
                            <div className="text-[13px] font-bold text-neutral-700">
                              {agent.balanceUsdc} USDC
                            </div>
                          </div>
                          <div className="text-right border-l pl-3">
                            <div className="text-[9px] font-bold uppercase text-neutral-400">Daily cap</div>
                            <div className="text-[13px] font-bold text-neutral-700">
                              {agent.remainingBudget} / 5.00 left
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <input
                              aria-label={`Top up amount for ${agent.name}`}
                              inputMode="decimal"
                              min="0.000001"
                              step="0.1"
                              type="number"
                              value={topUpAmounts[agent.id] ?? "2"}
                              onChange={(e) => setTopUpAmounts((prev) => ({ ...prev, [agent.id]: e.target.value }))}
                              className="h-8 w-[78px] rounded-xl border border-gray-200 bg-white px-2 pr-9 text-right text-[11px] font-bold text-neutral-700 outline-none transition-all focus:border-[#0084FF]"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-neutral-400">
                              USDC
                            </span>
                          </div>
                          <button
                            onClick={() => fundAgent(agent)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                              hasBalance
                                ? "bg-[#0084FF] text-white hover:bg-[#006EE6] shadow-sm"
                                : "bg-[#0084FF]/10 text-[#0084FF] hover:bg-[#0084FF]/20"
                            }`}
                            type="button"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            Top up
                          </button>
                          <button
                            onClick={() => deleteAgent(agent.id)}
                            className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                            type="button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Tester Web3 Wallet Card ── */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.25)] flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Tester MetaMask wallet
          </div>
          <h3
            className="mt-1 text-[18px] font-black tracking-tight text-neutral-900"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Fund Agent wallets
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            Connect your MetaMask wallet on Arc Testnet to fund USDC into AI Agent wallets. Once funded, agents can pay for tool calls autonomously.
          </p>
        </div>
        
        <div className="mt-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <AddNetworkButton />
            <WalletButton />
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noreferrer"
              className="h-9 px-4 rounded-xl border border-blue-200 text-[#0084FF] hover:bg-blue-50/50 text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Faucet USDC
            </a>
          </div>
          {isConnected && address ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[12px] font-semibold text-emerald-700">
              Connected: {shortAddress(address)}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[12px] font-medium text-amber-700">
              Connect your wallet to fund agents
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
