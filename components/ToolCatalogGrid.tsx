"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Tool, ToolCategory } from "@/lib/tool-catalog";

const CATEGORIES: ToolCategory[] = [
  "Analysis",
  "Research",
  "Writing",
  "Data",
  "Risk",
  "Generation",
];

const CATEGORY_STYLES: Record<
  ToolCategory,
  { bg: string; text: string; border: string; dot: string }
> = {
  Analysis: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-100",
    dot: "bg-blue-500",
  },
  Research: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-100",
    dot: "bg-sky-500",
  },
  Writing: {
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-100",
    dot: "bg-violet-500",
  },
  Data: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-100",
    dot: "bg-amber-500",
  },
  Risk: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-100",
    dot: "bg-red-500",
  },
  Generation: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-100",
    dot: "bg-orange-500",
  },
};

const glass =
  "bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)]";

function TrustBar({ score, dotColor }: { score: number; dotColor: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className={`h-full rounded-full ${dotColor}`}
        />
      </div>
      <span className="text-[11px] font-mono font-bold text-neutral-500 tabular-nums w-6 text-right">
        {score}
      </span>
    </div>
  );
}

function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  const [showSchema, setShowSchema] = useState(false);
  const catStyle =
    CATEGORY_STYLES[tool.category] ?? {
      bg: "bg-gray-50",
      text: "text-gray-600",
      border: "border-gray-100",
      dot: "bg-gray-400",
    };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`${glass} rounded-3xl flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_16px_48px_-4px_rgba(0,0,0,0.10)] transition-all duration-300`}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
              {tool.category}
            </span>
            {tool.isNative && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#0084FF] border border-blue-100 text-[11px] font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Native
              </span>
            )}
            {tool.status === "preview" && (
              <span className="px-2.5 py-1 rounded-lg bg-gray-50 text-neutral-500 border border-gray-100 text-[11px] font-medium">
                Preview
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <div
              className="text-2xl font-black text-[#0084FF] font-mono tracking-tight tabular-nums"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              ${tool.pricePerCall}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium mt-0.5">
              per call
            </div>
          </div>
        </div>

        <h3
          className="text-[17px] font-black text-neutral-900 leading-tight mb-1"
          style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
        >
          {tool.name}
        </h3>
        <p
          className="text-[12px] text-neutral-500 font-medium"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          {tool.providerName}
        </p>
      </div>

      {/* Body */}
      <div className="px-6 pb-5 flex-1 flex flex-col gap-4">
        <p
          className="text-[13px] text-neutral-600 leading-relaxed"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          {tool.description}
        </p>

        {/* Capabilities */}
        <div>
          <div
            className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Capabilities
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tool.capabilities.map((cap) => (
              <span
                key={cap}
                className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[11px] font-medium text-neutral-500"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
            <div
              className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Latency
            </div>
            <div
              className="text-[14px] font-black text-neutral-800 font-mono tabular-nums"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              {tool.estimatedLatencyMs}ms
            </div>
          </div>
          <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
            <div
              className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1"
              style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Protocol fee
            </div>
            <div
              className="text-[14px] font-black text-neutral-800 font-mono"
              style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}
            >
              10%
            </div>
          </div>
        </div>

        {/* Trust score */}
        <div>
          <div
            className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Trust score
          </div>
          <TrustBar score={tool.trustScore} dotColor={catStyle.dot} />
        </div>

        {/* Schema toggle */}
        <div>
          <button
            className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 hover:text-[#0084FF] transition-colors cursor-pointer"
            onClick={() => setShowSchema(!showSchema)}
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            type="button"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showSchema ? "rotate-180" : ""}`}
            />
            Output schema
          </button>
          <AnimatePresence>
            {showSchema && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <pre className="mt-2.5 bg-neutral-950 rounded-xl p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                  {tool.outputDescription}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Example */}
        <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
          <div
            className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            Example input
          </div>
          <div className="text-[12px] font-mono text-neutral-700 break-all leading-relaxed">
            {JSON.stringify(tool.usageExample.input, null, 0).slice(0, 80)}...
          </div>
          <div className="text-[11px] text-neutral-500 mt-1.5 italic">
            {tool.usageExample.outputSummary}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 pt-2 flex items-center gap-3 border-t border-white/50">
        <Link
          href="/playground"
          className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#006EE6] text-white text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          Try in Playground
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <div
          className="shrink-0 text-[10px] font-mono text-neutral-400 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 whitespace-nowrap"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          {tool.endpoint}
        </div>
      </div>
    </motion.div>
  );
}

export function ToolCatalogGrid({ tools }: { tools: Tool[] }) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "All">(
    "All",
  );
  const [sortBy, setSortBy] = useState<"price" | "trust" | "latency">("trust");

  const activeCats = [...new Set(tools.map((t) => t.category))];

  const filtered = tools
    .filter((t) => activeCategory === "All" || t.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === "price")
        return parseFloat(a.pricePerCall) - parseFloat(b.pricePerCall);
      if (sortBy === "trust") return b.trustScore - a.trustScore;
      return a.estimatedLatencyMs - b.estimatedLatencyMs;
    });

  return (
    <div>
      {/* Filter & sort bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={activeCategory === "All"}
            onClick={() => setActiveCategory("All")}
          >
            All ({tools.length})
          </FilterButton>
          {CATEGORIES.filter((c) => activeCats.includes(c)).map((cat) => {
            const count = tools.filter((t) => t.category === cat).length;
            const style = CATEGORY_STYLES[cat];
            return (
              <FilterButton
                key={cat}
                active={activeCategory === cat}
                activeStyle={`${style.bg} ${style.text} ${style.border}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat} ({count})
              </FilterButton>
            );
          })}
        </div>

        <div
          className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          {(
            [
              ["trust", "Top rated"],
              ["price", "Cheapest"],
              ["latency", "Fastest"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                sortBy === key
                  ? "bg-[#0084FF] text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
              onClick={() => setSortBy(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid — 2-column asymmetric */}
      <AnimatePresence mode="popLayout">
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {filtered.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FilterButton({
  active,
  activeStyle,
  onClick,
  children,
}: {
  active: boolean;
  activeStyle?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold border transition-all cursor-pointer ${
        active
          ? activeStyle ??
            "bg-[#0084FF] text-white border-[#0084FF] shadow-sm shadow-blue-500/20"
          : "bg-white text-neutral-500 border-gray-200 hover:border-gray-300 hover:text-neutral-700"
      }`}
      onClick={onClick}
      style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
      type="button"
    >
      {children}
    </button>
  );
}
