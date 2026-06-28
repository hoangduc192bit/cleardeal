"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";

const catColor: Record<string, { bg: string; text: string }> = {
  Writing: { bg: "bg-violet-50", text: "text-violet-700" },
  Analysis: { bg: "bg-blue-50", text: "text-[#0084FF]" },
  Research: { bg: "bg-sky-50", text: "text-sky-700" },
  Generation: { bg: "bg-orange-50", text: "text-orange-700" },
};

const tools = [
  { name: "Competitor Analyzer", cat: "Analysis", price: "0.05", desc: "SWOT analysis of any company or product", latency: 820, trust: 98, span: "lg:col-span-2" },
  { name: "Text Summarizer", cat: "Writing", price: "0.02", desc: "Condenses any text into key points + bullets", latency: 410, trust: 96, span: "" },
  { name: "Sentiment Scorer", cat: "Analysis", price: "0.02", desc: "Scores text −1 to +1 with confidence", latency: 380, trust: 95, span: "" },
  { name: "Web Intelligence", cat: "Research", price: "0.03", desc: "Scrapes URL, extracts key facts + summary", latency: 690, trust: 94, span: "lg:col-span-2" },
  { name: "Report Writer", cat: "Generation", price: "0.04", desc: "Synthesizes multi-source research into a report", latency: 940, trust: 97, span: "" },
];

type Tool = typeof tools[number];

// ── 3D Robot Characters ───────────────────────────────────────────────────────

const RobotAnalyzer = () => (
  <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-auto drop-shadow-[0_6px_18px_rgba(37,99,235,0.3)]">
    <defs>
      <linearGradient id="ra_b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#60A5FA"/><stop offset="1" stopColor="#1D4ED8"/></linearGradient>
      <linearGradient id="ra_h" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3B82F6"/><stop offset="1" stopColor="#1E40AF"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="137" rx="30" ry="4" fill="#000" opacity="0.08"/>
    <rect x="22" y="65" width="76" height="62" rx="16" fill="url(#ra_b)"/>
    <rect x="34" y="78" width="52" height="36" rx="9" fill="#fff" opacity="0.12"/>
    <rect x="40" y="86" width="40" height="2.5" rx="1.25" fill="#93C5FD" opacity="0.9"/>
    <rect x="40" y="93" width="32" height="2.5" rx="1.25" fill="#93C5FD" opacity="0.65"/>
    <rect x="40" y="100" width="36" height="2.5" rx="1.25" fill="#93C5FD" opacity="0.4"/>
    <rect x="2" y="73" width="22" height="11" rx="5.5" fill="#1D4ED8"/>
    <rect x="96" y="73" width="22" height="11" rx="5.5" fill="#1D4ED8"/>
    <rect x="28" y="10" width="64" height="58" rx="18" fill="url(#ra_h)"/>
    <ellipse cx="45" cy="20" rx="13" ry="5" fill="#fff" opacity="0.28"/>
    <rect x="55" y="0" width="10" height="14" rx="5" fill="#93C5FD"/>
    <circle cx="60" cy="0" r="7" fill="#BFDBFE"/>
    <circle cx="60" cy="0" r="3.5" fill="#fff" opacity="0.9"/>
    <circle cx="44" cy="34" r="11" fill="#fff" opacity="0.95"/>
    <circle cx="76" cy="34" r="11" fill="#fff" opacity="0.95"/>
    <circle cx="46" cy="34" r="7" fill="#1E3A8A"/>
    <circle cx="78" cy="34" r="7" fill="#1E3A8A"/>
    <circle cx="48" cy="31" r="2.5" fill="#fff"/>
    <circle cx="80" cy="31" r="2.5" fill="#fff"/>
    <path d="M 45 55 Q 60 65 75 55" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <circle cx="105" cy="104" r="12" stroke="#BFDBFE" strokeWidth="3" fill="none"/>
    <circle cx="105" cy="104" r="6" fill="#DBEAFE" opacity="0.5"/>
    <line x1="114" y1="113" x2="122" y2="121" stroke="#BFDBFE" strokeWidth="3.5" strokeLinecap="round"/>
  </svg>
);

