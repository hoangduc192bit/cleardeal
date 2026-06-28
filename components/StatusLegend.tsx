const realItems = [
  "Pulse Price Feed subscription",
  "Yield & Risk Agent subscriptions",
  "Provider payout and user refund",
  "ArcScan transaction proofs",
];

const demoItems = [
  "HTTP 402 Payment Required integration",
  "On-chain transaction verification",
  "Instant API unlock upon payment",
  "Secure encrypted payload delivery",
];

export function StatusLegend({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "grid gap-3 md:grid-cols-2" : "grid gap-5 md:grid-cols-2"}>
      <StatusGroup
        title="Streaming Smart Contracts"
        tone="real"
        items={realItems}
        compact={compact}
      />
      <StatusGroup
        title="x402 Pay-Per-Call Protocol"
        tone="demo"
        items={demoItems}
        compact={compact}
      />
    </section>
  );
}

function StatusGroup({
  title,
  tone,
  items,
  compact,
}: {
  title: string;
  tone: "real" | "demo";
  items: string[];
  compact: boolean;
}) {
  const dotColor = tone === "real" ? "bg-emerald-500" : "bg-[#0084FF]";
  const checkColor = tone === "real" ? "text-emerald-500" : "text-[#0084FF]";
  return (
    <div className={`bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-[20px] border border-white/80 ring-1 ring-black/[0.04] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_8px_32px_-4px_rgba(0,0,0,0.06)] rounded-3xl ${compact ? "p-5" : "p-6"}`}>
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <h3 className="text-[14px] font-extrabold text-neutral-900" style={{ fontFamily: "var(--font-outfit, Outfit, sans-serif)" }}>{title}</h3>
      </div>
      <ul className={`${compact ? "mt-3" : "mt-5"} space-y-2.5 text-[13px]`} style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        {items.map((item) => (
          <li className="flex items-center gap-2.5 text-neutral-600" key={item}>
            <svg className={`h-3.5 w-3.5 shrink-0 ${checkColor}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 10.5l3.5 3.5L15 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
