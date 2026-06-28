"use client";

import { useEffect, useState } from "react";
import { WalletCards, Plus, Loader2, Coins, Trash2, CheckCircle2, User } from "lucide-react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { AddNetworkButton } from "@/components/AddNetworkButton";
import { WalletButton } from "@/components/WalletButton";
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
  privateKey: `0x${string}`;
  balanceUsdc: string;
  remainingBudget: string;
  registered: boolean;
  instructions?: string;
}

function shortAddress(address?: string) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PlaygroundWalletPanel() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash } = useWriteContract();

  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState("");
  const [newPersona, setNewPersona] = useState<"business" | "web3" | "social">("business");
  const [newInstructions, setNewInstructions] = useState("");
  
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      // 1. Generate local EOA wallet
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      const agentAddress = account.address;

      // 2. Register spending policy on-chain via backend
      const res = await fetch("/api/agent/wallet/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentAddress }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to register policy on-chain");
      }

      // 3. Save agent instance
      const newAgent: AgentInstance = {
        id: Math.random().toString(36).substring(2, 9),
        name: newName.trim(),
        persona: newPersona,
        address: agentAddress,
        privateKey,
        balanceUsdc: "0.00",
        remainingBudget: "5.00",
        registered: true,
        instructions: newInstructions.trim(),
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
    if (!isConnected || !address) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }
    try {
      writeContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [targetAgent.address, parseUnits("2.0", 6)], // Top up 2 USDC
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
                Multi-Agent Governance Manager
              </h2>
            </div>
          </div>
          <button
            onClick={() => refreshBalances()}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-semibold text-neutral-500 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh balances"}
          </button>
        </div>

        {/* Create Agent form */}
        <form onSubmit={createAgent} className="flex flex-col gap-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 mb-6">
          <div className="flex flex-wrap gap-2.5 items-end w-full">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Agent Name</label>
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
            <div className="w-[130px]">
              <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Role / Persona</label>
              <select
                disabled={creating}
                value={newPersona}
                onChange={(e) => setNewPersona(e.target.value as "business" | "web3" | "social")}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-[#0084FF] cursor-pointer"
              >
                <option value="business">💼 Business</option>
                <option value="web3">🌐 Web3</option>
                <option value="social">📝 Social</option>
              </select>
            </div>
          </div>

          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">
              Custom instructions / Training prompt (e.g. perspectives, rules)
            </label>
            <textarea
              disabled={creating}
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="e.g. You are the CEO of a printing factory. Focus all SWOT analyses on raw paper costs, packaging trends, and offset printing efficiency..."
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
                  Registering...
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

        {/* Agents Grid List */}
        {agents.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
            <User className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <div className="text-[13px] font-medium text-neutral-500">No agents registered yet</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Use the form above to deploy your first Agent Wallet</div>
          </div>
        ) : (
          <div className="grid gap-3">
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
                      {agent.persona === "business" ? "💼" : agent.persona === "web3" ? "🌐" : "📝"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-neutral-800 leading-tight">{agent.name}</span>
                        {active && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Active Run
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 mt-1">
                        Wallet: {agent.address}
                      </div>
                      {agent.instructions && (
                        <div className="text-[11px] text-neutral-500 italic mt-1 max-w-[280px] sm:max-w-[400px] truncate">
                          Prompt: {agent.instructions}
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
                        <div className="text-[9px] font-bold uppercase text-neutral-400">Daily Cap</div>
                        <div className="text-[13px] font-bold text-neutral-700">
                          {agent.remainingBudget} / 5.00 Left
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => fundAgent(agent)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                          hasBalance
                            ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            : "bg-[#0084FF]/10 text-[#0084FF] hover:bg-[#0084FF]/20"
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        Top Up
                      </button>
                      <button
                        onClick={() => deleteAgent(agent.id)}
                        className="p-2 rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-all"
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
      </div>

      {/* ── Tester Web3 Wallet Card ── */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.25)] flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Tester MetaMask Wallet
          </div>
          <h3
            className="mt-1 text-[18px] font-black tracking-tight text-neutral-900"
            style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
          >
            Fund Agent Wallets
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            Connect your MetaMask wallet on **Arc Testnet** to fund USDC into your AI agents' wallets. Once funded, the agents will pay for tool calls autonomously.
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
              🚰 Faucet USDC
            </a>
          </div>
          {isConnected && address ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[12px] font-semibold text-emerald-700">
              Connected: {shortAddress(address)}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[12px] font-medium text-amber-700">
              Please connect your wallet to fund agents
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