const RobotSummarizer = () => (
  <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-auto drop-shadow-[0_6px_18px_rgba(109,40,217,0.3)]">
    <defs>
      <linearGradient id="rs_b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#A78BFA"/><stop offset="1" stopColor="#6D28D9"/></linearGradient>
      <linearGradient id="rs_h" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8B5CF6"/><stop offset="1" stopColor="#5B21B6"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="137" rx="30" ry="4" fill="#000" opacity="0.08"/>
    <rect x="22" y="65" width="76" height="62" rx="16" fill="url(#rs_b)"/>
    <rect x="34" y="76" width="52" height="38" rx="9" fill="#fff" opacity="0.12"/>
    <rect x="38" y="82" width="3" height="28" rx="1.5" fill="#DDD6FE"/>
    <rect x="43" y="84" width="34" height="3" rx="1.5" fill="#C4B5FD"/>
    <rect x="43" y="91" width="26" height="3" rx="1.5" fill="#C4B5FD" opacity="0.7"/>
    <rect x="43" y="98" width="30" height="3" rx="1.5" fill="#C4B5FD" opacity="0.5"/>
    <rect x="43" y="105" width="18" height="3" rx="1.5" fill="#C4B5FD" opacity="0.35"/>
    <rect x="2" y="73" width="22" height="11" rx="5.5" fill="#5B21B6"/>
    <rect x="96" y="73" width="22" height="11" rx="5.5" fill="#5B21B6"/>
    <rect x="28" y="10" width="64" height="58" rx="18" fill="url(#rs_h)"/>
    <ellipse cx="45" cy="20" rx="13" ry="5" fill="#fff" opacity="0.28"/>
    <rect x="30" y="5" width="60" height="7" rx="3" fill="#C4B5FD" opacity="0.65"/>
    <rect x="53" y="-1" width="14" height="8" rx="2" fill="#A78BFA"/>
    <rect x="55" y="0" width="10" height="14" rx="5" fill="#C4B5FD"/>
    <circle cx="60" cy="0" r="7" fill="#EDE9FE"/>
    <circle cx="60" cy="0" r="3.5" fill="#fff" opacity="0.9"/>
    <circle cx="44" cy="34" r="11" fill="#fff" opacity="0.95"/>
    <circle cx="76" cy="34" r="13" fill="#fff" opacity="0.95"/>
    <circle cx="46" cy="34" r="7" fill="#3B0764"/>
    <circle cx="78" cy="34" r="8" fill="#3B0764"/>
    <circle cx="48" cy="31" r="2.5" fill="#fff"/>
    <circle cx="80" cy="31" r="3" fill="#fff"/>
    <path d="M 45 55 Q 60 63 75 55" stroke="#C4B5FD" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </svg>
);

const RobotSentiment = () => (
  <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-auto drop-shadow-[0_6px_18px_rgba(217,119,6,0.3)]">
    <defs>
      <linearGradient id="rsnt_b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FCD34D"/><stop offset="1" stopColor="#D97706"/></linearGradient>
      <linearGradient id="rsnt_h" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#FBBF24"/><stop offset="1" stopColor="#B45309"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="137" rx="30" ry="4" fill="#000" opacity="0.08"/>
    <rect x="22" y="65" width="76" height="62" rx="16" fill="url(#rsnt_b)"/>
    <rect x="34" y="76" width="52" height="38" rx="9" fill="#fff" opacity="0.15"/>
    <path d="M60 104 C60 104 43 93 43 83 C43 77 48 74 53 76 C56 77 58 80 60 82 C62 80 64 77 67 76 C72 74 77 77 77 83 C77 93 60 104 60 104Z" fill="#F97316" opacity="0.75"/>
    <rect x="2" y="73" width="22" height="11" rx="5.5" fill="#B45309"/>
    <rect x="96" y="73" width="22" height="11" rx="5.5" fill="#B45309"/>
    <rect x="28" y="10" width="64" height="58" rx="18" fill="url(#rsnt_h)"/>
    <ellipse cx="45" cy="20" rx="13" ry="5" fill="#fff" opacity="0.32"/>
    <circle cx="30" cy="46" r="8" fill="#F97316" opacity="0.25"/>
    <circle cx="90" cy="46" r="8" fill="#F97316" opacity="0.25"/>
    <rect x="55" y="0" width="10" height="14" rx="5" fill="#FDE68A"/>
    <circle cx="60" cy="0" r="7" fill="#FEF3C7"/>
    <circle cx="60" cy="0" r="3.5" fill="#fff" opacity="0.9"/>
    <circle cx="44" cy="33" r="11" fill="#fff" opacity="0.95"/>
    <circle cx="76" cy="33" r="11" fill="#fff" opacity="0.95"/>
    <circle cx="44" cy="33" r="7" fill="#78350F"/>
    <circle cx="76" cy="33" r="7" fill="#78350F"/>
    <circle cx="46" cy="30" r="2.5" fill="#fff"/>
    <circle cx="78" cy="30" r="2.5" fill="#fff"/>
    <path d="M 40 51 Q 60 67 80 51" stroke="#92400E" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <path d="M 45 57 Q 60 64 75 57" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.55"/>
  </svg>
);

