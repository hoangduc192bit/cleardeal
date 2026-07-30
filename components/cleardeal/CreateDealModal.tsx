"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { isAddress } from "viem";

import type { WalletDirectoryEntry } from "@/hooks/use-wallet-directory";
import {
  clearDealProjectTemplates,
  clearDealTemplate,
  dateAfterDays,
  templateMilestones,
  type ClearDealTemplateId,
} from "@/lib/cleardeal-project-templates";
import type { ClearDealProjectCategory } from "@/lib/cleardeal-metadata";

export interface CreateDealInput {
  client: string;
  team: string;
  clientEmail?: string;
  teamEmail?: string;
  title: string;
  category: ClearDealProjectCategory;
  summary: string;
  seller: `0x${string}`;
  arbitrator: `0x${string}`;
  refundDeadline: string;
  reviewHours: number;
  maxRevisions: number;
  milestones: Array<{
    title: string;
    amount: string;
    dueDate: string;
    deliverable: string;
    acceptanceCriteria: string;
  }>;
}

interface Props {
  open: boolean;
  ownerAddress?: `0x${string}`;
  directoryEntries?: readonly WalletDirectoryEntry[];
  disabledReason?: string;
  busy?: boolean;
  onClose: () => void;
  onCreate: (input: CreateDealInput) => Promise<void>;
}

type Step = 1 | 2 | 3;

