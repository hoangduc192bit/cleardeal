"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Address } from "viem";

import {
  createRecoveryPhrase,
  friendlyRecoveryError,
  recoverPasskeyWallet,
  registerPasskeyRecovery,
} from "@/lib/circle-passkey-recovery";
import {
  isValidRecoveryPhrase,
  normalizeRecoveryPhrase,
  RECOVERY_CONFIRMATION_INDICES,
  recoveryConfirmationMatches,
} from "@/lib/passkey-recovery-phrase";

type RecoveryMode = "backup" | "recover";

type RecoverySuccess = {
  walletAddress: Address;
  recoveryAddress: Address;
  transactionHash?: `0x${string}`;
};

type PasskeyRecoveryModalProps = {
  connectedAddress?: Address;
  mode: RecoveryMode;
  onClose: () => void;
};

function shortAddress(address: Address) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function PasskeyRecoveryModal({
  connectedAddress,
  mode,
  onClose,
}: PasskeyRecoveryModalProps) {
  const [phrase, setPhrase] = useState("");
  const [backupStep, setBackupStep] = useState<
    "intro" | "display" | "confirm"
  >("intro");
  const [confirmations, setConfirmations] = useState(["", "", ""]);
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<RecoverySuccess>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const words = useMemo(
    () => (phrase ? normalizeRecoveryPhrase(phrase).split(" ") : []),
    [phrase],
  );
  const confirmationMatches = recoveryConfirmationMatches(
    phrase,
    confirmations,
  );
  const validRecoveryPhrase = isValidRecoveryPhrase(phrase);

  function closeSafely() {
    if (running) return;
    setPhrase("");
    setConfirmations(["", "", ""]);
    onClose();
  }

  function generatePhrase() {
    setError("");
    setCopied(false);
    setPhrase(createRecoveryPhrase());
    setBackupStep("display");
  }

  async function copyPhrase() {
    if (!phrase) return;
    await navigator.clipboard.writeText(phrase);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  async function registerBackup() {
    if (!confirmationMatches || !confirmedRisk) return;
    setRunning(true);
    setError("");
    try {
      const result = await registerPasskeyRecovery(phrase);
      setSuccess(result);
      setPhrase("");
      setConfirmations(["", "", ""]);
    } catch (cause) {
      setError(friendlyRecoveryError(cause));
    } finally {
      setRunning(false);
    }
  }

  async function recoverWallet() {
    if (!validRecoveryPhrase || !confirmedRisk) return;
    setRunning(true);
    setError("");
    try {
      const result = await recoverPasskeyWallet(phrase);
      setSuccess(result);
      setPhrase("");
    } catch (cause) {
      setError(friendlyRecoveryError(cause));
    } finally {
      setRunning(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      aria-label={
        mode === "backup" ? "Back up passkey wallet" : "Recover passkey wallet"
      }
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
    >
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,.35)]">
        <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-br from-blue-700 to-indigo-800 p-5 text-white sm:p-7">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10">
              {mode === "backup" ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <RotateCcw className="h-5 w-5" />
              )}
            </span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-blue-200">
                Circle passkey recovery · Arc Testnet
              </p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                {mode === "backup"
                  ? "Back up this wallet"
                  : "Recover your ClearDeal wallet"}
              </h2>
              <p className="mt-2 max-w-xl text-[12px] leading-5 text-blue-100">
                {mode === "backup"
                  ? "Create a separate 12-word recovery key for this smart wallet. Your passkey itself is never exported."
                  : "Use the 12-word recovery key you registered earlier to replace a lost passkey."}
              </p>
            </div>
          </div>
          <button
            aria-label="Close recovery"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-50"
            disabled={running}
            onClick={closeSafely}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {success ? (
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {mode === "backup"
                  ? "Recovery key registered"
                  : "New passkey registered"}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-slate-600">
                {mode === "backup"
                  ? "The recovery address is now connected to this wallet on Arc Testnet. ClearDeal has cleared the phrase from this screen."
                  : "The recovered wallet is ready. Close this window and choose “Use existing passkey” to sign in with the new passkey."}
              </p>
              <dl className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-[11px] text-slate-500">ClearDeal wallet</dt>
                  <dd className="font-mono text-[11px] font-semibold text-slate-800">
                    {shortAddress(success.walletAddress)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-[11px] text-slate-500">
                    Recovery address
                  </dt>
                  <dd className="font-mono text-[11px] font-semibold text-slate-800">
                    {shortAddress(success.recoveryAddress)}
                  </dd>
                </div>
              </dl>
              {connectedAddress &&
              success.walletAddress.toLowerCase() !==
                connectedAddress.toLowerCase() ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                  The passkey prompt selected a different ClearDeal wallet than
                  the account previously shown. The recovery key was registered
                  for {shortAddress(success.walletAddress)}.
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {success.transactionHash ? (
                  <a
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-[12px] font-semibold text-blue-800 hover:bg-blue-100"
                    href={`https://testnet.arcscan.app/tx/${success.transactionHash}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View on ArcScan
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                <button
                  className="min-h-12 flex-1 rounded-xl bg-blue-700 px-4 text-[12px] font-semibold text-white hover:bg-blue-800"
                  onClick={closeSafely}
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          ) : mode === "backup" ? (
            <>
              {backupStep === "intro" ? (
                <div>
                  {connectedAddress ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-700">
                      Wallet: {connectedAddress}
                    </p>
                  ) : null}
                  <ol className="mt-5 space-y-4 text-[13px] text-slate-700">
                    <li className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        1
                      </span>
                      Generate a unique 12-word recovery key on this device.
                    </li>
                    <li className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        2
                      </span>
                      Save it offline or in a trusted password manager.
                    </li>
                    <li className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        3
                      </span>
                      Confirm the words and authorize registration with your
                      current passkey.
                    </li>
                  </ol>
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
                    <strong>Anyone with these 12 words can take over this wallet.</strong>{" "}
                    ClearDeal cannot recover them for you and will never ask for
                    them in support messages.
                  </div>
                  <button
                    className="mt-6 min-h-12 w-full rounded-xl bg-blue-700 px-4 text-[13px] font-semibold text-white hover:bg-blue-800"
                    onClick={generatePhrase}
                    type="button"
                  >
                    Generate recovery phrase
                  </button>
                </div>
              ) : null}

              {backupStep === "display" ? (
                <div>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                    {words.map((word, index) => (
                      <div
                        className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 shadow-sm"
                        key={`${word}-${index}`}
                      >
                        <span className="font-mono text-[9px] text-slate-400">
                          {index + 1}
                        </span>
                        <strong className="text-[12px] text-slate-800">
                          {word}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={copyPhrase}
                    type="button"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied. Store it safely now" : "Copy 12 words"}
                  </button>
                  <p className="mt-4 text-[11px] leading-5 text-slate-500">
                    Do not take a screenshot, email the phrase, or paste it into
                    a support chat.
                  </p>
                  <button
                    className="mt-6 min-h-12 w-full rounded-xl bg-blue-700 px-4 text-[13px] font-semibold text-white hover:bg-blue-800"
                    onClick={() => setBackupStep("confirm")}
                    type="button"
                  >
                    I saved the phrase
                  </button>
                </div>
              ) : null}

              {backupStep === "confirm" ? (
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm your backup
                  </h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-600">
                    Enter these words to prove your copy is complete.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {RECOVERY_CONFIRMATION_INDICES.map((wordIndex, index) => (
                      <label
                        className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"
                        key={wordIndex}
                      >
                        Word {wordIndex + 1}
                        <input
                          autoCapitalize="none"
                          autoComplete="off"
                          className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-[13px] font-normal normal-case tracking-normal outline-none focus:border-blue-500"
                          onChange={(event) =>
                            setConfirmations((current) =>
                              current.map((value, itemIndex) =>
                                itemIndex === index
                                  ? event.target.value
                                  : value,
                              ),
                            )
                          }
                          spellCheck={false}
                          value={confirmations[index]}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-700">
                    <input
                      checked={confirmedRisk}
                      className="mt-1"
                      onChange={(event) =>
                        setConfirmedRisk(event.target.checked)
                      }
                      type="checkbox"
                    />
                    I understand that anyone with these words can recover this
                    wallet, and losing both the passkey and these words can
                    permanently lock me out.
                  </label>
                  <button
                    className="mt-6 min-h-12 w-full rounded-xl bg-blue-700 px-4 text-[13px] font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={
                      !confirmationMatches || !confirmedRisk || running
                    }
                    onClick={registerBackup}
                    type="button"
                  >
                    {running
                      ? "Confirming with passkey…"
                      : "Register recovery key on Arc"}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Recovery replaces the lost passkey with a new passkey. It
                    works only if these words were registered from the original
                    wallet first.
                  </p>
                </div>
              </div>
              <label className="mt-5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Your 12-word recovery phrase
                <textarea
                  autoCapitalize="none"
                  autoComplete="off"
                  className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-200 p-4 font-mono text-[13px] font-normal normal-case leading-7 tracking-normal outline-none focus:border-blue-500"
                  onChange={(event) => setPhrase(event.target.value)}
                  placeholder="word 1  word 2  word 3 ..."
                  spellCheck={false}
                  value={phrase}
                />
              </label>
              {phrase && !validRecoveryPhrase ? (
                <p className="mt-2 text-[11px] text-rose-600">
                  Check that all 12 words are correct and in the original order.
                </p>
              ) : null}
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-700">
                <input
                  checked={confirmedRisk}
                  className="mt-1"
                  onChange={(event) =>
                    setConfirmedRisk(event.target.checked)
                  }
                  type="checkbox"
                />
                I understand this creates a new passkey and removes access from
                the old passkey.
              </label>
              <button
                className="mt-6 min-h-12 w-full rounded-xl bg-blue-700 px-4 text-[13px] font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!validRecoveryPhrase || !confirmedRisk || running}
                onClick={recoverWallet}
                type="button"
              >
                {running ? "Registering new passkey…" : "Create a new passkey"}
              </button>
            </div>
          )}

          {error ? (
            <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[11px] leading-5 text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center gap-2 border-t border-slate-200 pt-4 text-[10px] leading-5 text-slate-500">
            <KeyRound className="h-4 w-4 shrink-0" />
            Recovery phrases are processed on this device and are never sent to
            the ClearDeal server.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
