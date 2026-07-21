"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { isAddress, type Address } from "viem";

export interface CreateCycleInput {
  name: string;
  description: string;
  participants: Array<{ label: string; address: Address }>;
  verifiers: Array<{ label: string; address: Address }>;
  arbitrator: Address;
  verifierThreshold: number;
  evidenceDeadline: string;
  fundingDeadline: string;
  obligations: Array<{ payer: Address; provider: Address; title: string; acceptance: string; amount: string; bond: string }>;
}

interface Props {
  open: boolean;
  ownerAddress?: Address;
  disabledReason?: string;
  busy?: boolean;
  onClose: () => void;
  onCreate: (input: CreateCycleInput) => Promise<void>;
}

function dateAfter(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function uniqueAddresses(values: string[]) {
  const normalized = values.map((value) => value.toLowerCase());
  return new Set(normalized).size === normalized.length;
}

export function CreateCycleModal({ open, ownerAddress, disabledReason, busy, onClose, onCreate }: Props) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "closing">(open ? "open" : "closed");
  const phaseRef = useRef(phase);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("Agency delivery settlement");
  const [description, setDescription] = useState("Approve completed work, offset connected payments, and settle only the final USDC difference.");
  const [participants, setParticipants] = useState([{ label: "Customer", address: "" }, { label: "Service provider", address: "" }]);
  const [verifiers, setVerifiers] = useState([{ label: "Reviewer 1", address: "" }, { label: "Reviewer 2", address: "" }]);
  const [arbitrator, setArbitrator] = useState("");
  const [threshold, setThreshold] = useState(2);
  const [evidenceDeadline, setEvidenceDeadline] = useState(dateAfter(7));
  const [fundingDeadline, setFundingDeadline] = useState(dateAfter(14));
  const [obligations, setObligations] = useState([{ payer: "", provider: "", title: "Approved project delivery", acceptance: "The final delivery matches the agreed scope and is available at the submitted proof link.", amount: "10", bond: "1" }]);
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    if (open) {
      phaseRef.current = "opening";
      setPhase("opening");
      frame = requestAnimationFrame(() => {
        phaseRef.current = "open";
        setPhase("open");
      });
    } else if (phaseRef.current !== "closed") {
      phaseRef.current = "closing";
      setPhase("closing");
      timer = window.setTimeout(() => {
        phaseRef.current = "closed";
        setPhase("closed");
      }, 150);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    if (!ownerAddress) return;
    setParticipants((current) => current.map((item, index) => index === 0 ? { ...item, address: ownerAddress } : item));
    setObligations((current) => current.map((item, index) => index === 0 && !item.payer ? { ...item, payer: ownerAddress } : item));
  }, [open, ownerAddress]);

  const gross = useMemo(() => obligations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [obligations]);
  if (phase === "closed") return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }
    if (disabledReason) return setFormError(disabledReason);
    if (!ownerAddress) return setFormError("Connect the room creator wallet first.");
    const participantAddresses = participants.map((item) => item.address);
    const verifierAddresses = verifiers.map((item) => item.address);
    if (participantAddresses.some((address) => !isAddress(address)) || verifierAddresses.some((address) => !isAddress(address)) || !isAddress(arbitrator)) {
      return setFormError("Every participant, reviewer, and dispute resolver needs a valid EVM wallet.");
    }
    if (!participantAddresses.some((address) => address.toLowerCase() === ownerAddress.toLowerCase())) return setFormError("The connected room creator must be a participant.");
    if (!uniqueAddresses(participantAddresses) || !uniqueAddresses(verifierAddresses)) return setFormError("Role wallets cannot be duplicated.");
    const participantSet = new Set(participantAddresses.map((address) => address.toLowerCase()));
    if (verifierAddresses.some((address) => participantSet.has(address.toLowerCase())) || participantSet.has(arbitrator.toLowerCase()) || verifierAddresses.some((address) => address.toLowerCase() === arbitrator.toLowerCase())) {
      return setFormError("Reviewers and the dispute resolver must be independent from payment participants and each other.");
    }
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > verifiers.length) return setFormError("Required approvals must be between 1 and the reviewer count.");
    const evidenceAt = Date.parse(`${evidenceDeadline}T23:59:59Z`);
    const fundingAt = Date.parse(`${fundingDeadline}T23:59:59Z`);
    if (!Number.isFinite(evidenceAt) || evidenceAt <= Date.now() || !Number.isFinite(fundingAt) || fundingAt <= evidenceAt) return setFormError("The final payment date must be after the future proof deadline.");
    if (obligations.some((item) => !participantSet.has(item.payer.toLowerCase()) || !participantSet.has(item.provider.toLowerCase()) || item.payer.toLowerCase() === item.provider.toLowerCase() || !item.title.trim() || !item.acceptance.trim() || Number(item.amount) <= 0 || Number(item.bond) <= 0)) {
      return setFormError("Every payment commitment needs different customer/provider wallets, positive USDC amounts, a title, and a clear approval rule.");
    }
    try {
      await onCreate({
        name: name.trim(), description: description.trim(),
        participants: participants.map((item) => ({ label: item.label.trim(), address: item.address as Address })),
        verifiers: verifiers.map((item) => ({ label: item.label.trim(), address: item.address as Address })),
        arbitrator: arbitrator as Address, verifierThreshold: threshold, evidenceDeadline, fundingDeadline,
        obligations: obligations.map((item) => ({ ...item, payer: item.payer as Address, provider: item.provider as Address, title: item.title.trim(), acceptance: item.acceptance.trim() })),
      });
      onClose();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Settlement room creation failed.");
    }
  }

  function applyTemplate(template: "agency" | "agents" | "suppliers") {
    const presets = {
      agency: { name: "Agency delivery settlement", description: "Approve client work, offset connected contractor payments, and settle the final USDC difference.", labels: ["Customer", "Agency"], title: "Approved project delivery", acceptance: "The final delivery matches the agreed scope and is available at the submitted proof link." },
      agents: { name: "AI service marketplace settlement", description: "Review services exchanged between autonomous agents and settle their final USDC balances.", labels: ["Buyer agent", "Provider agent"], title: "Verified agent service", acceptance: "The submitted output matches the agreed request, format, and delivery deadline." },
      suppliers: { name: "Supplier network settlement", description: "Approve fulfilled orders across connected suppliers and settle only each company’s final balance.", labels: ["Buyer", "Supplier"], title: "Accepted order delivery", acceptance: "The order was delivered in the agreed quantity and condition with a valid proof reference." },
    } as const;
    const preset = presets[template];
    setName(preset.name);
    setDescription(preset.description);
    setParticipants((current) => preset.labels.map((label, index) => ({ label, address: current[index]?.address ?? "" })));
    setObligations((current) => current.map((item, index) => index === 0 ? { ...item, title: preset.title, acceptance: preset.acceptance } : item));
  }

  return (
    <div className={`t-modal-overlay fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm ${phase === "open" ? "is-open" : phase === "closing" ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="create-cycle-title">
      <form onSubmit={submit} className={`t-modal cd-scrollbar max-h-[94dvh] w-full max-w-[980px] overflow-y-auto rounded-[20px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,.25)] ${phase === "open" ? "is-open" : phase === "closing" ? "is-closing" : ""}`}>
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-600">New settlement room</p><h2 id="create-cycle-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Set up who pays whom.</h2><p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-600">Record the people, payment commitments, and independent reviewers. ClearDeal will calculate the final USDC difference after work is approved.</p></div>
          <button type="button" disabled={busy} onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-950" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <nav className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70" aria-label="Room setup progress">{([[1, "Room"], [2, "People"], [3, "Payments"]] as const).map(([number, label]) => <div key={number} className={`flex min-h-14 items-center justify-center gap-2 border-r border-slate-200 text-[11px] last:border-0 ${step === number ? "bg-blue-50 text-blue-700" : step > number ? "text-emerald-700" : "text-slate-400"}`}><span className={`grid h-6 w-6 place-items-center rounded-full font-mono text-[9px] ${step === number ? "bg-blue-600 text-white" : step > number ? "bg-emerald-100" : "bg-slate-100"}`}>0{number}</span><span className="font-semibold">{label}</span></div>)}</nav>

        <div key={step} className="t-step-enter">
        {step === 1 ? <section className="p-6"><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">Start from a real scenario</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><TemplateButton title="Agency & contractors" text="Client work and downstream delivery" onClick={() => applyTemplate("agency")} /><TemplateButton title="AI service marketplace" text="Agents buying services from agents" onClick={() => applyTemplate("agents")} /><TemplateButton title="Supplier network" text="Connected orders between companies" onClick={() => applyTemplate("suppliers")} /></div></div><div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Room name"><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="cd-input" /></Field>
          <Field label="Description" wide><textarea required maxLength={500} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="cd-input resize-none" /></Field>
          <Field label="Proof of work due"><input required type="date" min={dateAfter(1)} value={evidenceDeadline} onChange={(event) => setEvidenceDeadline(event.target.value)} className="cd-input" /></Field>
          <Field label="Final payment due"><input required type="date" min={dateAfter(2)} value={fundingDeadline} onChange={(event) => setFundingDeadline(event.target.value)} className="cd-input" /></Field>
        </div></section> : null}

        {step === 2 ? <div><RoleEditor title="Payment participants" hint="Add every person, company, or agent that can owe or receive USDC. Your connected wallet is included first." rows={participants} setRows={setParticipants} max={20} ownerAddress={ownerAddress} />
        <RoleEditor title="Independent reviewers" hint="These wallets approve proof of completed work and cannot be payment participants." rows={verifiers} setRows={setVerifiers} max={10} />
        <section className="grid gap-5 border-t border-white/[0.1] p-6 md:grid-cols-2"><Field label="Approvals required"><input required type="number" min={1} max={verifiers.length} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="cd-input" /></Field><Field label="Independent dispute resolver"><input required value={arbitrator} onChange={(event) => setArbitrator(event.target.value)} placeholder="0x…" className="cd-input font-mono" /></Field></section></div> : null}

        {step === 3 ? <section className="p-6">
          <div className="flex items-end justify-between gap-4"><div><h3 className="text-sm font-semibold text-white">Payment commitments</h3><p className="mt-1 text-[12px] text-white/36">Only approved work is included when final balances are calculated.</p></div><div className="text-right"><p className="font-mono text-[9px] uppercase text-white/30">Total recorded</p><strong className="mt-1 block font-mono text-lg text-white">{gross.toLocaleString()} USDC</strong></div></div>
          <div className="mt-5 space-y-4">
            {obligations.map((item, index) => <div key={index} className="border border-white/[0.1] bg-white/[0.018] p-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Customer"><select required value={item.payer} onChange={(event) => setObligations((rows) => rows.map((row, i) => i === index ? { ...row, payer: event.target.value } : row))} className="cd-input"><option value="">Select wallet</option>{participants.filter((row) => isAddress(row.address)).map((row) => <option key={row.address} value={row.address}>{row.label || row.address}</option>)}</select></Field>
                <Field label="Provider"><select required value={item.provider} onChange={(event) => setObligations((rows) => rows.map((row, i) => i === index ? { ...row, provider: event.target.value } : row))} className="cd-input"><option value="">Select wallet</option>{participants.filter((row) => isAddress(row.address)).map((row) => <option key={row.address} value={row.address}>{row.label || row.address}</option>)}</select></Field>
                <Field label="Payment (USDC)"><input required type="number" min="0.000001" step="0.000001" value={item.amount} onChange={(event) => setObligations((rows) => rows.map((row, i) => i === index ? { ...row, amount: event.target.value } : row))} className="cd-input font-mono" /></Field>
                <Field label="Provider guarantee"><input required type="number" min="0.000001" step="0.000001" value={item.bond} onChange={(event) => setObligations((rows) => rows.map((row, i) => i === index ? { ...row, bond: event.target.value } : row))} className="cd-input font-mono" /></Field>
                <Field label="Work or delivery" wide><input required maxLength={120} value={item.title} onChange={(event) => setObligations((rows) => rows.map((row, i) => i === index ? { ...row, title: event.target.value } : row))} className="cd-input" /></Field>
                <Field label="What counts as approved?" wide><textarea required rows={2} maxLength={500} value={item.acceptance} onChange={(event) => setObligations((rows) => rows.map((row, i) => i === index ? { ...row, acceptance: event.target.value } : row))} className="cd-input resize-none" /></Field>
              </div>
              <button type="button" disabled={obligations.length === 1 || busy} onClick={() => setObligations((rows) => rows.filter((_, i) => i !== index))} className="mt-3 inline-flex items-center gap-2 text-[11px] text-rose-300/65 hover:text-rose-200 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /> Remove payment</button>
            </div>)}
          </div>
          <button type="button" disabled={obligations.length >= 20 || busy} onClick={() => setObligations((rows) => [...rows, { payer: participants[0]?.address ?? "", provider: "", title: "", acceptance: "", amount: "", bond: "" }])} className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-blue-300"><Plus className="h-4 w-4" /> Add payment commitment</button>
        </section> : null}
        </div>

        <div className="mx-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-800">Arc Testnet only. Wallets, payment amounts, proof hashes, reviews, final balances, and settlement results are public. Testnet USDC has no real-world value.</div>
        {formError ? <p className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[12px] text-rose-700" role="alert">{formError}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 p-6 sm:flex-row sm:justify-between"><div className="flex gap-3"><button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>{step > 1 ? <button type="button" onClick={() => setStep((current) => current - 1)} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /> Back</button> : null}</div><button type="submit" disabled={busy || (step === 3 && Boolean(disabledReason))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-40">{busy ? "Waiting for wallet…" : step < 3 ? <>Continue <ChevronRight className="h-4 w-4" /></> : "Sign & create room"}</button></div>
      </form>
    </div>
  );
}

function RoleEditor({ title, hint, rows, setRows, max, ownerAddress }: { title: string; hint: string; rows: Array<{ label: string; address: string }>; setRows: React.Dispatch<React.SetStateAction<Array<{ label: string; address: string }>>>; max: number; ownerAddress?: Address }) {
  return <section className="border-t border-white/[0.1] p-6"><h3 className="text-sm font-semibold text-white">{title}</h3><p className="mt-1 text-[12px] text-white/36">{hint}</p><div className="mt-4 space-y-3">{rows.map((row, index) => <div key={index} className="grid gap-3 sm:grid-cols-[180px_1fr_auto]"><input required maxLength={60} value={row.label} onChange={(event) => setRows((current) => current.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} placeholder="Role label" className="cd-input" /><input required value={row.address} readOnly={index === 0 && Boolean(ownerAddress)} onChange={(event) => setRows((current) => current.map((item, i) => i === index ? { ...item, address: event.target.value } : item))} placeholder="0x…" className="cd-input font-mono read-only:opacity-60" /><button type="button" disabled={rows.length === 1 || (index === 0 && Boolean(ownerAddress))} onClick={() => setRows((current) => current.filter((_, i) => i !== index))} className="grid h-[42px] w-[42px] place-items-center border border-white/[0.1] text-white/30 hover:text-rose-300 disabled:opacity-25" aria-label={`Remove ${title} row ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}</div><button type="button" disabled={rows.length >= max} onClick={() => setRows((current) => [...current, { label: `${title.replace(/s$/, "")} ${current.length + 1}`, address: "" }])} className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-blue-300 disabled:opacity-40"><Plus className="h-4 w-4" /> Add {title.toLowerCase().replace(/s$/, "")}</button></section>;
}

function TemplateButton({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-20 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-blue-300 hover:bg-blue-50"><strong className="block text-[12px] text-slate-800">{title}</strong><span className="mt-1 block text-[10px] leading-4 text-slate-500">{text}</span></button>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`grid gap-2 ${wide ? "md:col-span-2" : ""}`}><span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>{children}</label>;
}