export function CreateDealModal({
  open,
  ownerAddress,
  directoryEntries = [],
  disabledReason,
  busy,
  onClose,
  onCreate,
}: Props) {
  const initialTemplate = clearDealTemplate("website");
  const [step, setStep] = useState<Step>(1);
  const [templateId, setTemplateId] =
    useState<ClearDealTemplateId>("website");
  const [client, setClient] = useState("");
  const [team, setTeam] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [title, setTitle] = useState(initialTemplate.projectTitle);
  const [category, setCategory] = useState<ClearDealProjectCategory>(
    initialTemplate.category,
  );
  const [summary, setSummary] = useState(initialTemplate.projectSummary);
  const [seller, setSeller] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [refundDeadline, setRefundDeadline] = useState(dateAfterDays(45));
  const [reviewHours, setReviewHours] = useState(
    initialTemplate.reviewHours,
  );
  const [maxRevisions, setMaxRevisions] = useState(
    initialTemplate.maxRevisions,
  );
  const [formError, setFormError] = useState<string>();
  const [milestones, setMilestones] = useState(
    templateMilestones("website"),
  );

  const total = useMemo(
    () =>
      milestones.reduce(
        (sum, milestone) => sum + (Number(milestone.amount) || 0),
        0,
      ),
    [milestones],
  );

  if (!open) return null;

  function chooseTemplate(nextTemplateId: ClearDealTemplateId) {
    const template = clearDealTemplate(nextTemplateId);
    setTemplateId(nextTemplateId);
    setCategory(template.category);
    setTitle(template.projectTitle);
    setSummary(template.projectSummary);
    setReviewHours(template.reviewHours);
    setMaxRevisions(template.maxRevisions);
    setMilestones(templateMilestones(nextTemplateId));
    setRefundDeadline(dateAfterDays(45));
    setFormError(undefined);
  }

  function validateParties() {
    if (!client.trim()) return "Add the client or company name.";
    if (!team.trim()) return "Add the team or freelancer name.";
    if (!title.trim()) return "Add a project title.";
    if (!summary.trim()) return "Describe the result this project must deliver.";
    if (!isAddress(seller) || !isAddress(arbitrator)) {
      return "Choose valid team and dispute-helper wallets.";
    }
    if (
      ownerAddress &&
      seller.toLowerCase() === ownerAddress.toLowerCase()
    ) {
      return "The client and team must use different wallets.";
    }
    if (
      (ownerAddress &&
        arbitrator.toLowerCase() === ownerAddress.toLowerCase()) ||
      arbitrator.toLowerCase() === seller.toLowerCase()
    ) {
      return "The dispute helper must be independent from the client and team.";
    }
  }

  function validateTerms() {
    const refundAt = Date.parse(`${refundDeadline}T23:59:59Z`);
    const dueDates = milestones.map((milestone) =>
      Date.parse(`${milestone.dueDate}T23:59:59Z`),
    );
    if (
      !Number.isFinite(refundAt) ||
      dueDates.some(
        (dueAt) =>
          !Number.isFinite(dueAt) ||
          dueAt <= Date.now() ||
          dueAt >= refundAt,
      )
    ) {
      return "Every delivery date must be in the future and before the project refund deadline.";
    }
    if (
      total <= 0 ||
      milestones.some(
        (milestone) =>
          !milestone.title.trim() ||
          Number(milestone.amount) <= 0 ||
          !milestone.deliverable.trim() ||
          !milestone.acceptanceCriteria.trim(),
      )
    ) {
      return "Every step needs a title, price, deliverable, and a clear approval check.";
    }
    if (
      !Number.isInteger(reviewHours) ||
      reviewHours < 1 ||
      reviewHours > 720
    ) {
      return "The review window must be between 1 hour and 30 days.";
    }
    if (
      !Number.isInteger(maxRevisions) ||
      maxRevisions < 0 ||
      maxRevisions > 10
    ) {
      return "The revision limit must be between 0 and 10.";
    }
  }

  function nextStep() {
    setFormError(undefined);
    if (step === 1) {
      setStep(2);
      return;
    }
    const error = validateParties();
    if (error) {
      setFormError(error);
      return;
    }
    setStep(3);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    if (step !== 3) {
      nextStep();
      return;
    }
    if (disabledReason) return setFormError(disabledReason);
    const partiesError = validateParties();
    if (partiesError) return setFormError(partiesError);
    const termsError = validateTerms();
    if (termsError) return setFormError(termsError);

    try {
      await onCreate({
        client: client.trim(),
        team: team.trim(),
        ...(clientEmail.trim() ? { clientEmail: clientEmail.trim() } : {}),
        ...(teamEmail.trim() ? { teamEmail: teamEmail.trim() } : {}),
        title: title.trim(),
        category,
        summary: summary.trim(),
        seller: seller as `0x${string}`,
        arbitrator: arbitrator as `0x${string}`,
        refundDeadline,
        reviewHours,
        maxRevisions,
        milestones: milestones.map((milestone) => ({
          ...milestone,
          title: milestone.title.trim(),
          deliverable: milestone.deliverable.trim(),
          acceptanceCriteria: milestone.acceptanceCriteria.trim(),
        })),
      });
      onClose();
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "Project creation failed.",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-deal-title"
    >
      <form
        onSubmit={submit}
        className="cd-scrollbar max-h-[94dvh] w-full max-w-[960px] overflow-y-auto border border-white/[0.14] bg-[#090f16] shadow-[0_30px_120px_rgba(0,0,0,.7)]"
      >
        <div className="flex items-start justify-between border-b border-white/[0.1] p-5 sm:p-6">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-blue-300/70">
              New protected project
            </p>
            <h2
              id="create-deal-title"
              className="mt-2 font-display text-3xl tracking-[-0.03em] text-white"
            >
              {step === 1
                ? "What are you hiring for?"
                : step === 2
                  ? "Who is working together?"
                  : "What gets delivered and paid?"}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-white/45">
              {step === 1
                ? "Start with a practical template. You can change every detail before signing."
                : step === 2
                  ? "The client creates the project. The team gets paid and an independent helper handles disputes."
                  : "Each payment needs a concrete result and a simple test the client can understand."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center border border-white/[0.1] text-white/50 hover:text-white disabled:opacity-40"
            aria-label="Close create project"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 border-b border-white/[0.1]">
          {(["Project type", "People", "Delivery & payment"] as const).map(
            (label, index) => {
              const number = (index + 1) as Step;
              const complete = step > number;
              return (
                <div
                  key={label}
                  className={`flex min-h-14 items-center justify-center gap-2 border-r border-white/[0.1] px-2 text-center text-[10px] last:border-r-0 sm:text-[12px] ${
                    step === number
                      ? "bg-blue-500/10 text-blue-200"
                      : complete
                        ? "text-emerald-300"
                        : "text-white/30"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[9px] ${
                      complete
                        ? "border-emerald-400/40 bg-emerald-400/10"
                        : "border-current"
                    }`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : number}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              );
            },
          )}
        </div>

        {step === 1 ? (
          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            {clearDealProjectTemplates.map((template) => {
              const selected = template.id === templateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => chooseTemplate(template.id)}
                  className={`min-h-32 border p-5 text-left transition-colors ${
                    selected
                      ? "border-blue-400 bg-blue-400/[0.1]"
                      : "border-white/[0.1] bg-white/[0.02] hover:border-white/30"
                  }`}
                >
                  <span className="flex items-start justify-between gap-4">
                    <span>
                      <strong className="block text-[15px] text-white">
                        {template.name}
                      </strong>
                      <span className="mt-2 block text-[12px] leading-6 text-white/45">
                        {template.description}
                      </span>
                    </span>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                        selected
                          ? "border-blue-300 bg-blue-500 text-white"
                          : "border-white/20 text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="mt-4 block font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
                    {template.milestones.length} payment{" "}
                    {template.milestones.length === 1 ? "step" : "steps"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Client or company">
              <input
                required
                maxLength={80}
                value={client}
                onChange={(event) => setClient(event.target.value)}
                placeholder="Northstar Studio"
                className="cd-input"
              />
            </Field>
            <Field label="Team or freelancer">
              <input
                required
                maxLength={80}
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                placeholder="Saigon Digital"
                className="cd-input"
              />
            </Field>
            <Field label="Client email (optional)">
              <input
                type="email"
                maxLength={254}
                value={clientEmail}
                onChange={(event) => setClientEmail(event.target.value)}
                placeholder="client@company.com"
                className="cd-input"
              />
            </Field>
            <Field label="Team email (optional)">
              <input
                type="email"
                maxLength={254}
                value={teamEmail}
                onChange={(event) => setTeamEmail(event.target.value)}
                placeholder="team@studio.vn"
                className="cd-input"
              />
            </Field>
            <Field label="Project title">
              <input
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Vietnam website launch"
                className="cd-input"
              />
            </Field>
            <Field label="Project category">
              <input
                readOnly
                value={category}
                className="cd-input cursor-default text-white/60"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Result this project must deliver">
                <textarea
                  required
                  maxLength={700}
                  rows={3}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="Describe the final result in plain language."
                  className="cd-input resize-y"
                />
              </Field>
            </div>
            <WalletField
              label="Team payment wallet"
              value={seller}
              onChange={setSeller}
              entries={directoryEntries.filter(
                (entry) =>
                  entry.category === "Team" ||
                  entry.category === "Vendor" ||
                  entry.category === "Other",
              )}
              placeholder="0x..."
            />
            <WalletField
              label="Independent dispute helper"
              value={arbitrator}
              onChange={setArbitrator}
              entries={directoryEntries.filter(
                (entry) =>
                  !sameAddress(entry.address, ownerAddress) &&
                  !sameAddress(entry.address, seller),
              )}
              placeholder="0x..."
            />
            <div className="sm:col-span-2 border border-blue-400/15 bg-blue-400/[0.05] p-4 text-[11px] leading-5 text-blue-100/60">
              Tip: save frequent teams and helpers under <strong>Wallet contacts</strong>.
              Next time, choose their name instead of copying a long address.
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-[15px] font-semibold text-white">
                  Delivery and payment steps
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-white/40">
                  A step can be approved, sent back for changes, disputed, or
                  automatically paid after the review window.
                </p>
              </div>
              <div className="shrink-0 border border-white/[0.1] px-4 py-3 text-right">
                <span className="block font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">
                  Total project budget
                </span>
                <strong className="mt-1 block font-mono text-base text-white">
                  {total.toLocaleString()} USDC
                </strong>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="border border-white/[0.1] bg-white/[0.02] p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-blue-300/70">
                      Step {index + 1}
                    </p>
                    <button
                      type="button"
                      disabled={milestones.length === 1 || busy}
                      onClick={() =>
                        setMilestones((current) =>
                          current.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                      className="grid h-11 w-11 place-items-center border border-white/[0.1] text-white/35 hover:text-rose-300 disabled:opacity-30"
                      aria-label={`Remove delivery step ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px_170px]">
                    <Field label="Step name">
                      <input
                        required
                        maxLength={120}
                        value={milestone.title}
                        onChange={(event) =>
                          updateMilestone(
                            setMilestones,
                            index,
                            "title",
                            event.target.value,
                          )
                        }
                        className="cd-input"
                        placeholder="Working website"
                      />
                    </Field>
                    <Field label="Payment (USDC)">
                      <input
                        required
                        min="0.01"
                        step="0.000001"
                        type="number"
                        value={milestone.amount}
                        onChange={(event) =>
                          updateMilestone(
                            setMilestones,
                            index,
                            "amount",
                            event.target.value,
                          )
                        }
                        className="cd-input font-mono"
                      />
                    </Field>
                    <Field label="Delivery date">
                      <input
                        required
                        type="date"
                        min={dateAfterDays(1)}
                        value={milestone.dueDate}
                        onChange={(event) =>
                          updateMilestone(
                            setMilestones,
                            index,
                            "dueDate",
                            event.target.value,
                          )
                        }
                        className="cd-input"
                      />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="What exactly will the team deliver?">
                      <textarea
                        required
                        maxLength={500}
                        rows={3}
                        value={milestone.deliverable}
                        onChange={(event) =>
                          updateMilestone(
                            setMilestones,
                            index,
                            "deliverable",
                            event.target.value,
                          )
                        }
                        className="cd-input resize-y"
                        placeholder="A deployed staging website with the agreed pages and forms."
                      />
                    </Field>
                    <Field label="How does the client decide it is complete?">
                      <textarea
                        required
                        maxLength={700}
                        rows={3}
                        value={milestone.acceptanceCriteria}
                        onChange={(event) =>
                          updateMilestone(
                            setMilestones,
                            index,
                            "acceptanceCriteria",
                            event.target.value,
                          )
                        }
                        className="cd-input resize-y"
                        placeholder="All agreed pages load on mobile and desktop, and the contact form works."
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={milestones.length >= 20 || busy}
              onClick={() =>
                setMilestones((current) => [
                  ...current,
                  {
                    title: "",
                    amount: "",
                    dueDate: dateAfterDays(30),
                    deliverable: "",
                    acceptanceCriteria: "",
                  },
                ])
              }
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-[12px] font-semibold text-blue-300 hover:text-blue-200 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add delivery step
            </button>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Field label="Client review time">
                <select
                  value={reviewHours}
                  onChange={(event) =>
                    setReviewHours(Number(event.target.value))
                  }
                  className="cd-input"
                >
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours (recommended)</option>
                  <option value={168}>7 days</option>
                </select>
              </Field>
              <Field label="Included revision rounds">
                <select
                  value={maxRevisions}
                  onChange={(event) =>
                    setMaxRevisions(Number(event.target.value))
                  }
                  className="cd-input"
                >
                  <option value={0}>No revision round</option>
                  <option value={1}>1 revision round</option>
                  <option value={2}>2 revision rounds</option>
                  <option value={3}>3 revision rounds</option>
                </select>
              </Field>
              <Field label="Project refund deadline">
                <input
                  required
                  type="date"
                  min={dateAfterDays(2)}
                  value={refundDeadline}
                  onChange={(event) => setRefundDeadline(event.target.value)}
                  className="cd-input"
                />
              </Field>
            </div>

            <div className="mt-6 border border-amber-400/15 bg-amber-400/[0.05] p-4 text-[11px] leading-5 text-amber-100/60">
              Arc Testnet only. Wallets, project amounts, and approval results are
              public. Uploaded files stay behind ClearDeal participant access.
              Test USDC has no real-world value.
            </div>
            {disabledReason ? (
              <div className="mt-4 border border-blue-400/20 bg-blue-400/[0.07] p-4 text-[11px] leading-5 text-blue-100/75">
                Your draft is ready. {disabledReason} Close this window, use
                <strong> Sign in</strong> in the top bar, then return to sign
                and create it.
              </div>
            ) : null}
          </div>
        ) : null}

        {formError ? (
          <p
            className="mx-5 mb-5 border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-[12px] text-rose-200 sm:mx-6"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-white/[0.1] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            {step > 1 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep((step - 1) as Step);
                  setFormError(undefined);
                }}
                className="inline-flex min-h-11 items-center gap-2 border border-white/[0.12] px-5 text-[13px] font-semibold text-white/62 hover:text-white disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="min-h-11 border border-white/[0.12] px-5 text-[13px] font-semibold text-white/62 hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>
            )}
          </div>
          {step < 3 ? (
            <button
              type="button"
              disabled={busy}
              onClick={nextStep}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-blue-600 px-6 text-[13px] font-semibold text-white hover:bg-blue-500 disabled:opacity-45"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy || Boolean(disabledReason)}
              className="min-h-12 bg-blue-600 px-6 text-[13px] font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy
                ? "Waiting for wallet..."
                : disabledReason
                  ? "Sign in to create"
                  : "Sign & create project"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/38">
        {label}
      </span>
      {children}
    </label>
  );
}

function WalletField({
  label,
  value,
  onChange,
  entries,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  entries: readonly WalletDirectoryEntry[];
  placeholder: string;
}) {
  return (
    <Field label={label}>
      <div className="grid gap-2">
        {entries.length ? (
          <select
            value={entries.some((entry) => sameAddress(entry.address, value)) ? value : ""}
            onChange={(event) => {
              const entry = entries.find((item) =>
                sameAddress(item.address, event.target.value),
              );
              if (entry) onChange(entry.address);
            }}
            className="cd-input"
            aria-label={`Choose saved ${label.toLowerCase()}`}
          >
            <option value="">Choose a saved wallet...</option>
            {entries.map((entry) => (
              <option key={entry.address} value={entry.address}>
                {entry.name} · {entry.category}
              </option>
            ))}
          </select>
        ) : null}
        <input
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="cd-input font-mono"
        />
      </div>
    </Field>
  );
}

function sameAddress(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function updateMilestone(
  setMilestones: Dispatch<
    SetStateAction<
      Array<{
        title: string;
        amount: string;
        dueDate: string;
        deliverable: string;
        acceptanceCriteria: string;
      }>
    >
  >,
  index: number,
  field:
    | "title"
    | "amount"
    | "dueDate"
    | "deliverable"
    | "acceptanceCriteria",
  value: string,
) {
  setMilestones((current) =>
    current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ),
  );
}
