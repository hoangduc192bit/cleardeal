"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  LoaderCircle,
  Paperclip,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import {
  encodeFunctionData,
  erc20Abi,
  keccak256,
  parseEventLogs,
  parseUnits,
  stringToHex,
  toBytes,
  type Address,
  type Hash,
} from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import {
  CreateExpenseModal,
  type CreateExpenseInput,
} from "@/components/treasury/CreateExpenseModal";
import { VndCashoutPreview } from "@/components/treasury/VndCashoutPreview";
import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";
import { WalletButton } from "@/components/WalletButton";
import { arcTestnet } from "@/config/chain";
import { useExpenseRequests } from "@/hooks/use-expense-requests";
import {
  formatExpenseUsdc,
  shortExpenseWallet,
  type ExpenseRecord,
} from "@/lib/expense-data";
import {
  buildStoreExpenseEvidenceMessage,
  EXPENSE_EVIDENCE_ALLOWED_ATTACHMENT_TYPES,
  EXPENSE_EVIDENCE_MAX_ATTACHMENTS,
  EXPENSE_EVIDENCE_MAX_ATTACHMENT_BYTES,
  EXPENSE_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES,
  hashExpenseEvidence,
  type ExpenseEvidence,
  type ExpenseEvidenceAttachment,
  type ExpenseEvidenceAttachmentPayload,
  type StoreExpenseEvidenceAuthorization,
} from "@/lib/expense-evidence";
import {
  buildStoreExpenseMetadataMessage,
  hashExpenseMetadata,
  type ExpenseMetadata,
  type StoreExpenseMetadataAuthorization,
} from "@/lib/expense-metadata";
import {
  arcMemoAbi,
  arcMemoAddress,
  clearDealTreasuryAbi,
  clearDealTreasuryAddress,
  clearDealTreasuryConfigured,
} from "@/lib/treasury-contract";
import { clearDealUsdcAddress } from "@/lib/cleardeal-contract";

const EXPLORER = "https://testnet.arcscan.app";

interface TransactionState {
  status: "pending" | "confirmed" | "error";
  message: string;
  hash?: Hash;
}

function sameAddress(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function parseExpenseId(value: string | null) {
  if (!value || !/^(0|[1-9]\d*)$/.test(value)) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp * 1_000);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 16_384;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return window.btoa(binary);
}

async function prepareAttachments(files: readonly File[]) {
  if (files.length > EXPENSE_EVIDENCE_MAX_ATTACHMENTS) {
    throw new Error(
      `Attach no more than ${EXPENSE_EVIDENCE_MAX_ATTACHMENTS} files.`,
    );
  }
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > EXPENSE_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES) {
    throw new Error("Attachments must total less than 2 MB.");
  }
  const descriptors: ExpenseEvidenceAttachment[] = [];
  const payloads: ExpenseEvidenceAttachmentPayload[] = [];
  for (const file of files) {
    if (
      !EXPENSE_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.includes(
        file.type as ExpenseEvidenceAttachment["contentType"],
      )
    ) {
      throw new Error(`${file.name} is not a supported file.`);
    }
    if (
      file.size < 1 ||
      file.size > EXPENSE_EVIDENCE_MAX_ATTACHMENT_BYTES
    ) {
      throw new Error(`${file.name} must be smaller than 1 MB.`);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", bytes),
    );
    const sha256 = `0x${Array.from(digest, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")}` as Hash;
    descriptors.push({
      name: file.name,
      contentType:
        file.type as ExpenseEvidenceAttachment["contentType"],
      size: file.size,
      sha256,
    });
    payloads.push({ sha256, dataBase64: bytesToBase64(bytes) });
  }
  return { descriptors, payloads };
}

