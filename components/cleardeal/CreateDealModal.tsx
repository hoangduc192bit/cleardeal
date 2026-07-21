"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { isAddress } from "viem";

export interface CreateDealInput {
  client: string;
  title: string;
  seller: `0x${string}`;
  arbitrator: `0x${string}`;
  refundDeadline: string;
  milestones: Array<{ title: string; amount: string; dueDate: string }>;
}

interface Props {
  open: boolean;
  ownerAddress?: `0x${string}`;
  disabledReason?: string;
  busy?: boolean;
  onClose: () => void;
  onCreate: (input: CreateDealInput) => Promise<void>;
}

function dateAfter(days: number) {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

export function CreateDealModal({ open, ownerAddress, disabledReason, busy, onClose, onCreate }: Props) {
  const [client, setClient] = useState("");
  const [title, setTitle] = useState("");
  const [seller, setSeller] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [refundDeadline, setRefundDeadline] = useState(dateAfter(45));
  const [formError, setFormError] = useState<string>();
  const [milestones, setMilestones] = useState([
    { title: "Project kickoff", amount: "500", dueDate: dateAfter(14) },
    { title: "Final delivery", amount: "500", dueDate: dateAfter(30) },
  ]);

  const total = useMemo(() => milestones.reduce((sum, milestone) => sum + (Number(milestone.amount) || 0), 0), [milestones]);
  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    if (disabledReason) return setFormError(disabledReason);
    if (!ownerAddress) return setFormError("Connect the buyer wallet first.");
    if (!isAddress(seller) || !isAddress(arbitrator)) return setFormError("Seller and arbitrator must be valid EVM addresses.");
    if (seller.toLowerCase() === ownerAddress.toLowerCase()) return setFormError("Buyer and seller must use different wallets.");
    if (arbitrator.toLowerCase() === ownerAddress.toLowerCase() || arbitrator.toLowerCase() === seller.toLowerCase()) {
      return setFormError("The arbitrator must be independent from buyer and seller.");
    }
    const refundAt = Date.parse(`${refundDeadline}T23:59:59Z`);
    const dueDates = milestones.map((milestone) => Date.parse(`${milestone.dueDate}T23:59:59Z`));
    if (!Number.isFinite(refundAt) || dueDates.some((dueAt) => !Number.isFinite(dueAt) || dueAt <= Date.now() || dueAt >= refundAt)) {
      return setFormError("Every milestone must be in the future and before the refund deadline.");
    }
    if (total <= 0 || milestones.some((milestone) => !milestone.title.trim() || Number(milestone.amount) <= 0)) {
      return setFormError("Every milestone needs a title and a positive USDC amount.");
    }

    try {
      await onCreate({
        client: client.trim(),
        title: title.trim(),
        seller,
        arbitrator,
        refundDeadline,
        milestones: milestones.map((milestone) => ({ ...milestone, title: milestone.title.trim() })),
      });
      onClose();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Deal creation failed.");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-deal-title">
      <form onSubmit={submit} className="cd-scrollbar max-h-[92dvh] w-full max-w-[760px] overflow-y-auto border border-white/[0.14] bg-[#090f16] shadow-[0_30px_120px_rgba(0,0,0,.7)]">
        <div className="flex items-start justify-between border-b border-white/[0.1] p-6">
          <div><h2 id="create-deal-title" className="text-2xl font-semibold tracking-[-0.03em] text-white">Create an onchain deal</h2><p className="mt-2 text-[13px] text-white/42">Metadata is wallet-signed, hashed, and anchored to ClearDealEscrow on Arc Testnet.</p></div>
          <button type="button" disabled={busy} onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/[0.1] text-white/50 hover:text-white disabled:opacity-40" aria-label="Close create deal"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <Field label="Client name"><input required maxLength={80} value={client} onChange={(event) => setClient(event.target.value)} placeholder="Acme Commerce" className="cd-input" /></Field>
          <Field label="Deal title"><input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Commerce website" className="cd-input" /></Field>
          <Field label="Seller wallet"><input required value={seller} onChange={(event) => setSeller(event.target.value)} placeholder="0x..." className="cd-input font-mono" /></Field>
          <Field label="Independent arbitrator"><input required value={arbitrator} onChange={(event) => setArbitrator(event.target.value)} placeholder="0x..." className="cd-input font-mono" /></Field>
          <Field label="Refund deadline"><input required type="date" min={dateAfter(2)} value={refundDeadline} onChange={(event) => setRefundDeadline(event.target.value)} className="cd-input" /></Field>
          <div className="border border-amber-400/15 bg-amber-400/[0.05] p-4 text-[11px] leading-5 text-amber-100/60">All role addresses and amounts become public blockchain data. Use Arc Testnet wallets and faucet USDC only; the contract is not professionally audited.</div>
        </div>

        <div className="border-t border-white/[0.1] p-6">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-white">Milestones</h3><p className="mt-1 text-[12px] text-white/36">Each milestone releases separately to the seller wallet.</p></div><strong className="font-mono text-sm text-white">{total.toLocaleString()} USDC</strong></div>
          <div className="mt-5 space-y-3">
            {milestones.map((milestone, index) => (
              <div key={index} className="grid gap-3 border border-white/[0.09] bg-white/[0.02] p-4 sm:grid-cols-[1fr_140px_160px_auto]">
                <input required maxLength={120} value={milestone.title} onChange={(event) => setMilestones((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} className="cd-input" aria-label={`Milestone ${index + 1} title`} />
                <input required min="0.01" step="0.000001" type="number" value={milestone.amount} onChange={(event) => setMilestones((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} className="cd-input font-mono" aria-label={`Milestone ${index + 1} amount`} />
                <input required type="date" min={dateAfter(1)} value={milestone.dueDate} onChange={(event) => setMilestones((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, dueDate: event.target.value } : item))} className="cd-input" aria-label={`Milestone ${index + 1} due date`} />
                <button type="button" disabled={milestones.length === 1 || busy} onClick={() => setMilestones((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="grid h-10 w-10 place-items-center border border-white/[0.1] text-white/35 hover:text-rose-300 disabled:opacity-30" aria-label={`Remove milestone ${index + 1}`}><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" disabled={milestones.length >= 20 || busy} onClick={() => setMilestones((current) => [...current, { title: "", amount: "", dueDate: dateAfter(30) }])} className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-40"><Plus className="h-4 w-4" /> Add milestone</button>
        </div>

        {formError ? <p className="mx-6 border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-[12px] text-rose-200" role="alert">{formError}</p> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-white/[0.1] p-6 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onClose} className="min-h-11 border border-white/[0.12] px-5 text-[13px] font-semibold text-white/62 hover:text-white disabled:opacity-40">Cancel</button>
          <button type="submit" disabled={busy || Boolean(disabledReason)} className="min-h-11 bg-blue-600 px-5 text-[13px] font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Waiting for wallet…" : "Sign & create on Arc"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/32">{label}</span>{children}</label>;
}
