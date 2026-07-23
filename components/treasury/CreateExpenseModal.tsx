"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Building2, ChevronRight, ReceiptText, X } from "lucide-react";
import { isAddress, type Address } from "viem";

export interface CreateExpenseInput {
  title: string;
  purpose: string;
  department: string;
  requesterName: string;
  vendorName: string;
  vendor: Address;
  manager: Address;
  finance: Address;
  approvedBudget: string;
  acceptance: string;
  memoCode: string;
}

export function CreateExpenseModal({
  open,
  busy,
  ownerAddress,
  onClose,
  onCreate,
}: {
  open: boolean;
  busy: boolean;
  ownerAddress?: Address;
  onClose: () => void;
  onCreate: (input: CreateExpenseInput) => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("Event printing & POSM");
  const [purpose, setPurpose] = useState(
    "Printing and point-of-sale materials for the product launch event.",
  );
  const [department, setDepartment] = useState("Marketing");
  const [requesterName, setRequesterName] = useState("");
  const [vendorName, setVendorName] = useState("Saigon Print Co.");
  const [vendor, setVendor] = useState("");
  const [manager, setManager] = useState("");
  const [finance, setFinance] = useState("");
  const [approvedBudget, setApprovedBudget] = useState("5000");
  const [acceptance, setAcceptance] = useState(
    "Invoice matches the approved scope and delivery photos show all materials received.",
  );
  const [memoCode, setMemoCode] = useState("CD-MKT-001");
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFormError(undefined);
  }, [open]);

  if (!open) return null;

  const addressError =
    !ownerAddress
      ? "Connect the employee wallet creating this request."
      : !isAddress(manager) || !isAddress(finance) || !isAddress(vendor)
        ? "Add valid manager, finance, and vendor wallet addresses."
        : manager.toLowerCase() === ownerAddress.toLowerCase()
          ? "The manager wallet must be different from the requester."
          : [ownerAddress, manager, finance]
                .map((address) => address.toLowerCase())
                .includes(vendor.toLowerCase())
            ? "The vendor wallet must be different from company role wallets."
            : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    if (addressError) {
      setFormError(addressError);
      return;
    }
    if (!(Number(approvedBudget) > 0)) {
      setFormError("Approved budget must be greater than zero.");
      return;
    }
    setFormError(undefined);
    await onCreate({
      title: title.trim(),
      purpose: purpose.trim(),
      department: department.trim(),
      requesterName: requesterName.trim(),
      vendorName: vendorName.trim(),
      vendor: vendor as Address,
      manager: manager as Address,
      finance: finance as Address,
      approvedBudget,
      acceptance: acceptance.trim(),
      memoCode: memoCode.trim(),
    });
  }

  return (
    <div
      className="t-modal-overlay is-open fixed inset-0 z-[95] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create expense request"
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="t-modal is-open max-h-[92dvh] w-full max-w-[920px] overflow-y-auto border border-[#ded5c6] bg-[#fffcf0] text-[#2b2118] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#ded5c6] p-6">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#a56b00]">
              New expense request
            </p>
            <h2 className="mt-2 font-display text-3xl">
              {step === 1
                ? "What does the team need?"
                : "Who approves and gets paid?"}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#766b5d]">
              The company keeps control of its USDC. ClearDeal only allows the
              final vendor payment after the request and evidence are approved.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#ded5c6] text-[#766b5d] hover:bg-[#f7f4e9]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 border-b border-[#ded5c6] bg-[#f7f4e9] text-[11px]">
          <div
            className={`flex items-center gap-2 px-6 py-4 ${
              step === 1 ? "text-[#a56b00]" : "text-emerald-700"
            }`}
          >
            <ReceiptText className="h-4 w-4" />
            01 · Request details
          </div>
          <div
            className={`flex items-center gap-2 border-l border-[#ded5c6] px-6 py-4 ${
              step === 2 ? "bg-[#fff1c7] text-[#a56b00]" : "text-[#766b5d]"
            }`}
          >
            <Building2 className="h-4 w-4" />
            02 · Roles & budget
          </div>
        </div>

        {step === 1 ? (
          <section className="grid gap-5 p-6 md:grid-cols-2">
            <Field label="Expense title" wide>
              <input
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="cd-input"
              />
            </Field>
            <Field label="Department">
              <input
                required
                maxLength={80}
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="cd-input"
              />
            </Field>
            <Field label="Requested by">
              <input
                required
                maxLength={80}
                value={requesterName}
                onChange={(event) => setRequesterName(event.target.value)}
                placeholder="Employee name"
                className="cd-input"
              />
            </Field>
            <Field label="Business purpose" wide>
              <textarea
                required
                maxLength={500}
                rows={3}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                className="cd-input resize-none"
              />
            </Field>
            <Field label="What counts as completed?" wide>
              <textarea
                required
                maxLength={500}
                rows={3}
                value={acceptance}
                onChange={(event) => setAcceptance(event.target.value)}
                className="cd-input resize-none"
              />
            </Field>
          </section>
        ) : (
          <section className="grid gap-5 p-6 md:grid-cols-2">
            <Field label="Vendor name">
              <input
                required
                maxLength={120}
                value={vendorName}
                onChange={(event) => setVendorName(event.target.value)}
                className="cd-input"
              />
            </Field>
            <Field label="Approved budget (USDC)">
              <input
                required
                type="number"
                min="0.000001"
                step="0.000001"
                value={approvedBudget}
                onChange={(event) => setApprovedBudget(event.target.value)}
                className="cd-input font-mono"
              />
            </Field>
            <Field label="Manager wallet">
              <input
                required
                value={manager}
                onChange={(event) => setManager(event.target.value)}
                placeholder="0x…"
                className="cd-input font-mono"
              />
            </Field>
            <Field label="Finance wallet">
              <input
                required
                value={finance}
                onChange={(event) => setFinance(event.target.value)}
                placeholder="0x…"
                className="cd-input font-mono"
              />
            </Field>
            <Field label="Vendor payment wallet" wide>
              <input
                required
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                placeholder="0x…"
                className="cd-input font-mono"
              />
            </Field>
            <Field label="Arc memo code" wide>
              <input
                required
                maxLength={64}
                pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}"
                value={memoCode}
                onChange={(event) =>
                  setMemoCode(event.target.value.toUpperCase())
                }
                className="cd-input font-mono"
              />
              <span className="text-[10px] leading-4 text-[#766b5d]">
                Public reconciliation code only. Do not include employee names,
                salary, or confidential invoice details.
              </span>
            </Field>
          </section>
        )}

        <div className="mx-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-[11px] leading-5 text-amber-800">
          Arc Testnet only. Request amounts, wallet addresses, hashes, approvals,
          and payment results are public. Upload sample documents without
          personal or confidential information.
        </div>
        {formError ? (
          <p
            className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[12px] text-rose-700"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <footer className="mt-6 flex flex-col-reverse gap-3 border-t border-[#ded5c6] bg-[#f7f4e9] p-6 sm:flex-row sm:justify-between">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-11 rounded-xl border border-[#ded5c6] bg-white px-5 text-[13px] font-semibold text-[#766b5d]"
            >
              Cancel
            </button>
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={busy}
                className="min-h-11 rounded-xl border border-[#ded5c6] bg-white px-5 text-[13px] font-semibold text-[#766b5d]"
              >
                Back
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={busy || (step === 2 && Boolean(addressError))}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffc23d] px-6 text-[13px] font-semibold text-[#2b2118] shadow-sm hover:bg-[#f4ad14] disabled:opacity-40"
          >
            {busy
              ? "Waiting for wallet…"
              : step === 1
                ? "Continue"
                : "Sign & create request"}
            {!busy && step === 1 ? (
              <ChevronRight className="h-4 w-4" />
            ) : null}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-2 ${wide ? "md:col-span-2" : ""}`}>
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#766b5d]">
        {label}
      </span>
      {children}
    </label>
  );
}
