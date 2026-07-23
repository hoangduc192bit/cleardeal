"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  BookUser,
  Copy,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Address } from "viem";

import {
  walletDirectoryCategories,
  type WalletDirectoryCategory,
  type WalletDirectoryEntry,
} from "@/hooks/use-wallet-directory";
import { shortExpenseWallet } from "@/lib/expense-data";

export function WalletDirectoryModal({
  open,
  entries,
  connectedAddress,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  entries: WalletDirectoryEntry[];
  connectedAddress?: Address;
  onClose: () => void;
  onSave: (input: {
    name: string;
    address: string;
    category: WalletDirectoryCategory;
  }) => void;
  onRemove: (address: Address) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] =
    useState<WalletDirectoryCategory>("Team");
  const [formError, setFormError] = useState<string>();
  const [copiedAddress, setCopiedAddress] = useState<Address>();

  useEffect(() => {
    if (!open) return;
    setName("");
    setAddress("");
    setCategory("Team");
    setFormError(undefined);
    setCopiedAddress(undefined);
  }, [open]);

  if (!open) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      onSave({ name, address, category });
      setName("");
      setAddress("");
      setCategory("Team");
      setFormError(undefined);
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "Wallet could not be saved.",
      );
    }
  }

  function edit(entry: WalletDirectoryEntry) {
    setName(entry.name);
    setAddress(entry.address);
    setCategory(entry.category);
    setFormError(undefined);
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Wallet directory"
    >
      <section className="max-h-[92dvh] w-full max-w-[860px] overflow-y-auto border border-[#ded5c6] bg-[#fffcf0] text-[#2b2118] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#ded5c6] p-6">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#a56b00]">
              Company contacts
            </p>
            <h2 className="mt-2 font-display text-3xl">Wallet directory</h2>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[#766b5d]">
              Save friendly names such as Marketing, Finance, or Saigon Print.
              ClearDeal still uses the exact wallet address when signing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#ded5c6] text-[#766b5d] hover:bg-[#f7f4e9]"
            aria-label="Close wallet directory"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          onSubmit={submit}
          className="grid gap-4 border-b border-[#ded5c6] p-6 md:grid-cols-[1fr_1.6fr_0.75fr_auto]"
        >
          <label className="grid gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
              Display name
            </span>
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Marketing"
              className="cd-input"
            />
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
              Wallet address
            </span>
            <input
              required
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="0x…"
              className="cd-input font-mono"
            />
            {connectedAddress ? (
              <button
                type="button"
                onClick={() => setAddress(connectedAddress)}
                className="w-fit text-[9px] font-semibold text-[#a56b00]"
              >
                Use connected wallet
              </button>
            ) : null}
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
              Type
            </span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as WalletDirectoryCategory)
              }
              className="cd-input"
            >
              {walletDirectoryCategories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffc23d] px-5 text-[12px] font-semibold hover:bg-[#f4ad14]"
          >
            <Plus className="h-4 w-4" />
            Save
          </button>
          {formError ? (
            <p
              className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700 md:col-span-4"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
        </form>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
                Saved wallets
              </p>
              <strong className="mt-1 block text-[13px]">
                {entries.length} contact{entries.length === 1 ? "" : "s"}
              </strong>
            </div>
            <p className="max-w-sm text-right text-[9px] leading-4 text-[#766b5d]">
              Names stay in this browser and are not written onchain.
            </p>
          </div>

          {entries.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => (
                <article
                  key={entry.address}
                  className="min-w-0 border border-[#ded5c6] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="truncate text-[13px]">
                          {entry.name}
                        </strong>
                        <span className="rounded border border-[#ded5c6] bg-[#f7f4e9] px-2 py-1 font-mono text-[8px] uppercase text-[#766b5d]">
                          {entry.category}
                        </span>
                      </div>
                      <code className="mt-2 block break-all font-mono text-[9px] leading-4 text-[#574c40]">
                        {entry.address}
                      </code>
                    </div>
                    <BookUser className="h-4 w-4 shrink-0 text-[#c98800]" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => edit(entry)}
                      className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#a56b00]"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(entry.address)
                          .then(() => setCopiedAddress(entry.address));
                      }}
                      className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#766b5d]"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedAddress === entry.address
                        ? "Copied"
                        : shortExpenseWallet(entry.address)}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(entry.address)}
                      className="ml-auto inline-flex items-center gap-1.5 text-[9px] font-semibold text-rose-600"
                      aria-label={`Remove ${entry.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center border border-dashed border-[#ded5c6] bg-[#f7f4e9] p-8 text-center">
              <div>
                <BookUser className="mx-auto h-7 w-7 text-[#c98800]" />
                <strong className="mt-4 block text-[13px]">
                  No saved wallets yet
                </strong>
                <p className="mt-2 text-[10px] leading-5 text-[#766b5d]">
                  Add Marketing, Finance, customers, or vendors above.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
