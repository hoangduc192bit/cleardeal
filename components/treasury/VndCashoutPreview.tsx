"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  QrCode,
  ShieldAlert,
  X,
} from "lucide-react";
import { formatUnits } from "viem";

const MOCK_RATE = 25_420;
const MOCK_FEE_RATE = 0.0075;
const MAX_PREVIEW_USDC = 10_000;

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function asUsdc(balance?: bigint) {
  return balance === undefined ? undefined : Number(formatUnits(balance, 6));
}

export function VndCashoutPreview({
  walletBalance,
}: {
  walletBalance?: bigint;
}) {
  const [open, setOpen] = useState(false);
  const availableUsdc = asUsdc(walletBalance);

  return (
    <>
      <section className="border border-[#ded5c6] bg-[#fffdf7] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">
              VND cash-out
            </p>
            <strong className="mt-2 block text-[13px]">
              USDC to a Vietnamese bank
            </strong>
          </div>
          <span className="rounded border border-violet-200 bg-violet-50 px-2 py-1 font-mono text-[8px] uppercase text-violet-700">
            Mock
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#ded5c6] bg-[#f7f4e9] p-3">
          <CircleDollarSign className="h-4 w-4 text-[#a56b00]" />
          <span className="text-[10px] text-[#766b5d]">
            1 USDC ≈ {MOCK_RATE.toLocaleString("vi-VN")} VND
          </span>
          <ArrowDown className="ml-auto h-3.5 w-3.5 text-[#8a7d6d]" />
          <Landmark className="h-4 w-4 text-emerald-700" />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d8aa4d] bg-[#fff1c7] px-4 text-[11px] font-semibold text-[#875900] hover:bg-[#ffe6a5]"
        >
          <Banknote className="h-4 w-4" />
          Preview VND payout
        </button>
        <p className="mt-3 text-[9px] leading-4 text-[#766b5d]">
          A licensed off-ramp is required for real conversion. VietQR only
          identifies the receiving bank account.
        </p>
      </section>
      <VndCashoutModal
        open={open}
        availableUsdc={availableUsdc}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function VndCashoutModal({
  open,
  availableUsdc,
  onClose,
}: {
  open: boolean;
  availableUsdc?: number;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("100");
  const [bank, setBank] = useState("Vietcombank");
  const [accountNumber, setAccountNumber] = useState("0123456789");
  const [accountName, setAccountName] = useState("NGUYEN VAN A");
  const [receiptId, setReceiptId] = useState<string>();
  const amountNumber = Number(amount);
  const quote = useMemo(() => {
    const gross =
      Number.isFinite(amountNumber) && amountNumber > 0
        ? amountNumber * MOCK_RATE
        : 0;
    const fee = gross * MOCK_FEE_RATE;
    return { gross, fee, net: gross - fee };
  }, [amountNumber]);
  const exceedsBalance =
    availableUsdc !== undefined && amountNumber > availableUsdc;
  const valid =
    amountNumber > 0 &&
    amountNumber <= MAX_PREVIEW_USDC &&
    !exceedsBalance &&
    /^\d{6,20}$/.test(accountNumber) &&
    accountName.trim().length >= 3;

  if (!open) return null;

  function close() {
    setReceiptId(undefined);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vnd-cashout-title"
    >
      <div className="max-h-[92dvh] w-full max-w-[760px] overflow-y-auto border border-[#ded5c6] bg-[#fffcf0] text-[#2b2118] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#ded5c6] p-5 sm:p-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#a56b00]">
                USDC → VND → VietQR destination
              </p>
              <span className="rounded border border-violet-200 bg-violet-50 px-2 py-1 font-mono text-[8px] uppercase text-violet-700">
                Simulation only
              </span>
            </div>
            <h2
              id="vnd-cashout-title"
              className="mt-3 font-display text-3xl sm:text-4xl"
            >
              Cash out without learning crypto.
            </h2>
            <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#766b5d]">
              Preview what an employee would receive after a licensed partner
              converts USDC and sends VND to their bank.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#ded5c6] bg-white"
            aria-label="Close VND cash-out preview"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {receiptId ? (
          <MockReceipt
            receiptId={receiptId}
            amount={amountNumber}
            netVnd={quote.net}
            bank={bank}
            accountNumber={accountNumber}
            onDone={close}
          />
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!valid) return;
              setReceiptId(
                `CD-VND-${Date.now().toString(36).toUpperCase()}`,
              );
            }}
            className="p-5 sm:p-7"
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_0.88fr]">
              <div className="space-y-5">
                <section className="border border-[#ded5c6] bg-white p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
                    01 · Amount
                  </p>
                  <label className="mt-3 grid gap-2">
                    <span className="text-[11px] font-semibold">
                      USDC to cash out
                    </span>
                    <div className="flex items-center rounded-lg border border-[#ded5c6] bg-[#fffdf7] px-3">
                      <input
                        required
                        type="number"
                        min="0.01"
                        max={MAX_PREVIEW_USDC}
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="min-h-12 min-w-0 flex-1 bg-transparent font-mono text-lg outline-none"
                      />
                      <span className="font-mono text-[11px] text-[#766b5d]">
                        USDC
                      </span>
                    </div>
                  </label>
                  <p
                    className={`mt-2 text-[9px] ${
                      exceedsBalance ? "text-rose-700" : "text-[#766b5d]"
                    }`}
                  >
                    {availableUsdc === undefined
                      ? "Preview uses a sample balance. Connect a wallet to validate the real Arc USDC balance."
                      : exceedsBalance
                        ? `Amount exceeds the connected balance of ${availableUsdc.toFixed(2)} USDC.`
                        : `Connected Arc balance: ${availableUsdc.toFixed(2)} USDC.`}
                  </p>
                </section>

                <section className="border border-[#ded5c6] bg-white p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
                    02 · VietQR bank destination
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[10px] font-semibold">Bank</span>
                      <select
                        value={bank}
                        onChange={(event) => setBank(event.target.value)}
                        className="cd-input min-h-11"
                      >
                        <option>Vietcombank</option>
                        <option>Techcombank</option>
                        <option>MB Bank</option>
                        <option>ACB</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[10px] font-semibold">
                        Account number
                      </span>
                      <input
                        required
                        inputMode="numeric"
                        pattern="\d{6,20}"
                        maxLength={20}
                        value={accountNumber}
                        onChange={(event) =>
                          setAccountNumber(
                            event.target.value.replace(/\D/g, ""),
                          )
                        }
                        className="cd-input min-h-11 font-mono"
                      />
                    </label>
                  </div>
                  <label className="mt-3 grid gap-2">
                    <span className="text-[10px] font-semibold">
                      Account holder
                    </span>
                    <input
                      required
                      maxLength={80}
                      value={accountName}
                      onChange={(event) =>
                        setAccountName(event.target.value.toUpperCase())
                      }
                      className="cd-input min-h-11 uppercase"
                    />
                  </label>
                  <p className="mt-3 text-[9px] leading-4 text-amber-800">
                    Demo safety: use sample details only. Nothing entered here
                    is uploaded, stored, or sent to a bank.
                  </p>
                </section>
              </div>

              <aside className="border border-[#ded5c6] bg-[#f7f4e9] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
                  Mock FX quote
                </p>
                <div className="mt-4 grid gap-3 text-[11px]">
                  <QuoteRow
                    label="Rate"
                    value={`1 USDC = ${MOCK_RATE.toLocaleString("vi-VN")} VND`}
                  />
                  <QuoteRow
                    label="Gross VND"
                    value={formatVnd(quote.gross)}
                  />
                  <QuoteRow
                    label="Partner fee"
                    value={`${formatVnd(quote.fee)} · 0.75%`}
                  />
                </div>
                <div className="mt-4 border-y border-[#d8d0c4] py-4">
                  <p className="font-mono text-[9px] uppercase text-[#766b5d]">
                    Employee receives
                  </p>
                  <strong className="mt-2 block font-mono text-xl text-emerald-700">
                    {formatVnd(quote.net)}
                  </strong>
                </div>
                <div className="mt-4 grid place-items-center rounded-lg border border-dashed border-[#cfc6b8] bg-white p-5 text-center">
                  <div className="relative grid h-24 w-24 place-items-center border-4 border-[#2b2118] bg-white">
                    <QrCode className="h-16 w-16 text-[#2b2118]" />
                    <span className="absolute inset-x-0 bottom-2 bg-violet-600 py-0.5 font-mono text-[8px] uppercase text-white">
                      Demo
                    </span>
                  </div>
                  <strong className="mt-3 text-[11px]">
                    Non-scannable VietQR preview
                  </strong>
                  <p className="mt-1 text-[9px] leading-4 text-[#766b5d]">
                    A production partner would validate the bank destination
                    and initiate the VND transfer.
                  </p>
                </div>
              </aside>
            </div>

            <div className="mt-5 flex gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-[10px] leading-5 text-violet-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              No swap, USDC transfer, VietQR request, or bank payout will be
              executed. App Kit cannot convert USDC directly into bank VND;
              this step requires a licensed off-ramp integration.
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                className="min-h-11 rounded-lg border border-[#ded5c6] bg-white px-5 text-[12px] text-[#766b5d]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!valid}
                className="min-h-11 rounded-lg bg-[#ffc23d] px-5 text-[12px] font-semibold hover:bg-[#f4ad14] disabled:opacity-40"
              >
                Create mock payout
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function MockReceipt({
  receiptId,
  amount,
  netVnd,
  bank,
  accountNumber,
  onDone,
}: {
  receiptId: string;
  amount: number;
  netVnd: number;
  bank: string;
  accountNumber: string;
  onDone: () => void;
}) {
  return (
    <div className="p-5 sm:p-8">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-violet-700">
          Mock completed · no funds moved
        </p>
        <h3 className="mt-2 font-display text-3xl">
          VND payout preview created.
        </h3>
        <p className="mt-2 text-[11px] leading-5 text-[#766b5d]">
          This receipt demonstrates the future partner handoff. It is not
          proof of an onchain swap or bank transfer.
        </p>
      </div>
      <dl className="mx-auto mt-6 grid max-w-xl gap-3 border border-[#ded5c6] bg-white p-5 text-[11px]">
        <QuoteRow label="Preview ID" value={receiptId} />
        <QuoteRow label="USDC input" value={`${amount.toFixed(2)} USDC`} />
        <QuoteRow label="VND estimate" value={formatVnd(netVnd)} />
        <QuoteRow
          label="Destination"
          value={`${bank} · ••••${accountNumber.slice(-4)}`}
        />
        <QuoteRow label="Arc transaction" value="Not created" />
        <QuoteRow label="Bank payout" value="Not submitted" />
      </dl>
      <button
        type="button"
        onClick={onDone}
        className="mx-auto mt-6 flex min-h-11 items-center justify-center rounded-lg bg-[#ffc23d] px-6 text-[12px] font-semibold"
      >
        Return to dashboard
      </button>
    </div>
  );
}

function QuoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#766b5d]">{label}</dt>
      <dd className="text-right font-mono text-[10px] font-semibold">
        {value}
      </dd>
    </div>
  );
}