export function TreasuryDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    address,
    isConnected,
    connector,
  } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const requestedExpenseId =
    parseExpenseId(searchParams.get("expense")) ??
    (!isConnected ? 0n : undefined);
  const { expenses, loading, error, refresh } = useExpenseRequests(
    address,
    requestedExpenseId,
  );
  const [selectedId, setSelectedId] = useState<bigint>();
  const [createOpen, setCreateOpen] = useState(false);
  const [evidenceTarget, setEvidenceTarget] = useState<ExpenseRecord>();
  const [busy, setBusy] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>();
  const [walletBalance, setWalletBalance] = useState<bigint>();

  useEffect(() => {
    if (!expenses.length) {
      setSelectedId(undefined);
      return;
    }
    if (
      requestedExpenseId !== undefined &&
      expenses.some((expense) => expense.id === requestedExpenseId)
    ) {
      setSelectedId(requestedExpenseId);
      return;
    }
    if (
      selectedId === undefined ||
      !expenses.some((expense) => expense.id === selectedId)
    ) {
      setSelectedId(expenses[0].id);
    }
  }, [expenses, requestedExpenseId, selectedId]);

  useEffect(() => {
    if (!address || !publicClient || chainId !== arcTestnet.id) {
      setWalletBalance(undefined);
      return;
    }
    let cancelled = false;
    void publicClient
      .readContract({
        address: clearDealUsdcAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      .then((balance) => {
        if (!cancelled) setWalletBalance(balance);
      })
      .catch(() => {
        if (!cancelled) setWalletBalance(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [address, chainId, publicClient, transaction?.hash]);

  const selected =
    expenses.find((expense) => expense.id === selectedId) ?? expenses[0];
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;
  const disabledReason = !isConnected
    ? "Connect a company role wallet first."
    : wrongNetwork
      ? "Switch to Arc Testnet first."
      : !clearDealTreasuryConfigured
        ? "ClearDeal Treasury is not configured."
        : undefined;

  async function requireReady() {
    if (!address || !publicClient || !clearDealTreasuryAddress) {
      throw new Error(
        "Connect a wallet and configure ClearDeal Treasury first.",
      );
    }
    if (chainId !== arcTestnet.id) {
      await switchChainAsync({ chainId: arcTestnet.id });
    }
    return {
      address,
      publicClient,
      contract: clearDealTreasuryAddress,
    };
  }

  async function waitFor(hash: Hash, message: string) {
    if (!publicClient) throw new Error("Arc connection is unavailable.");
    setTransaction({ status: "pending", message, hash });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error("Transaction reverted on Arc Testnet.");
    }
    setTransaction({
      status: "confirmed",
      message: `${message} confirmed.`,
      hash,
    });
    await refresh();
    return receipt;
  }

  async function runAction(
    action: () => Promise<Hash>,
    pendingMessage: string,
  ) {
    setBusy(true);
    setTransaction({
      status: "pending",
      message: `Confirm ${pendingMessage.toLowerCase()} in your wallet.`,
    });
    try {
      await waitFor(await action(), pendingMessage);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : `${pendingMessage} failed.`;
      setTransaction({ status: "error", message });
    } finally {
      setBusy(false);
    }
  }

  async function createExpense(input: CreateExpenseInput) {
    const ready = await requireReady();
    setBusy(true);
    try {
      const metadata: ExpenseMetadata = {
        version: 1,
        title: input.title,
        purpose: input.purpose,
        department: input.department,
        requesterName: input.requesterName,
        vendorName: input.vendorName,
        acceptance: input.acceptance,
        memoCode: input.memoCode,
      };
      const metadataHash = hashExpenseMetadata(metadata);
      const authorization: StoreExpenseMetadataAuthorization = {
        ownerAddress: ready.address,
        metadataHash,
        requestId: crypto.randomUUID(),
        issuedAt: Date.now(),
      };
      setTransaction({
        status: "pending",
        message:
          "Sign the request details. This signature does not transfer USDC.",
      });
      const signature = await signMessageAsync({
        message: buildStoreExpenseMetadataMessage(authorization),
      });
      setTransaction({
        status: "pending",
        message: "Confirm expense request creation on Arc Testnet.",
      });
      const hash = await writeContractAsync({
        address: ready.contract,
        abi: clearDealTreasuryAbi,
        chainId: arcTestnet.id,
        functionName: "createExpense",
        args: [
          input.manager,
          input.finance,
          input.vendor,
          parseUnits(input.approvedBudget, 6),
          metadataHash,
          keccak256(toBytes(input.memoCode)),
        ],
      });
      const receipt = await waitFor(hash, "Expense request creation");
      const response = await fetch("/api/expenses/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...authorization,
          metadata,
          signature,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setTransaction({
          status: "error",
          message: `Request was created on Arc, but its labels could not be stored: ${
            body.error ?? "metadata_store_failed"
          }`,
        });
      }
      const created = parseEventLogs({
        abi: clearDealTreasuryAbi,
        logs: receipt.logs,
        eventName: "ExpenseRequested",
        strict: false,
      })[0];
      const expenseId = created?.args.expenseId;
      if (typeof expenseId === "bigint") {
        setSelectedId(expenseId);
        router.replace(`/dashboard?expense=${expenseId.toString()}`, {
          scroll: false,
        });
      }
      setCreateOpen(false);
    } catch (cause) {
      setTransaction({
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Expense request creation failed.",
      });
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function submitEvidence(
    expense: ExpenseRecord,
    payoutAmount: string,
    reference: string,
    files: readonly File[],
  ) {
    const ready = await requireReady();
    setBusy(true);
    try {
      const amount = parseUnits(payoutAmount, 6);
      if (amount > expense.approvedBudget) {
        throw new Error(
          "Invoice total cannot exceed the approved budget.",
        );
      }
      const { descriptors, payloads } =
        await prepareAttachments(files);
      const evidence: ExpenseEvidence = {
        version: 1,
        expenseId: expense.id.toString(),
        reference: reference.trim(),
        submittedAt: new Date().toISOString(),
        ...(descriptors.length ? { attachments: descriptors } : {}),
      };
      const evidenceHash = hashExpenseEvidence(evidence);
      const authorization: StoreExpenseEvidenceAuthorization = {
        requesterAddress: ready.address,
        evidenceHash,
        requestId: crypto.randomUUID(),
        issuedAt: Date.now(),
      };
      setTransaction({
        status: "pending",
        message:
          "Sign the invoice evidence. This signature does not transfer USDC.",
      });
      const signature = await signMessageAsync({
        message: buildStoreExpenseEvidenceMessage(authorization),
      });
      const response = await fetch("/api/expenses/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...authorization,
          evidence,
          signature,
          attachmentPayloads: payloads,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          body.error ?? "Could not store signed invoice evidence.",
        );
      }
      await waitFor(
        await writeContractAsync({
          address: ready.contract,
          abi: clearDealTreasuryAbi,
          chainId: arcTestnet.id,
          functionName: "submitEvidence",
          args: [expense.id, evidenceHash, amount],
        }),
        "Invoice and delivery evidence",
      );
      setEvidenceTarget(undefined);
    } catch (cause) {
      setTransaction({
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Evidence submission failed.",
      });
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function ensureAllowance(expense: ExpenseRecord) {
    const ready = await requireReady();
    const allowance = await ready.publicClient.readContract({
      address: clearDealUsdcAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [ready.address, ready.contract],
    });
    if (allowance >= expense.payoutAmount) return;
    setTransaction({
      status: "pending",
      message: `Approve ${formatExpenseUsdc(
        expense.payoutAmount,
      )} for this vendor payment.`,
    });
    const hash = await writeContractAsync({
      address: clearDealUsdcAddress,
      abi: erc20Abi,
      chainId: arcTestnet.id,
      functionName: "approve",
      args: [ready.contract, expense.payoutAmount],
    });
    if (!publicClient) throw new Error("Arc connection is unavailable.");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error("USDC approval reverted.");
    }
  }

  async function payWithMemo(expense: ExpenseRecord) {
    const ready = await requireReady();
    setBusy(true);
    try {
      if (connector?.id.includes("circle-passkey")) {
        throw new Error(
          "Arc Transaction Memo currently requires a standard treasury wallet. Connect MetaMask, Rabby, or another EOA finance wallet.",
        );
      }
      const code = await ready.publicClient.getCode({
        address: ready.address,
      });
      if (code && code !== "0x") {
        throw new Error(
          "Arc Transaction Memo currently requires an EOA treasury wallet, not a smart account.",
        );
      }
      await ensureAllowance(expense);
      const payData = encodeFunctionData({
        abi: clearDealTreasuryAbi,
        functionName: "payExpense",
        args: [expense.id],
      });
      const memoCode =
        expense.metadata?.memoCode ?? `CD-EXP-${expense.id.toString()}`;
      setTransaction({
        status: "pending",
        message: `Confirm vendor payment with Arc memo ${memoCode}.`,
      });
      await waitFor(
        await writeContractAsync({
          address: arcMemoAddress,
          abi: arcMemoAbi,
          chainId: arcTestnet.id,
          functionName: "memo",
          args: [
            ready.contract,
            payData,
            expense.memoId,
            stringToHex(`expense=${memoCode}`),
          ],
        }),
        "USDC vendor payment with Arc memo",
      );
    } catch (cause) {
      setTransaction({
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Vendor payment failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  const selectExpense = (expenseId: bigint) => {
    setSelectedId(expenseId);
    router.replace(`/dashboard?expense=${expenseId.toString()}`, {
      scroll: false,
    });
  };

  const committed = useMemo(
    () =>
      expenses
        .filter(
          (expense) =>
            expense.status !== "Rejected" &&
            expense.status !== "Cancelled",
        )
        .reduce((sum, expense) => sum + expense.approvedBudget, 0n),
    [expenses],
  );

  return (
    <main className="min-h-[100dvh] bg-[#fffcf0] text-[#2b2118]">
      <header className="sticky top-0 z-50 border-b border-[#e3ddd2] bg-[#fffcf0]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <ClearDealBrand />
            <nav
              className="hidden items-center gap-6 text-[12px] text-[#766b5d] lg:flex"
              aria-label="Product navigation"
            >
              <span className="font-semibold text-[#a56b00]">
                Company spend
              </span>
              <Link href="/clearing" className="hover:text-[#2b2118]">
                Clearing proof
              </Link>
              <Link href="/docs" className="hover:text-[#2b2118]">
                Docs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.15em] text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Arc Testnet · Treasury live
            </span>
            <WalletButton />
          </div>
        </div>
      </header>

      <section className="border-b border-[#e3ddd2]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-4xl font-display text-4xl tracking-[-0.035em] sm:text-6xl">
              Control every company payment.
            </h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[#766b5d]">
              Teams request. Managers approve. Finance pays vendors in USDC
              only after the work is verified.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={Boolean(disabledReason)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#ffc23d] px-5 text-[13px] font-semibold shadow-sm hover:bg-[#f4ad14] disabled:cursor-not-allowed disabled:opacity-45"
            title={disabledReason}
          >
            <Plus className="h-4 w-4" />
            New expense request
          </button>
        </div>
      </section>

      {wrongNetwork ? (
        <Notice tone="warning">
          Switch your wallet to Arc Testnet before approving or paying.
          <button
            type="button"
            onClick={() => void switchChainAsync({ chainId: arcTestnet.id })}
            className="ml-3 font-semibold underline"
          >
            Switch network
          </button>
        </Notice>
      ) : null}
      {!clearDealTreasuryConfigured ? (
        <Notice tone="error">
          ClearDeal Treasury is not configured in this deployment.
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {transaction ? (
        <Notice
          tone={
            transaction.status === "error"
              ? "error"
              : transaction.status === "confirmed"
                ? "success"
                : "info"
          }
        >
          <span>{transaction.message}</span>
          {transaction.hash ? (
            <a
              href={`${EXPLORER}/tx/${transaction.hash}`}
              target="_blank"
              rel="noreferrer"
              className="ml-3 inline-flex items-center gap-1 font-semibold underline"
            >
              ArcScan <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </Notice>
      ) : null}

      <section className="mx-auto grid max-w-[1500px] gap-3 px-5 py-6 sm:px-8 xl:grid-cols-[330px_minmax(0,1fr)_320px]">
        <aside className="min-h-[260px] border border-[#ded5c6] bg-[#fffdf7] xl:min-h-[620px]">
          <div className="flex items-center justify-between border-b border-[#ded5c6] px-5 py-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">
                Expense requests
              </p>
              <strong className="mt-1 block text-[13px]">
                {expenses.length} assigned to this wallet
              </strong>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="grid h-9 w-9 place-items-center rounded-lg border border-[#ded5c6] text-[#766b5d]"
              aria-label="Refresh requests"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {loading ? (
            <Empty
              icon={LoaderCircle}
              title="Loading Arc requests"
              text="Reading company roles and payment states."
              spin
            />
          ) : expenses.length ? (
            <div>
              {expenses.map((expense) => (
                <button
                  key={expense.id.toString()}
                  type="button"
                  onClick={() => selectExpense(expense.id)}
                  className={`flex w-full items-start gap-3 border-b border-[#e8e1d6] px-4 py-4 text-left transition-colors ${
                    selected?.id === expense.id
                      ? "bg-[#fff1c7] shadow-[inset_3px_0_0_#c98800]"
                      : "hover:bg-[#f7f4e9]"
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#ded5c6] bg-white text-[#a56b00]">
                    <ReceiptText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">
                      {expense.metadata?.title ??
                        `Expense request #${expense.id.toString()}`}
                    </span>
                    <span className="mt-1 block text-[10px] text-[#766b5d]">
                      {expense.metadata?.department ?? "Company request"} ·{" "}
                      {formatDate(expense.createdAt)}
                    </span>
                    <Status value={expense.status} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              icon={ReceiptText}
              title={isConnected ? "No expense requests yet" : "Connect a wallet"}
              text={
                isConnected
                  ? "Create the first request for your company."
                  : "Use a passkey as an employee or manager, or connect the company treasury wallet."
              }
            />
          )}
        </aside>

        <section className="min-w-0 border border-[#ded5c6] bg-[#fffdf7]">
          {selected ? (
            <ExpenseDetail
              expense={selected}
              account={address}
              busy={busy}
              onManagerDecision={(approved) =>
                void runAction(
                  async () => {
                    const ready = await requireReady();
                    return await writeContractAsync({
                      address: ready.contract,
                      abi: clearDealTreasuryAbi,
                      chainId: arcTestnet.id,
                      functionName: "managerDecision",
                      args: [selected.id, approved],
                    });
                  },
                  approved ? "Manager approval" : "Request rejection",
                )
              }
              onCancel={() =>
                void runAction(
                  async () => {
                    const ready = await requireReady();
                    return await writeContractAsync({
                      address: ready.contract,
                      abi: clearDealTreasuryAbi,
                      chainId: arcTestnet.id,
                      functionName: "cancelExpense",
                      args: [selected.id],
                    });
                  },
                  "Expense cancellation",
                )
              }
              onUpload={() => setEvidenceTarget(selected)}
              onFinanceReject={() =>
                void runAction(
                  async () => {
                    const ready = await requireReady();
                    return await writeContractAsync({
                      address: ready.contract,
                      abi: clearDealTreasuryAbi,
                      chainId: arcTestnet.id,
                      functionName: "rejectByFinance",
                      args: [selected.id],
                    });
                  },
                  "Finance rejection",
                )
              }
              onPay={() => void payWithMemo(selected)}
            />
          ) : (
            <div className="grid min-h-[620px] place-items-center p-8 text-center">
              <div className="max-w-md">
                <ShieldCheck className="mx-auto h-9 w-9 text-[#c98800]" />
                <h2 className="mt-5 font-display text-3xl">
                  Company funds stay under control.
                </h2>
                <p className="mt-3 text-[13px] leading-6 text-[#766b5d]">
                  Create a request, approve the budget, attach the invoice and
                  delivery proof, then let finance pay the vendor with an Arc
                  transaction memo.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="grid content-start gap-3">
          <BudgetPanel
            committed={committed}
            walletBalance={walletBalance}
          />
          <NextAction expense={selected} account={address} />
          <ArcPaymentRecord expense={selected} />
          <VndCashoutPreview walletBalance={walletBalance} />
        </aside>
      </section>

      <CreateExpenseModal
        open={createOpen}
        busy={busy}
        ownerAddress={address}
        onClose={() => setCreateOpen(false)}
        onCreate={createExpense}
      />
      <ExpenseEvidenceModal
        expense={evidenceTarget}
        busy={busy}
        onClose={() => setEvidenceTarget(undefined)}
        onSubmit={submitEvidence}
      />
    </main>
  );
}

function ExpenseDetail({
  expense,
  account,
  busy,
  onManagerDecision,
  onCancel,
  onUpload,
  onFinanceReject,
  onPay,
}: {
  expense: ExpenseRecord;
  account?: Address;
  busy: boolean;
  onManagerDecision: (approved: boolean) => void;
  onCancel: () => void;
  onUpload: () => void;
  onFinanceReject: () => void;
  onPay: () => void;
}) {
  const isManager = sameAddress(account, expense.manager);
  const isRequester = sameAddress(account, expense.requester);
  const isFinance = sameAddress(account, expense.finance);
  const [copiedRole, setCopiedRole] = useState<string>();
  const nextRole =
    expense.status === "Manager approval"
      ? "Manager"
      : expense.status === "Invoice & delivery"
        ? "Requester"
        : expense.status === "Finance approval"
          ? "Finance"
          : undefined;
  const roleWallets = [
    { label: "Requester", address: expense.requester },
    { label: "Manager", address: expense.manager },
    { label: "Finance", address: expense.finance },
    { label: "Vendor", address: expense.vendor },
  ] as const;
  const remaining =
    expense.payoutAmount > 0n
      ? expense.approvedBudget - expense.payoutAmount
      : expense.approvedBudget;
  return (
    <>
      <header className="border-b border-[#ded5c6] p-5 sm:p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#766b5d]">
          {expense.metadata?.memoCode ??
            `CD-EXP-${expense.id.toString()}`}
        </p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl">
          {expense.metadata?.title ??
            `Expense request #${expense.id.toString()}`}
        </h2>
        <div className="mt-5 grid gap-4 border-t border-[#e8e1d6] pt-5 text-[11px] sm:grid-cols-2 2xl:grid-cols-4">
          <Fact
            label="Department"
            value={expense.metadata?.department ?? "—"}
          />
          <Fact
            label="Requested by"
            value={expense.metadata?.requesterName ?? "—"}
          />
          <Fact label="Created" value={formatDate(expense.createdAt)} />
          <Fact
            label="Vendor"
            value={
              expense.metadata?.vendorName ??
              shortExpenseWallet(expense.vendor)
            }
          />
        </div>
      </header>

      <div className="p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-3">
          <Metric
            label="Approved budget"
            value={formatExpenseUsdc(expense.approvedBudget)}
          />
          <Metric
            label="Invoice total"
            value={
              expense.payoutAmount
                ? formatExpenseUsdc(expense.payoutAmount)
                : "Pending"
            }
          />
          <Metric
            label="Remaining"
            value={formatExpenseUsdc(remaining)}
            good
          />
        </div>
        <section className="mt-6 border border-[#ded5c6] bg-[#f7f4e9]">
          <div className="border-b border-[#ded5c6] px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
              Assigned wallets
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[#766b5d]">
              Connect the wallet marked “Next signer” to continue this request.
            </p>
          </div>
          <div className="grid md:grid-cols-2">
            {roleWallets.map((role, index) => {
              const connected = sameAddress(account, role.address);
              return (
                <div
                  key={role.label}
                  className={`min-w-0 p-4 ${
                    index % 2 === 0 ? "md:border-r md:border-[#ded5c6]" : ""
                  } ${
                    index < 3
                      ? "border-b border-[#ded5c6]"
                      : ""
                  } ${index === 2 ? "md:border-b-0" : ""} ${
                    connected ? "bg-emerald-50" : "bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-[11px]">{role.label}</strong>
                    <div className="flex items-center gap-1.5">
                      {nextRole === role.label ? (
                        <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-[8px] uppercase text-amber-800">
                          Next signer
                        </span>
                      ) : null}
                      {connected ? (
                        <span className="rounded border border-emerald-300 bg-emerald-100 px-2 py-1 font-mono text-[8px] uppercase text-emerald-800">
                          Connected
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <code className="mt-3 block break-all font-mono text-[9px] leading-4 text-[#574c40]">
                    {role.address}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(role.address)
                        .then(() => setCopiedRole(role.label));
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#a56b00]"
                    aria-label={`Copy ${role.label.toLowerCase()} wallet`}
                  >
                    <Copy className="h-3 w-3" />
                    {copiedRole === role.label ? "Copied" : "Copy address"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        <div className="mt-6 grid gap-5 border-y border-[#e8e1d6] py-5 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
              Business purpose
            </p>
            <p className="mt-2 text-[12px] leading-6 text-[#574c40]">
              {expense.metadata?.purpose ??
                "Purpose is committed by the metadata hash."}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
              Approval rule
            </p>
            <p className="mt-2 text-[12px] leading-6 text-[#574c40]">
              {expense.metadata?.acceptance ??
                "Invoice and delivery evidence must be reviewed before payment."}
            </p>
          </div>
        </div>

        <EvidenceFiles expense={expense} />
        <ExpenseWorkflow expense={expense} />

        <div className="mt-6 flex flex-wrap gap-3">
          {isManager && expense.status === "Manager approval" ? (
            <>
              <PrimaryAction
                icon={CheckCircle2}
                disabled={busy}
                onClick={() => onManagerDecision(true)}
              >
                Approve expense
              </PrimaryAction>
              <SecondaryAction
                icon={XCircle}
                disabled={busy}
                danger
                onClick={() => onManagerDecision(false)}
              >
                Reject
              </SecondaryAction>
            </>
          ) : null}
          {isRequester && expense.status === "Manager approval" ? (
            <SecondaryAction
              icon={XCircle}
              disabled={busy}
              danger
              onClick={onCancel}
            >
              Cancel request
            </SecondaryAction>
          ) : null}
          {isRequester && expense.status === "Invoice & delivery" ? (
            <PrimaryAction
              icon={Paperclip}
              disabled={busy}
              onClick={onUpload}
            >
              Upload invoice & delivery
            </PrimaryAction>
          ) : null}
          {isFinance && expense.status === "Finance approval" ? (
            <>
              <PrimaryAction
                icon={CircleDollarSign}
                disabled={busy}
                onClick={onPay}
              >
                Pay vendor with Arc memo
              </PrimaryAction>
              <SecondaryAction
                icon={XCircle}
                disabled={busy}
                danger
                onClick={onFinanceReject}
              >
                Reject payment
              </SecondaryAction>
            </>
          ) : null}
          {!account ? (
            <p className="text-[11px] text-[#766b5d]">
              Connect the assigned wallet to take an action.
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ExpenseWorkflow({ expense }: { expense: ExpenseRecord }) {
  const current =
    expense.status === "Manager approval"
      ? 2
      : expense.status === "Invoice & delivery"
        ? 3
        : expense.status === "Finance approval"
          ? 4
          : expense.status === "Paid"
            ? 6
            : 0;
  const steps = [
    "Request",
    "Manager approval",
    "Invoice & delivery",
    "Finance approval",
    "USDC paid",
  ];
  return (
    <section className="mt-6">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
        Workflow
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-5">
        {steps.map((title, index) => {
          const number = index + 1;
          const complete = current > number;
          const active = current === number;
          return (
            <li key={title} className="relative">
              <div className="flex items-center">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                    complete
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : active
                        ? "border-[#c98800] bg-[#fff1c7] text-[#a56b00]"
                        : "border-[#cfc6b8] bg-white text-[#8a7d6d]"
                  }`}
                >
                  {complete ? <Check className="h-4 w-4" /> : number}
                </span>
                {index < steps.length - 1 ? (
                  <span className="h-px flex-1 bg-[#d8d0c4] sm:block" />
                ) : null}
              </div>
              <strong className="mt-2 block text-[10px] leading-4">
                {title}
              </strong>
              <span className="mt-1 block font-mono text-[8px] uppercase text-[#8a7d6d]">
                {complete ? "Done" : active ? "Current" : "Pending"}
              </span>
            </li>
          );
        })}
      </ol>
      {expense.status === "Rejected" ||
      expense.status === "Cancelled" ? (
        <p className="mt-4 border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">
          This request is closed and no USDC can move.
        </p>
      ) : null}
    </section>
  );
}

function EvidenceFiles({ expense }: { expense: ExpenseRecord }) {
  const attachments = expense.evidence?.attachments ?? [];
  return (
    <section className="mt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
            Invoice & delivery
          </p>
          <h3 className="mt-1 text-[13px] font-semibold">
            {attachments.length
              ? `${attachments.length} verified attachment${
                  attachments.length === 1 ? "" : "s"
                }`
              : expense.evidence
                ? "Signed invoice note submitted"
              : "Waiting for sample invoice evidence"}
          </h3>
        </div>
        {expense.evidenceHash !== `0x${"0".repeat(64)}` ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Hash recorded on Arc
          </span>
        ) : null}
      </div>
      {attachments.length ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {attachments.map((attachment, index) => (
            <li
              key={attachment.sha256}
              className="flex items-center gap-3 rounded-lg border border-[#ded5c6] bg-white p-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f7f4e9] text-[#a56b00]">
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold">
                  {attachment.name}
                </span>
                <span className="mt-1 block font-mono text-[8px] text-[#8a7d6d]">
                  {(attachment.size / 1_000).toFixed(1)} KB
                </span>
              </span>
              <a
                href={`/api/expenses/evidence/attachment?hash=${expense.evidenceHash}&index=${index}`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#ded5c6] text-[#766b5d]"
                aria-label={`Download ${attachment.name}`}
              >
                <Download className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-[#cfc6b8] bg-[#f7f4e9] p-4 text-[11px] text-[#766b5d]">
          <Paperclip className="h-4 w-4" />
          The requester adds a sample invoice, receipt, or delivery photo after
          manager approval.
        </div>
      )}
    </section>
  );
}

function BudgetPanel({
  committed,
  walletBalance,
}: {
  committed: bigint;
  walletBalance?: bigint;
}) {
  const available =
    walletBalance !== undefined && walletBalance > committed
      ? walletBalance - committed
      : 0n;
  return (
    <section className="border border-[#ded5c6] bg-[#fffdf7] p-5">
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">
        Connected wallet budget
      </p>
      <div className="mt-4 grid gap-3 text-[11px]">
        <Fact
          label="USDC balance"
          value={
            walletBalance === undefined
              ? "Connect wallet"
              : formatExpenseUsdc(walletBalance)
          }
        />
        <Fact label="Committed" value={formatExpenseUsdc(committed)} />
        <Fact
          label="Available after requests"
          value={formatExpenseUsdc(available)}
          good
        />
      </div>
      <p className="mt-4 border-t border-[#e8e1d6] pt-4 text-[10px] leading-5 text-[#766b5d]">
        Arc uses the same USDC balance for company payments and network fees.
      </p>
    </section>
  );
}

function NextAction({
  expense,
  account,
}: {
  expense?: ExpenseRecord;
  account?: Address;
}) {
  let title = "Select a request";
  let text = "Open an assigned request to see the next company action.";
  if (expense && !account) {
    title = "Connect the assigned wallet";
    text = "Passkey users can request and approve. Finance uses the treasury wallet.";
  } else if (
    expense &&
    sameAddress(account, expense.manager) &&
    expense.status === "Manager approval"
  ) {
    title = "Manager approval required";
    text = "Review the purpose and budget before the vendor starts work.";
  } else if (
    expense &&
    sameAddress(account, expense.requester) &&
    expense.status === "Invoice & delivery"
  ) {
    title = "Upload invoice evidence";
    text = "Add the final invoice total and sample delivery proof.";
  } else if (
    expense &&
    sameAddress(account, expense.finance) &&
    expense.status === "Finance approval"
  ) {
    title = "Finance payment required";
    text = "Check the evidence, then pay the vendor with the Arc memo.";
  } else if (expense?.status === "Paid") {
    title = "Vendor paid";
    text = "The USDC payment and memo are final on Arc Testnet.";
  } else if (expense) {
    title = "Waiting for another role";
    text = "No action is required from this wallet at the current step.";
  }
  return (
    <section className="border border-[#ded5c6] bg-[#fffdf7] p-5">
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">
        Next action
      </p>
      <div className="mt-4 flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#e0b65c] bg-[#fff1c7] text-[#a56b00]">
          <ArrowRight className="h-4 w-4" />
        </span>
        <div>
          <strong className="block text-[12px]">{title}</strong>
          <p className="mt-1 text-[10px] leading-5 text-[#766b5d]">
            {text}
          </p>
        </div>
      </div>
    </section>
  );
}

function ArcPaymentRecord({ expense }: { expense?: ExpenseRecord }) {
  return (
    <section className="border border-[#ded5c6] bg-[#fffdf7] p-5">
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">
        Arc payment record
      </p>
      <div className="mt-4 grid gap-3 text-[11px]">
        <Fact label="Status" value={expense?.status ?? "No request"} />
        <Fact label="Network" value="Arc Testnet" />
        <Fact label="Pay with" value="USDC" />
        <Fact
          label="Memo"
          value={
            expense?.metadata?.memoCode ??
            (expense ? `CD-EXP-${expense.id.toString()}` : "—")
          }
        />
      </div>
      <div className="mt-4 flex gap-2 rounded-lg border border-[#ded5c6] bg-[#f7f4e9] p-3 text-[10px] leading-5 text-[#766b5d]">
        <WalletCards className="mt-0.5 h-4 w-4 shrink-0" />
        {expense?.status === "Paid"
          ? "The payment completed after all company controls passed."
          : "The payment is created only after the manager, invoice, and finance checks are complete."}
      </div>
    </section>
  );
}

function ExpenseEvidenceModal({
  expense,
  busy,
  onClose,
  onSubmit,
}: {
  expense?: ExpenseRecord;
  busy: boolean;
  onClose: () => void;
  onSubmit: (
    expense: ExpenseRecord,
    payoutAmount: string,
    reference: string,
    files: readonly File[],
  ) => Promise<void>;
}) {
  const [payoutAmount, setPayoutAmount] = useState("");
  const [reference, setReference] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>();
  const expenseKey = expense?.id.toString() ?? "";

  useEffect(() => {
    setPayoutAmount("");
    setReference("");
    setFiles([]);
    setFileError(undefined);
  }, [expenseKey]);

  function selectFiles(nextFiles: File[]) {
    if (nextFiles.length > EXPENSE_EVIDENCE_MAX_ATTACHMENTS) {
      setFileError(
        `Attach no more than ${EXPENSE_EVIDENCE_MAX_ATTACHMENTS} files.`,
      );
      return;
    }
    if (
      nextFiles.some(
        (file) =>
          !EXPENSE_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.includes(
            file.type as ExpenseEvidenceAttachment["contentType"],
          ) || file.size > EXPENSE_EVIDENCE_MAX_ATTACHMENT_BYTES,
      )
    ) {
      setFileError("Use PDF, PNG, JPEG, or TXT files smaller than 1 MB each.");
      return;
    }
    if (
      nextFiles.reduce((sum, file) => sum + file.size, 0) >
      EXPENSE_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES
    ) {
      setFileError("Attachments must total less than 2 MB.");
      return;
    }
    setFiles(nextFiles);
    setFileError(undefined);
  }

  if (!expense) return null;
  return (
    <div
      className="t-modal-overlay is-open fixed inset-0 z-[95] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(expense, payoutAmount, reference, files);
        }}
        className="t-modal is-open max-h-[90dvh] w-full max-w-[680px] overflow-y-auto border border-[#ded5c6] bg-[#fffcf0] p-6 text-[#2b2118]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#a56b00]">
              Invoice & delivery ·{" "}
              {expense.metadata?.memoCode ??
                `Request ${expense.id.toString()}`}
            </p>
            <h2 className="mt-3 font-display text-3xl">
              Submit the final invoice.
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-[#766b5d]">
              Finance will see the amount, note, and sample attachments before
              any USDC can move.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#ded5c6]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mt-5 grid gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
            Final invoice total (USDC)
          </span>
          <input
            required
            type="number"
            min="0.000001"
            max={Number(expense.approvedBudget) / 1_000_000}
            step="0.000001"
            value={payoutAmount}
            onChange={(event) => setPayoutAmount(event.target.value)}
            className="cd-input font-mono"
            placeholder="4700"
          />
          <span className="text-[10px] text-[#766b5d]">
            Approved limit: {formatExpenseUsdc(expense.approvedBudget)}
          </span>
        </label>
        <label className="mt-4 grid gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
            Invoice and delivery note
          </span>
          <textarea
            required
            maxLength={1000}
            rows={4}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Invoice INV-2026-018. All event materials were received and match the approved scope."
            className="cd-input resize-none"
          />
        </label>
        <section className="mt-4 rounded-xl border border-[#ded5c6] bg-[#f7f4e9] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold">
                Sample invoice or delivery files
              </p>
              <p className="mt-1 text-[10px] text-[#766b5d]">
                Up to 3 files · 2 MB total
              </p>
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-[#d8aa4d] bg-[#fff1c7] px-4 text-[11px] font-semibold text-[#875900]">
              Choose files
              <input
                type="file"
                multiple
                accept={EXPENSE_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.join(",")}
                className="sr-only"
                onChange={(event) =>
                  selectFiles(Array.from(event.target.files ?? []))
                }
              />
            </label>
          </div>
          {files.length ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {files.map((file) => (
                <li
                  key={`${file.name}:${file.size}`}
                  className="overflow-hidden rounded-lg border border-[#ded5c6] bg-white"
                >
                  <LocalAttachmentPreview file={file} />
                  <span className="flex items-center justify-between gap-3 p-3 text-[10px]">
                    <span className="truncate">{file.name}</span>
                    <span className="font-mono text-[#8a7d6d]">
                      {(file.size / 1_000).toFixed(1)} KB
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {fileError ? (
            <p className="mt-3 text-[10px] text-rose-700">{fileError}</p>
          ) : null}
        </section>
        <p className="mt-3 text-[10px] leading-4 text-amber-800">
          Public Testnet demo: upload sample documents only. Do not include
          personal, salary, bank, or confidential production data.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-10 rounded-lg border border-[#ded5c6] bg-white px-4 text-[12px] text-[#766b5d]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              busy ||
              !payoutAmount ||
              !reference.trim() ||
              Boolean(fileError)
            }
            className="min-h-10 rounded-lg bg-[#ffc23d] px-5 text-[12px] font-semibold disabled:opacity-40"
          >
            {busy ? "Waiting…" : "Sign & submit evidence"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LocalAttachmentPreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const isImage =
    file.type === "image/jpeg" || file.type === "image/png";

  useEffect(() => {
    if (!isImage) return;
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file, isImage]);

  if (isImage && previewUrl) {
    return (
      <Image
        src={previewUrl}
        alt={`Preview of ${file.name}`}
        width={560}
        height={320}
        unoptimized
        className="h-28 w-full object-cover"
      />
    );
  }
  return (
    <div className="grid h-20 place-items-center bg-[#f7f4e9]">
      <FileCheck2 className="h-6 w-6 text-[#a56b00]" />
    </div>
  );
}

function PrimaryAction({
  icon: Icon,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ffc23d] px-4 text-[12px] font-semibold hover:bg-[#f4ad14] disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function SecondaryAction({
  icon: Icon,
  children,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border bg-white px-4 text-[12px] font-semibold disabled:opacity-40 ${
        danger
          ? "border-rose-200 text-rose-700"
          : "border-[#ded5c6] text-[#574c40]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Status({ value }: { value: string }) {
  const good = value === "Paid";
  const bad = value === "Rejected" || value === "Cancelled";
  return (
    <span
      className={`mt-2 inline-flex rounded border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${
        good
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : bad
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {value}
    </span>
  );
}

function Metric({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
        {label}
      </p>
      <strong
        className={`mt-2 block font-mono text-lg ${
          good ? "text-emerald-700" : ""
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

function Fact({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[#766b5d]">{label}</span>
      <strong
        className={`text-right font-mono text-[10px] ${
          good ? "text-emerald-700" : ""
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "error" | "warning" | "info" | "success";
}) {
  const style =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-700";
  return (
    <div
      className={`mx-auto mt-4 max-w-[1436px] rounded-lg border px-4 py-3 text-[12px] ${style}`}
    >
      {children}
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  text,
  spin,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  spin?: boolean;
}) {
  return (
    <div className="grid min-h-[260px] place-items-center p-8 text-center">
      <div>
        <Icon
          className={`mx-auto h-6 w-6 text-[#a56b00] ${
            spin ? "animate-spin" : ""
          }`}
        />
        <h3 className="mt-4 text-sm font-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-xs text-[11px] leading-5 text-[#766b5d]">
          {text}
        </p>
      </div>
    </div>
  );
}
