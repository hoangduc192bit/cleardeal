"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";

import { arcTestnet } from "@/config/chain";
import { agentRegistryAddress, agentRegistryAbi } from "@/lib/contracts";

const STREAM_TYPES = [
  "Market Prices",
  "Sentiment",
  "Yield / DeFi",
  "Risk Scoring",
  "On-chain Events",
  "Social Signals",
  "Macro Data",
  "Custom",
];

const STEPS = ["Agent Details", "Pricing & Type", "Review & Submit"];

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2 block";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-[#18181B] placeholder-slate-400 outline-none focus:border-[#0084FF]/60 focus:bg-white focus:ring-2 focus:ring-[#0084FF]/20 transition";
const primaryBtn =
  "inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-[#0084FF] text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed";
const secondaryBtn =
  "inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-[rgba(226,232,240,0.8)] text-sm font-semibold text-[#18181B] hover:border-[#0084FF]/30 hover:text-[#0084FF] transition disabled:opacity-40 disabled:cursor-not-allowed";

export function ProviderRegistrationForm({ onSuccess }: { onSuccess?: () => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [networkError, setNetworkError] = useState<string>();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    streamType: "Market Prices",
    description: "",
    pricePerSecond: "0.0001",
  });

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    if (chainId !== arcTestnet.id) {
      setNetworkError("Switch your wallet to Arc Testnet, then submit again.");
      switchChain({ chainId: arcTestnet.id });
      return;
    }
    setNetworkError(undefined);
    const priceWei = parseUnits(form.pricePerSecond, 6);
    writeContract({
      address: agentRegistryAddress,
      abi: agentRegistryAbi,
      functionName: "registerAgent",
      args: [form.name, form.streamType, form.description, priceWei],
    });
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-5 text-5xl">🎉</div>
        <h3
          className="font-display text-xl font-extrabold text-emerald-600"
          style={{ fontFamily: "var(--font-display, Outfit, sans-serif)" }}
        >
          Agent Registered On-chain!
        </h3>
        <p className="mt-3 max-w-sm text-[13.5px] text-[#71717A] leading-relaxed">
          Your data agent <strong className="text-[#18181B]">{form.name}</strong> has been registered on the Arc Testnet AgentRegistry contract. It will appear in the provider listing momentarily.
        </p>
        <a
          href={`https://testnet.arcscan.app/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
        >
          View on ArcScan →
        </a>
        <button
          onClick={() => { setStep(0); setForm({ name: "", streamType: "Market Prices", description: "", pricePerSecond: "0.0001" }); onSuccess?.(); }}
          className="mt-3 text-[12px] text-slate-400 hover:text-slate-600 transition"
        >
          Register another agent
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition-all ${
                i < step
                  ? "bg-emerald-500 text-white"
                  : i === step
                  ? "bg-[#0084FF] text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-[12px] ${i === step ? "text-[#18181B] font-medium" : "text-slate-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px w-5 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step 0: Agent Details */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Agent Name</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. My Alpha Signal Feed"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              placeholder="Describe what data your agent provides and how it's sourced…"
              className={`${inputClass} resize-none`}
            />
          </div>
          <button
            disabled={!form.name.trim() || !form.description.trim()}
            onClick={() => setStep(1)}
            className={`${primaryBtn} w-full`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 1: Pricing & Type */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Data Category</label>
            <select
              value={form.streamType}
              onChange={set("streamType")}
              className={inputClass}
            >
              {STREAM_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Price per Second (USDC)</label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={form.pricePerSecond}
              onChange={set("pricePerSecond")}
              className={inputClass}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              ≈ {(parseFloat(form.pricePerSecond || "0") * 3600).toFixed(4)} USDC/hour ·{" "}
              {(parseFloat(form.pricePerSecond || "0") * 86400).toFixed(3)} USDC/day
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className={`${secondaryBtn} flex-1`}>← Back</button>
            <button onClick={() => setStep(2)} className={`${primaryBtn} flex-1`}>Review →</button>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-3 text-sm">
            {[
              ["Agent Name", form.name],
              ["Category", form.streamType],
              ["Description", form.description],
              ["Price/Second", `${form.pricePerSecond} USDC`],
              ["Provider Wallet", address ? `${address.slice(0, 10)}...${address.slice(-6)}` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-[13px] text-slate-400">{k}</span>
                <span className="text-[13px] text-[#18181B] text-right max-w-[60%] break-words">{v}</span>
              </div>
            ))}
          </div>

          {!isConnected && (
            <p className="text-center text-[12px] text-rose-500">Please connect your wallet first.</p>
          )}

          {writeError && (
            <p className="text-center text-[12px] text-rose-500">{writeError.message.slice(0, 120)}</p>
          )}
          {networkError && (
            <p className="text-center text-[12px] text-amber-600">{networkError}</p>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className={`${secondaryBtn} flex-1`}>← Back</button>
            <button
              onClick={handleSubmit}
              disabled={!isConnected || isPending || isConfirming}
              className={`${primaryBtn} flex-1`}
            >
              {isPending ? "Confirm in wallet…" : isConfirming ? "On-chain…" : "Register On-chain ✦"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