const RobotWebIntel = () => (
  <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-auto drop-shadow-[0_6px_18px_rgba(2,132,199,0.3)]">
    <defs>
      <linearGradient id="rwi_b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#38BDF8"/><stop offset="1" stopColor="#0284C7"/></linearGradient>
      <linearGradient id="rwi_h" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0EA5E9"/><stop offset="1" stopColor="#0369A1"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="137" rx="30" ry="4" fill="#000" opacity="0.08"/>
    <rect x="22" y="65" width="76" height="62" rx="16" fill="url(#rwi_b)"/>
    <circle cx="60" cy="96" r="18" stroke="#7DD3FC" strokeWidth="1.5" fill="none" opacity="0.5"/>
    <circle cx="60" cy="96" r="12" stroke="#7DD3FC" strokeWidth="1.5" fill="none" opacity="0.65"/>
    <circle cx="60" cy="96" r="6" fill="#BAE6FD" opacity="0.5"/>
    <circle cx="70" cy="88" r="2.5" fill="#fff" opacity="0.9"/>
    <rect x="2" y="73" width="22" height="11" rx="5.5" fill="#0369A1"/>
    <rect x="96" y="73" width="22" height="11" rx="5.5" fill="#0369A1"/>
    <rect x="28" y="10" width="64" height="58" rx="18" fill="url(#rwi_h)"/>
    <ellipse cx="45" cy="20" rx="13" ry="5" fill="#fff" opacity="0.28"/>
    <rect x="43" y="0" width="8" height="14" rx="4" fill="#7DD3FC"/>
    <circle cx="47" cy="0" r="5" fill="#BAE6FD"/>
    <rect x="69" y="-2" width="8" height="16" rx="4" fill="#38BDF8"/>
    <circle cx="73" cy="-2" r="6" fill="#E0F2FE"/>
    <circle cx="73" cy="-2" r="3" fill="#fff" opacity="0.9"/>
    <circle cx="44" cy="34" r="12" fill="#fff" opacity="0.95"/>
    <circle cx="76" cy="34" r="12" fill="#fff" opacity="0.95"/>
    <circle cx="46" cy="34" r="8" fill="#082F49"/>
    <circle cx="78" cy="34" r="8" fill="#082F49"/>
    <circle cx="48" cy="31" r="3" fill="#fff"/>
    <circle cx="80" cy="31" r="3" fill="#fff"/>
    <ellipse cx="60" cy="56" rx="8" ry="5" fill="#7DD3FC" opacity="0.7"/>
    <ellipse cx="60" cy="56" rx="5" ry="3" fill="#0369A1" opacity="0.4"/>
  </svg>
);

const RobotReportWriter = () => (
  <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-auto drop-shadow-[0_6px_18px_rgba(234,88,12,0.3)]">
    <defs>
      <linearGradient id="rrw_b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FB923C"/><stop offset="1" stopColor="#EA580C"/></linearGradient>
      <linearGradient id="rrw_h" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#F97316"/><stop offset="1" stopColor="#C2410C"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="137" rx="30" ry="4" fill="#000" opacity="0.08"/>
    <rect x="22" y="65" width="76" height="62" rx="16" fill="url(#rrw_b)"/>
    <rect x="34" y="76" width="52" height="38" rx="9" fill="#fff" opacity="0.12"/>
    <rect x="42" y="84" width="36" height="2.5" rx="1.25" fill="#FED7AA"/>
    <rect x="42" y="91" width="28" height="2.5" rx="1.25" fill="#FED7AA" opacity="0.7"/>
    <rect x="42" y="98" width="33" height="2.5" rx="1.25" fill="#FED7AA" opacity="0.5"/>
    <rect x="42" y="105" width="3" height="8" rx="1" fill="#fff" opacity="0.9"/>
    <rect x="2" y="73" width="22" height="11" rx="5.5" fill="#C2410C"/>
    <rect x="96" y="73" width="22" height="11" rx="5.5" fill="#C2410C"/>
    <g transform="rotate(30 108 79)">
      <rect x="104" y="65" width="6" height="24" rx="3" fill="#FDE68A"/>
      <polygon points="104,89 110,89 107,97" fill="#F97316"/>
      <rect x="104" y="61" width="6" height="6" rx="1.5" fill="#FCA5A5"/>
    </g>
    <rect x="28" y="10" width="64" height="58" rx="18" fill="url(#rrw_h)"/>
    <ellipse cx="45" cy="20" rx="13" ry="5" fill="#fff" opacity="0.28"/>
    <path d="M 36 22 Q 40 19 44 22" stroke="#FED7AA" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M 76 22 Q 80 19 84 22" stroke="#FED7AA" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <rect x="55" y="0" width="10" height="14" rx="5" fill="#FED7AA"/>
    <circle cx="60" cy="0" r="7" fill="#FFEDD5"/>
    <circle cx="60" cy="0" r="3.5" fill="#fff" opacity="0.9"/>
    <circle cx="44" cy="34" r="11" fill="#fff" opacity="0.95"/>
    <circle cx="76" cy="34" r="11" fill="#fff" opacity="0.95"/>
    <circle cx="46" cy="34" r="7" fill="#431407"/>
    <circle cx="78" cy="34" r="7" fill="#431407"/>
    <circle cx="48" cy="31" r="2.5" fill="#fff"/>
    <circle cx="80" cy="31" r="2.5" fill="#fff"/>
    <path d="M 44 55 Q 58 62 72 57" stroke="#FED7AA" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </svg>
);

const robotMap: Record<string, () => JSX.Element> = {
  "Competitor Analyzer": RobotAnalyzer,
  "Text Summarizer": RobotSummarizer,
  "Sentiment Scorer": RobotSentiment,
  "Web Intelligence": RobotWebIntel,
  "Report Writer": RobotReportWriter,
};

const robotGlow: Record<string, string> = {
  "Competitor Analyzer": "from-blue-50 via-indigo-50 to-blue-100/50",
  "Text Summarizer": "from-violet-50 via-purple-50 to-violet-100/50",
  "Sentiment Scorer": "from-amber-50 via-yellow-50 to-orange-100/50",
  "Web Intelligence": "from-sky-50 via-cyan-50 to-sky-100/50",
  "Report Writer": "from-orange-50 via-red-50 to-orange-100/50",
};

function TiltCard({ tool, className }: { tool: Tool; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-50, 50], [5, -5]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [-50, 50], [-5, 5]), { stiffness: 150, damping: 18 });

  const handleMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 100);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 100);
  };
  const reset = () => { mx.set(0); my.set(0); };
  const col = catColor[tool.cat];
  const Robot = robotMap[tool.name];
  const glow = robotGlow[tool.name];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ type: "spring", stiffness: 100, damping: 18 }}
      className={`relative bg-white rounded-[2rem] overflow-hidden border border-[rgba(226,232,240,0.7)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] ${className ?? ""}`}
    >
      {/* Robot zone */}
      <div className={`flex justify-center items-end pt-8 pb-5 bg-gradient-to-br ${glow}`}>
        {Robot && <Robot />}
      </div>

      {/* Card content */}
      <div className="px-7 pt-5 pb-7">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${col.bg} ${col.text}`}>
            {tool.cat}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#0084FF]/8 text-[#0084FF]">
            <Check className="h-3 w-3" strokeWidth={2.5} /> Native
          </span>
        </div>

        <h3 className="font-display text-[17px] font-extrabold text-[#18181B] tracking-tight">{tool.name}</h3>
        <p className="mt-1.5 text-[13.5px] text-[#71717A] leading-relaxed">{tool.desc}</p>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold text-[#0084FF]">${tool.price}</span>
          <span className="text-[12px] text-slate-400">USDC per call</span>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Latency</p>
            <p className="text-[13px] font-semibold text-[#18181B]">{tool.latency}ms</p>
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Trust</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${tool.trust}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-[#0084FF] rounded-full"
                />
              </div>
              <span className="text-[12px] font-semibold text-[#18181B]">{tool.trust}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Tools() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#0084FF]" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#0084FF]">
            5 Native Tools
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.05 }}
          className="font-display text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-[-0.025em] leading-[1.08] text-[#18181B]"
        >
          Live on{" "}
          <span className="text-gradient-vivid">Arc Testnet</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-[15px] text-[#71717A] max-w-xl leading-relaxed"
        >
          Every tool is callable by any agent via x402 — priced in USDC, settled on-chain in under a second.
        </motion.p>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <TiltCard tool={tools[0]} className="lg:col-span-2" />
          <TiltCard tool={tools[1]} />
          <TiltCard tool={tools[2]} />
          <TiltCard tool={tools[3]} className="lg:col-span-2" />
          <TiltCard tool={tools[4]} />
        </div>
      </div>
    </section>
  );
}
