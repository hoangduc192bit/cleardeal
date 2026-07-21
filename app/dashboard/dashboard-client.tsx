"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Copy,
  ExternalLink,
  FileCheck2,
  Gavel,
  Link2,
  ListChecks,
  LoaderCircle,
  Menu,
  Network,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Vote,
  X,
} from "lucide-react";
import {
  erc20Abi,
  keccak256,
  parseEventLogs,
  parseUnits,
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
  CreateCycleModal,
  type CreateCycleInput,
} from "@/components/clearing/CreateCycleModal";
import { SettlementAgentPanel } from "@/components/clearing/SettlementAgentPanel";
import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";
import { WalletButton } from "@/components/WalletButton";
import { arcTestnet } from "@/config/chain";
import { useClearingCycles } from "@/hooks/use-clearing-cycles";
import {
  clearingHouseAbi,
  clearingHouseAddress,
  clearingHouseConfigured,
} from "@/lib/clearing-contract";
import {
  clearingSavings,
  formatClearingUsdc,
  shortWallet,
  type ClearingCycleRecord,
  type ClearingObligationRecord,
} from "@/lib/clearing-data";
import {
  buildStoreClearingEvidenceMessage,
  CLEARING_EVIDENCE_ALLOWED_ATTACHMENT_TYPES,
  CLEARING_EVIDENCE_MAX_ATTACHMENTS,
  CLEARING_EVIDENCE_MAX_ATTACHMENT_BYTES,
  CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES,
  hashClearingEvidence,
  type ClearingEvidence,
  type ClearingEvidenceAttachment,
  type ClearingEvidenceAttachmentPayload,
  type StoreClearingEvidenceAuthorization,
} from "@/lib/clearing-evidence";
import {
  buildClearingInvitePath,
  parseCycleId,
  parseInviteRole,
  parseInviteWallet,
  type ClearingInviteRole,
} from "@/lib/clearing-invites";
import {
  buildStoreClearingMetadataMessage,
  hashClearingMetadata,
  type ClearingMetadata,
  type StoreClearingMetadataAuthorization,
} from "@/lib/clearing-metadata";
import { clearDealUsdcAddress } from "@/lib/cleardeal-contract";
import { evaluateSettlementAgent } from "@/lib/settlement-agent";

const EXPLORER = "https://testnet.arcscan.app";

interface TransactionState {
  status: "pending" | "confirmed" | "error";
  message: string;
  hash?: Hash;
}

function sameAddress(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function formatDeadline(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp * 1_000);
}

function friendlyCycleStatus(status: string, advancedMode: boolean) {
  if (advancedMode) return status;
  if (status === "Collecting evidence") return "Work in progress";
  if (status === "Funding net positions") return "Final payments due";
  if (status === "Settled") return "Complete";
  if (status === "Defaulted") return "Payment missed";
  return status;
}

function friendlyObligationStatus(status: string, advancedMode: boolean) {
  if (advancedMode) return status;
  if (status === "Bond required") return "Guarantee needed";
  if (status === "Evidence required") return "Proof needed";
  if (status === "Verification") return "Under review";
  if (status === "Passed") return "Approved";
  if (status === "Failed") return "Rejected";
  return status;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 16_384;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }
  return window.btoa(binary);
}

async function prepareEvidenceAttachments(files: readonly File[]) {
  if (files.length > CLEARING_EVIDENCE_MAX_ATTACHMENTS)
    throw new Error(
      `Attach no more than ${CLEARING_EVIDENCE_MAX_ATTACHMENTS} files.`
    );
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES)
    throw new Error(
      `Attachments must total less than ${Math.floor(
        CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES / 1_000
      )} KB.`
    );
  const descriptors: ClearingEvidenceAttachment[] = [];
  const payloads: ClearingEvidenceAttachmentPayload[] = [];
  for (const file of files) {
    if (
      !CLEARING_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.includes(
        file.type as ClearingEvidenceAttachment["contentType"]
      )
    )
      throw new Error(
        `${file.name} is not a supported PDF, PNG, JPEG, or text file.`
      );
    if (file.size < 1 || file.size > CLEARING_EVIDENCE_MAX_ATTACHMENT_BYTES)
      throw new Error(
        `${file.name} must be smaller than ${Math.floor(
          CLEARING_EVIDENCE_MAX_ATTACHMENT_BYTES / 1_000
        )} KB.`
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const sha256 = `0x${Array.from(digest, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("")}` as Hash;
    descriptors.push({
      name: file.name,
      contentType: file.type as ClearingEvidenceAttachment["contentType"],
      size: file.size,
      sha256,
    });
    payloads.push({ sha256, dataBase64: bytesToBase64(bytes) });
  }
  return { descriptors, payloads };
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const requestedCycleId = parseCycleId(searchParams.get("cycle"));
  const invitedWallet = parseInviteWallet(searchParams.get("wallet"));
  const invitedRole = parseInviteRole(searchParams.get("role"));
  const { cycles, passport, loading, error, refresh } = useClearingCycles(
    address,
    requestedCycleId
  );
  const [selectedId, setSelectedId] = useState<bigint>();
  const [createOpen, setCreateOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>();
  const [evidenceTarget, setEvidenceTarget] = useState<{
    cycle: ClearingCycleRecord;
    obligation: ClearingObligationRecord;
  }>();
  const [walletBalance, setWalletBalance] = useState<bigint>();

  useEffect(() => {
    if (!cycles.length) return setSelectedId(undefined);
    if (
      requestedCycleId !== undefined &&
      cycles.some((cycle) => cycle.id === requestedCycleId)
    )
      return setSelectedId(requestedCycleId);
    if (
      selectedId === undefined ||
      !cycles.some((cycle) => cycle.id === selectedId)
    )
      setSelectedId(cycles[0].id);
  }, [cycles, requestedCycleId, selectedId]);

  useEffect(() => {
    if (!address || !publicClient || chainId !== arcTestnet.id)
      return setWalletBalance(undefined);
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

  const selected = cycles.find((cycle) => cycle.id === selectedId) ?? cycles[0];
  const inviteMismatch = Boolean(
    address && invitedWallet && !sameAddress(address, invitedWallet)
  );
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;
  const disabledReason = !isConnected
    ? "Connect a participant wallet first."
    : wrongNetwork
    ? "Switch to Arc Testnet first."
    : !clearingHouseConfigured
    ? "ClearingHouse is not configured."
    : undefined;
  const reliability = useMemo(() => {
    if (!passport) return undefined;
    const outcomes = passport.passedObligations + passport.failedObligations;
    if (outcomes === 0n) return undefined;
    return Math.max(
      0,
      Math.round(
        Number((passport.passedObligations * 100n) / outcomes) -
          Number(passport.defaultedCycles) * 10
      )
    );
  }, [passport]);
  const agentDecision = selected
    ? evaluateSettlementAgent(selected, address, walletBalance)
    : undefined;

  async function requireReady() {
    if (!address || !publicClient || !clearingHouseAddress)
      throw new Error("Connect a wallet and configure ClearingHouse first.");
    if (chainId !== arcTestnet.id)
      await switchChainAsync({ chainId: arcTestnet.id });
    return { address, publicClient, contract: clearingHouseAddress };
  }

  async function waitFor(hash: Hash, message: string, refreshAfter = true) {
    if (!publicClient) throw new Error("Arc RPC is unavailable.");
    setTransaction({ status: "pending", message, hash });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error("Transaction reverted on Arc Testnet.");
    setTransaction({
      status: "confirmed",
      message: `${message} confirmed.`,
      hash,
    });
    if (refreshAfter) await refresh();
    return receipt;
  }

  async function runAction(
    action: () => Promise<Hash>,
    pendingMessage: string
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
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function ensureAllowance(amount: bigint) {
    const ready = await requireReady();
    const allowance = await ready.publicClient.readContract({
      address: clearDealUsdcAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [ready.address, ready.contract],
    });
    if (allowance >= amount) return;
    setTransaction({
      status: "pending",
      message: `Approve ${formatClearingUsdc(
        amount
      )} for the audited flow you are testing.`,
    });
    const hash = await writeContractAsync({
      address: clearDealUsdcAddress,
      abi: erc20Abi,
      chainId: arcTestnet.id,
      functionName: "approve",
      args: [ready.contract, amount],
    });
    await waitFor(hash, "USDC approval", false);
  }

  async function createCycle(input: CreateCycleInput) {
    const ready = await requireReady();
    setBusy(true);
    try {
      const metadata: ClearingMetadata = {
        version: 1,
        name: input.name,
        description: input.description,
        participants: input.participants,
        verifiers: input.verifiers,
        obligations: input.obligations.map(
          ({ payer, provider, title, acceptance }) => ({
            payer,
            provider,
            title,
            acceptance,
          })
        ),
      };
      const metadataHash = hashClearingMetadata(metadata);
      const authorization: StoreClearingMetadataAuthorization = {
        ownerAddress: ready.address,
        metadataHash,
        requestId: crypto.randomUUID(),
        issuedAt: Date.now(),
      };
      setTransaction({
        status: "pending",
        message:
          "Sign public clearing terms. This signature does not transfer USDC.",
      });
      const signature = await signMessageAsync({
        message: buildStoreClearingMetadataMessage(authorization),
      });
      const response = await fetch("/api/clearing/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authorization, metadata, signature }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Could not store signed cycle metadata.");
      }
      const obligations = input.obligations.map((item) => ({
        payer: item.payer,
        provider: item.provider,
        amount: parseUnits(item.amount, 6),
        bondAmount: parseUnits(item.bond, 6),
        specHash: keccak256(
          toBytes(
            JSON.stringify({
              payer: item.payer.toLowerCase(),
              provider: item.provider.toLowerCase(),
              title: item.title,
              acceptance: item.acceptance,
            })
          )
        ),
      }));
      setTransaction({
        status: "pending",
        message: "Confirm clearing cycle creation on Arc Testnet.",
      });
      const hash = await writeContractAsync({
        address: ready.contract,
        abi: clearingHouseAbi,
        chainId: arcTestnet.id,
        functionName: "createCycle",
        args: [
          {
            arbitrator: input.arbitrator,
            metadataHash,
            evidenceDeadline: BigInt(
              Math.floor(
                Date.parse(`${input.evidenceDeadline}T23:59:59Z`) / 1_000
              )
            ),
            fundingDeadline: BigInt(
              Math.floor(
                Date.parse(`${input.fundingDeadline}T23:59:59Z`) / 1_000
              )
            ),
            verifierThreshold: input.verifierThreshold,
          },
          input.participants.map((item) => item.address),
          input.verifiers.map((item) => item.address),
          obligations,
        ],
      });
      const receipt = await waitFor(hash, "Clearing cycle creation");
      const created = parseEventLogs({
        abi: clearingHouseAbi,
        logs: receipt.logs,
        eventName: "CycleCreated",
        strict: false,
      })[0];
      const createdCycleId = created?.args.cycleId;
      if (typeof createdCycleId === "bigint") {
        setSelectedId(createdCycleId);
        router.replace(`/dashboard?cycle=${createdCycleId.toString()}`, {
          scroll: false,
        });
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Cycle creation failed.";
      setTransaction({ status: "error", message });
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function postBond(
    cycle: ClearingCycleRecord,
    obligation: ClearingObligationRecord
  ) {
    const ready = await requireReady();
    setBusy(true);
    try {
      await ensureAllowance(obligation.bondAmount);
      await waitFor(
        await writeContractAsync({
          address: ready.contract,
          abi: clearingHouseAbi,
          chainId: arcTestnet.id,
          functionName: "postBond",
          args: [cycle.id, obligation.id],
        }),
        "Performance bond"
      );
    } catch (cause) {
      setTransaction({
        status: "error",
        message: cause instanceof Error ? cause.message : "Bond failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitEvidence(reference: string, files: readonly File[]) {
    if (!evidenceTarget) return;
    const ready = await requireReady();
    setBusy(true);
    try {
      const { descriptors, payloads } = await prepareEvidenceAttachments(files);
      const evidence: ClearingEvidence = {
        version: 1,
        cycleId: evidenceTarget.cycle.id.toString(),
        obligationId: evidenceTarget.obligation.id.toString(),
        reference: reference.trim(),
        submittedAt: new Date().toISOString(),
        ...(descriptors.length ? { attachments: descriptors } : {}),
      };
      const evidenceHash = hashClearingEvidence(evidence);
      const authorization: StoreClearingEvidenceAuthorization = {
        providerAddress: ready.address,
        evidenceHash,
        requestId: crypto.randomUUID(),
        issuedAt: Date.now(),
      };
      setTransaction({
        status: "pending",
        message:
          "Sign the public evidence reference. This signature does not transfer USDC.",
      });
      const signature = await signMessageAsync({
        message: buildStoreClearingEvidenceMessage(authorization),
      });
      const response = await fetch("/api/clearing/evidence", {
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
        throw new Error(body.error ?? "Could not store signed evidence.");
      }
      await waitFor(
        await writeContractAsync({
          address: ready.contract,
          abi: clearingHouseAbi,
          chainId: arcTestnet.id,
          functionName: "submitEvidence",
          args: [
            evidenceTarget.cycle.id,
            evidenceTarget.obligation.id,
            evidenceHash,
          ],
        }),
        "Evidence submission"
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

  async function fundPosition(cycle: ClearingCycleRecord, amount: bigint) {
    const ready = await requireReady();
    setBusy(true);
    try {
      await ensureAllowance(amount);
      await waitFor(
        await writeContractAsync({
          address: ready.contract,
          abi: clearingHouseAbi,
          chainId: arcTestnet.id,
          functionName: "fundNetPosition",
          args: [cycle.id],
        }),
        "Net position funding"
      );
    } catch (cause) {
      setTransaction({
        status: "error",
        message: cause instanceof Error ? cause.message : "Funding failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  const labelFor = (cycle: ClearingCycleRecord, wallet: Address) =>
    cycle.metadata?.participants.find((item) =>
      sameAddress(item.address, wallet)
    )?.label ??
    cycle.metadata?.verifiers.find((item) => sameAddress(item.address, wallet))
      ?.label ??
    shortWallet(wallet);
  const selectCycle = (cycleId: bigint) => {
    setSelectedId(cycleId);
    router.replace(`/dashboard?cycle=${cycleId.toString()}`, { scroll: false });
  };

  return (
    <main className="cleardeal-app min-h-[100dvh] bg-[#fffcf0] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <ClearDealBrand />
          <div className="hidden items-center gap-3 md:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Arc
              Testnet · Clearing live
            </span>
            <WalletButton />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden"
            aria-label="Open workspace navigation"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
        {mobileOpen ? (
          <div className="grid gap-3 border-t border-slate-200 bg-white p-5 shadow-lg md:hidden">
            <WalletButton />
            <Link
              href="/docs"
              className="rounded-lg px-2 py-3 text-sm text-slate-600"
            >
              Protocol docs
            </Link>
          </div>
        ) : null}
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-7 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              Shared settlement on Arc
            </p>
            <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">
              Settle what everyone actually owes.
            </h1>
            <p className="mt-4 max-w-3xl text-[14px] leading-6 text-slate-600">
              Put several payment commitments in one room, approve completed
              work, and move only the final USDC difference instead of paying
              every transfer separately.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard?cycle=0"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
            >
              <ListChecks className="h-4 w-4" /> View live example
            </Link>
            <button
              type="button"
              onClick={() => setAdvancedMode((value) => !value)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
            >
              <Settings2 className="h-4 w-4" />{" "}
              {advancedMode ? "Simple mode" : "Advanced details"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreateOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-[12px] font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> New settlement room
            </button>
          </div>
        </div>
      </section>

      {!clearingHouseConfigured ? (
        <Notice tone="error">
          ClearingHouse is not configured — writes are disabled until the
          verified Arc Testnet deployment is added.
        </Notice>
      ) : wrongNetwork ? (
        <Notice tone="warning">
          Your wallet is on the wrong network. Switch to Arc Testnet before
          signing.
        </Notice>
      ) : null}
      {requestedCycleId !== undefined ? (
        <Notice tone={inviteMismatch ? "warning" : "info"}>
          <span className="font-semibold">
            Clearing Room #{requestedCycleId.toString()}
          </span>
          {invitedRole && invitedWallet ? (
            <>
              {" "}
              · Invited as {invitedRole} for{" "}
              <span className="font-mono">{shortWallet(invitedWallet)}</span>.
            </>
          ) : (
            <> · Public onchain cycle view.</>
          )}
          {inviteMismatch
            ? " Connect the invited wallet to perform this role."
            : !isConnected && invitedWallet
            ? " Connect the invited wallet to continue."
            : ""}
        </Notice>
      ) : null}
      {transaction ? (
        <div
          className={`mx-auto mt-5 flex max-w-[1410px] items-center justify-between gap-4 border px-4 py-3 text-[12px] ${
            transaction.status === "error"
              ? "border-rose-400/25 bg-rose-400/[0.06] text-rose-200"
              : transaction.status === "confirmed"
              ? "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-200"
              : "border-blue-400/20 bg-blue-400/[0.05] text-blue-200"
          }`}
        >
          <span className="flex items-center gap-2">
            {transaction.status === "pending" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : transaction.status === "confirmed" ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {transaction.message}
          </span>
          {transaction.hash ? (
            <a
              href={`${EXPLORER}/tx/${transaction.hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold"
            >
              Receipt <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      ) : null}

      {agentDecision ? (
        <div className="mx-auto max-w-[1500px] px-5 pt-5 sm:px-8">
          <SettlementAgentPanel decision={agentDecision} />
        </div>
      ) : null}

      <div className="mx-auto grid max-w-[1500px] gap-5 px-5 py-6 sm:px-8 xl:grid-cols-[290px_minmax(0,1fr)_280px]">
        <aside className="border border-white/[0.1] bg-[#080d13]">
          <div className="flex items-center justify-between border-b border-white/[0.09] p-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">
                Your rooms
              </p>
              <p className="mt-1 text-sm font-semibold">
                {cycles.length} settlement{" "}
                {cycles.length === 1 ? "room" : "rooms"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="grid h-9 w-9 place-items-center border border-white/[0.1] text-white/45"
              aria-label="Refresh rooms"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          <div className="cd-scrollbar max-h-[680px] overflow-y-auto p-2">
            {loading ? (
              <Empty
                icon={LoaderCircle}
                title="Reading Arc"
                text="Loading your settlement rooms…"
                spin
              />
            ) : error ? (
              <Empty
                icon={AlertTriangle}
                title="Could not load rooms"
                text={error}
              />
            ) : !isConnected && requestedCycleId === undefined ? (
              <Empty
                icon={Network}
                title="Connect a wallet"
                text="Connect a room wallet, or open the completed public example."
              />
            ) : cycles.length === 0 ? (
              <Empty
                icon={FileCheck2}
                title="No rooms yet"
                text="Create a settlement room or open a valid invitation."
              />
            ) : (
              cycles.map((cycle) => (
                <button
                  key={cycle.id.toString()}
                  type="button"
                  onClick={() => selectCycle(cycle.id)}
                  className={`mb-2 w-full border p-4 text-left ${
                    selected?.id === cycle.id
                      ? "border-blue-400/60 bg-blue-500/[0.09]"
                      : "border-white/[0.08] bg-white/[0.015] hover:border-white/[0.16]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[9px] uppercase text-blue-300">
                      Room #{cycle.id.toString()}
                    </span>
                    <Status
                      value={friendlyCycleStatus(cycle.status, advancedMode)}
                    />
                  </div>
                  <h3 className="mt-3 text-[13px] font-semibold text-white">
                    {cycle.metadata?.name ?? `Settlement room ${cycle.id}`}
                  </h3>
                  <p className="mt-2 font-mono text-[10px] text-white/35">
                    {formatClearingUsdc(cycle.totalGross)} committed
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-w-0 border border-white/[0.1] bg-[#080d13]">
          {selected ? (
            <CycleDetail
              cycle={selected}
              account={address}
              advancedMode={advancedMode}
              busy={busy}
              labelFor={labelFor}
              onPostBond={postBond}
              onEvidence={(obligation) =>
                setEvidenceTarget({ cycle: selected, obligation })
              }
              onVote={(obligation, approved) =>
                runAction(
                  async () => {
                    const ready = await requireReady();
                    return writeContractAsync({
                      address: ready.contract,
                      abi: clearingHouseAbi,
                      chainId: arcTestnet.id,
                      functionName: "castVote",
                      args: [selected.id, obligation.id, approved],
                    });
                  },
                  approved ? "Work approval" : "Work rejection"
                )
              }
              onResolve={(obligation, passed) =>
                runAction(
                  async () => {
                    const ready = await requireReady();
                    return writeContractAsync({
                      address: ready.contract,
                      abi: clearingHouseAbi,
                      chainId: arcTestnet.id,
                      functionName: "resolveObligation",
                      args: [selected.id, obligation.id, passed],
                    });
                  },
                  passed ? "Dispute approval" : "Dispute rejection"
                )
              }
              onClose={() =>
                runAction(async () => {
                  const ready = await requireReady();
                  return writeContractAsync({
                    address: ready.contract,
                    abi: clearingHouseAbi,
                    chainId: arcTestnet.id,
                    functionName: "closeCycle",
                    args: [selected.id],
                  });
                }, "Final balance calculation")
              }
              onFund={fundPosition}
              onSettle={() =>
                runAction(async () => {
                  const ready = await requireReady();
                  return writeContractAsync({
                    address: ready.contract,
                    abi: clearingHouseAbi,
                    chainId: arcTestnet.id,
                    functionName: "settleCycle",
                    args: [selected.id],
                  });
                }, "Settlement completion")
              }
              onDefault={() =>
                runAction(async () => {
                  const ready = await requireReady();
                  return writeContractAsync({
                    address: ready.contract,
                    abi: clearingHouseAbi,
                    chainId: arcTestnet.id,
                    functionName: "defaultCycle",
                    args: [selected.id],
                  });
                }, "Missed payment finalization")
              }
            />
          ) : (
            <Empty
              icon={Network}
              title="Select a settlement room"
              text="Its payment commitments and next actions will appear here."
            />
          )}
        </section>

        <aside className="space-y-5">
          {advancedMode ? (
            <div className="border border-white/[0.1] bg-[#080d13] p-5">
              <div className="flex items-center gap-2 text-blue-300">
                <ShieldCheck className="h-4 w-4" />
                <p className="font-mono text-[9px] uppercase tracking-[0.14em]">
                  Onchain history
                </p>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <strong className="text-4xl font-semibold">
                    {reliability === undefined ? "—" : reliability}
                  </strong>
                  <span className="ml-1 text-sm text-white/30">/100</span>
                </div>
                <span className="text-[10px] text-white/30">observed</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-px bg-white/[0.08]">
                {[
                  ["Approved", passport?.passedObligations ?? 0n],
                  ["Rejected", passport?.failedObligations ?? 0n],
                  ["Paid", passport?.fundedCycles ?? 0n],
                  ["Missed", passport?.defaultedCycles ?? 0n],
                ].map(([label, value]) => (
                  <div key={label as string} className="bg-[#080d13] p-3">
                    <p className="text-[10px] text-white/30">
                      {label as string}
                    </p>
                    <strong className="mt-1 block font-mono text-sm">
                      {value.toString()}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-white/[0.08] pt-4 text-[11px] leading-5 text-white/38">
                Based only on completed onchain rooms. This is not a credit
                rating.
              </div>
            </div>
          ) : (
            <div className="border border-blue-400/15 bg-blue-500/[0.04] p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-blue-300">
                How a room works
              </p>
              <ol className="mt-4 space-y-4 text-[11px] leading-5 text-white/48">
                <li>
                  <strong className="mr-2 text-white/75">1.</strong>Everyone
                  records who should pay whom.
                </li>
                <li>
                  <strong className="mr-2 text-white/75">2.</strong>Reviewers
                  approve completed work.
                </li>
                <li>
                  <strong className="mr-2 text-white/75">3.</strong>ClearDeal
                  calculates the smallest final payments.
                </li>
                <li>
                  <strong className="mr-2 text-white/75">4.</strong>USDC settles
                  on Arc.
                </li>
              </ol>
            </div>
          )}
          <div className="border border-white/[0.1] bg-[#080d13] p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">
              Your Arc Testnet balance
            </p>
            <strong className="mt-3 block text-xl">
              {walletBalance === undefined
                ? "—"
                : formatClearingUsdc(walletBalance)}
            </strong>
            <p className="mt-2 text-[11px] leading-5 text-white/36">
              Testnet USDC has no real-world value and also covers gas on Arc.
            </p>
          </div>
          {advancedMode && clearingHouseAddress ? (
            <a
              href={`${EXPLORER}/address/${clearingHouseAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between border border-white/[0.1] bg-[#080d13] p-4 text-[12px] text-white/55 hover:text-white"
            >
              <span>Verified smart contract</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </aside>
      </div>

      <CreateCycleModal
        open={createOpen}
        ownerAddress={address}
        disabledReason={disabledReason}
        busy={busy}
        onClose={() => setCreateOpen(false)}
        onCreate={createCycle}
      />
      <EvidenceModal
        target={evidenceTarget}
        busy={busy}
        onClose={() => setEvidenceTarget(undefined)}
        onSubmit={submitEvidence}
      />
    </main>
  );
}

function CycleDetail({
  cycle,
  account,
  advancedMode,
  busy,
  labelFor,
  onPostBond,
  onEvidence,
  onVote,
  onResolve,
  onClose,
  onFund,
  onSettle,
  onDefault,
}: {
  cycle: ClearingCycleRecord;
  account?: Address;
  advancedMode: boolean;
  busy: boolean;
  labelFor: (cycle: ClearingCycleRecord, wallet: Address) => string;
  onPostBond: (
    cycle: ClearingCycleRecord,
    obligation: ClearingObligationRecord
  ) => void;
  onEvidence: (obligation: ClearingObligationRecord) => void;
  onVote: (obligation: ClearingObligationRecord, approved: boolean) => void;
  onResolve: (obligation: ClearingObligationRecord, passed: boolean) => void;
  onClose: () => void;
  onFund: (cycle: ClearingCycleRecord, amount: bigint) => void;
  onSettle: () => void;
  onDefault: () => void;
}) {
  const now = Date.now() / 1_000;
  const position = account ? cycle.positions[account.toLowerCase()] ?? 0n : 0n;
  const funded = account ? cycle.funding[account.toLowerCase()] ?? 0n : 0n;
  const canClose =
    cycle.status === "Collecting evidence" &&
    (cycle.finalizedCount === cycle.obligations.length ||
      now > cycle.evidenceDeadline);
  const canSettle =
    cycle.status === "Funding net positions" &&
    cycle.fundedNet === cycle.totalNetDebit;
  const canDefault =
    cycle.status === "Funding net positions" &&
    now > cycle.fundingDeadline &&
    cycle.fundedNet < cycle.totalNetDebit;
  const metrics = advancedMode
    ? [
        ["Gross obligations", formatClearingUsdc(cycle.totalGross)],
        ["Cleared gross", formatClearingUsdc(cycle.clearedGross)],
        ["Net required", formatClearingUsdc(cycle.totalNetDebit)],
        ["Liquidity saved", formatClearingUsdc(clearingSavings(cycle))],
      ]
    : [
        ["Payments recorded", formatClearingUsdc(cycle.totalGross)],
        [
          "Final USDC needed",
          cycle.status === "Collecting evidence"
            ? "Pending review"
            : formatClearingUsdc(cycle.totalNetDebit),
        ],
        [
          "USDC movement avoided",
          cycle.status === "Collecting evidence"
            ? "Pending review"
            : formatClearingUsdc(clearingSavings(cycle)),
        ],
      ];
  return (
    <div>
      <div className="border-b border-white/[0.09] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-blue-300">
              Settlement room #{cycle.id.toString()}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              {cycle.metadata?.name ?? `Settlement room ${cycle.id}`}
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-white/42">
              {cycle.metadata?.description ??
                "The financial state remains publicly verifiable even though its plain-language description is unavailable."}
            </p>
          </div>
          <Status value={friendlyCycleStatus(cycle.status, advancedMode)} />
        </div>
        <NextActionPanel
          cycle={cycle}
          account={account}
          canClose={canClose}
          canSettle={canSettle}
        />
        <div
          className={`mt-6 grid gap-px bg-white/[0.08] ${
            advancedMode ? "sm:grid-cols-4" : "sm:grid-cols-3"
          }`}
        >
          {metrics.map(([label, value]) => (
            <div key={label} className="bg-[#080d13] p-4">
              <p className="font-mono text-[8px] uppercase text-white/28">
                {label}
              </p>
              <strong className="mt-2 block text-[13px]">{value}</strong>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-white/35">
          <span>Work proof due: {formatDeadline(cycle.evidenceDeadline)}</span>
          <span>
            Final payment due: {formatDeadline(cycle.fundingDeadline)}
          </span>
          {advancedMode ? (
            <>
              <span>
                Review quorum: {cycle.verifierThreshold}/
                {cycle.verifiers.length}
              </span>
              <span>
                Finalized: {cycle.finalizedCount}/{cycle.obligations.length}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <InvitePanel cycle={cycle} account={account} labelFor={labelFor} />
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">
              Payment commitments
            </p>
            <h3 className="mt-1 text-lg font-semibold">Work review</h3>
          </div>
          <Vote className="h-5 w-5 text-white/25" />
        </div>
        <div className="mt-5 space-y-4">
          {cycle.obligations.map((obligation) => {
            const provider = sameAddress(account, obligation.provider);
            const verifier = Boolean(
              account &&
                cycle.verifiers.some((wallet) => sameAddress(wallet, account))
            );
            const arbitrator = sameAddress(account, cycle.arbitrator);
            return (
              <article
                key={obligation.id.toString()}
                className="border border-white/[0.1] bg-white/[0.015] p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-blue-300">
                        PAY-{obligation.id.toString().padStart(2, "0")}
                      </span>
                      <Status
                        value={friendlyObligationStatus(
                          obligation.status,
                          advancedMode
                        )}
                      />
                    </div>
                    <h4 className="mt-3 text-[15px] font-semibold">
                      {obligation.title}
                    </h4>
                    <p className="mt-2 max-w-2xl text-[12px] leading-5 text-white/40">
                      {obligation.acceptance}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <strong className="font-mono text-sm">
                      {formatClearingUsdc(obligation.amount)}
                    </strong>
                    <p className="mt-1 text-[10px] text-amber-200/55">
                      Provider guarantee{" "}
                      {formatClearingUsdc(obligation.bondAmount)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 border-t border-white/[0.08] pt-4 text-[10px] text-white/35 sm:grid-cols-3">
                  <span>Customer · {labelFor(cycle, obligation.payer)}</span>
                  <span>Provider · {labelFor(cycle, obligation.provider)}</span>
                  <span>
                    Reviews · {obligation.approveVotes} approve /{" "}
                    {obligation.rejectVotes} reject
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {provider && obligation.status === "Bond required" ? (
                    <Action
                      onClick={() => onPostBond(cycle, obligation)}
                      disabled={busy}
                      icon={ShieldCheck}
                    >
                      Add provider guarantee
                    </Action>
                  ) : null}
                  {provider && obligation.status === "Evidence required" ? (
                    <Action
                      onClick={() => onEvidence(obligation)}
                      disabled={busy}
                      icon={FileCheck2}
                    >
                      Submit proof of work
                    </Action>
                  ) : null}
                  {verifier && obligation.status === "Verification" ? (
                    <>
                      <Action
                        onClick={() => onVote(obligation, true)}
                        disabled={busy}
                        icon={Check}
                      >
                        Approve work
                      </Action>
                      <Action
                        onClick={() => onVote(obligation, false)}
                        disabled={busy}
                        icon={X}
                        danger
                      >
                        Reject work
                      </Action>
                    </>
                  ) : null}
                  {arbitrator && obligation.status === "Verification" ? (
                    <>
                      <Action
                        onClick={() => onResolve(obligation, true)}
                        disabled={busy}
                        icon={Gavel}
                      >
                        Resolve as approved
                      </Action>
                      <Action
                        onClick={() => onResolve(obligation, false)}
                        disabled={busy}
                        icon={Gavel}
                        danger
                      >
                        Resolve as rejected
                      </Action>
                    </>
                  ) : null}
                  {obligation.evidenceHash !== `0x${"0".repeat(64)}` ? (
                    <a
                      href={`/api/clearing/evidence?hash=${obligation.evidenceHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-9 items-center gap-2 border border-white/[0.1] px-3 text-[11px] text-white/55"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View proof
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-6 border border-white/[0.1] bg-[#060b10] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">
                Your final balance
              </p>
              <div className="mt-2 flex items-center gap-2">
                {position < 0n ? (
                  <ArrowUpRight className="h-4 w-4 text-rose-300" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4 text-emerald-300" />
                )}
                <strong className="text-lg">
                  {cycle.status === "Collecting evidence"
                    ? "Not calculated"
                    : position === 0n
                    ? "0 USDC"
                    : formatClearingUsdc(position < 0n ? -position : position)}
                </strong>
                {cycle.status !== "Collecting evidence" ? (
                  <span className="text-[11px] text-white/35">
                    {position < 0n
                      ? "to pay"
                      : position > 0n
                      ? "to receive"
                      : "nothing to move"}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canClose ? (
                <Action onClick={onClose} disabled={busy} icon={Network}>
                  Calculate final balances
                </Action>
              ) : null}
              {cycle.status === "Funding net positions" &&
              position < 0n &&
              funded === 0n ? (
                <Action
                  onClick={() => onFund(cycle, -position)}
                  disabled={busy}
                  icon={CircleDollarSign}
                >
                  Pay final difference · {formatClearingUsdc(-position)}
                </Action>
              ) : null}
              {canSettle ? (
                <Action onClick={onSettle} disabled={busy} icon={Network}>
                  Complete settlement
                </Action>
              ) : null}
              {canDefault ? (
                <Action
                  onClick={onDefault}
                  disabled={busy}
                  icon={AlertTriangle}
                  danger
                >
                  Close after missed payment
                </Action>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextActionPanel({
  cycle,
  account,
  canClose,
  canSettle,
}: {
  cycle: ClearingCycleRecord;
  account?: Address;
  canClose: boolean;
  canSettle: boolean;
}) {
  const position = account ? cycle.positions[account.toLowerCase()] ?? 0n : 0n;
  const funded = account ? cycle.funding[account.toLowerCase()] ?? 0n : 0n;
  const providerWork = account
    ? cycle.obligations.find(
        (item) =>
          sameAddress(account, item.provider) &&
          (item.status === "Bond required" ||
            item.status === "Evidence required")
      )
    : undefined;
  const reviewer = Boolean(
    account && cycle.verifiers.some((wallet) => sameAddress(wallet, account))
  );
  const reviewReady =
    reviewer &&
    cycle.obligations.some((item) => item.status === "Verification");
  const arbitrator = sameAddress(account, cycle.arbitrator);
  let title = "No action needed yet";
  let text =
    "This room is waiting for another participant. You can safely leave and return from the same room link.";

  if (cycle.status === "Settled") {
    title = "Settlement complete";
    text =
      "Final USDC payments were completed on Arc. The room remains available as a public receipt.";
  } else if (cycle.status === "Defaulted") {
    title = "Room closed after a missed payment";
    text =
      "The funding deadline passed before every final balance was paid. The result is recorded onchain.";
  } else if (!account) {
    title = "Connect your assigned wallet";
    text =
      "Anyone can inspect this room. Connect the wallet from your invitation to take its assigned action.";
  } else if (providerWork?.status === "Bond required") {
    title = "Add your provider guarantee";
    text =
      "Lock the displayed testnet USDC guarantee to show that your delivery commitment is backed.";
  } else if (providerWork?.status === "Evidence required") {
    title = "Submit proof of completed work";
    text =
      "Add a public URL, content hash, deployment ID, or short delivery statement for independent review.";
  } else if (reviewReady) {
    title = "Review the submitted work";
    text =
      "Compare the proof with its acceptance rule, then approve or reject it independently.";
  } else if (
    arbitrator &&
    cycle.obligations.some((item) => item.status === "Verification")
  ) {
    title = "Monitor unresolved reviews";
    text =
      "You are the independent resolver. Intervene only when the reviewer outcome needs a final decision.";
  } else if (canClose) {
    title = "Calculate everyone’s final balance";
    text =
      "All work is finalized. Calculate the smallest set of USDC payments required to settle the room.";
  } else if (
    cycle.status === "Funding net positions" &&
    position < 0n &&
    funded === 0n
  ) {
    title = "Pay your final difference";
    text = `Your wallet owes ${formatClearingUsdc(
      -position
    )} after all approved payments cancel each other out.`;
  } else if (canSettle) {
    title = "Complete the settlement";
    text =
      "Every required final payment is funded. Submit the final transaction to distribute USDC.";
  }

  return (
    <section className="mt-6 flex gap-4 border border-blue-400/20 bg-blue-500/[0.07] p-4 sm:p-5">
      <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-blue-300">
          Your next action
        </p>
        <h3 className="mt-1 text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-[11px] leading-5 text-white/45">{text}</p>
      </div>
    </section>
  );
}

function InvitePanel({
  cycle,
  account,
  labelFor,
}: {
  cycle: ClearingCycleRecord;
  account?: Address;
  labelFor: (cycle: ClearingCycleRecord, wallet: Address) => string;
}) {
  const [copied, setCopied] = useState<string>();
  const creator = sameAddress(account, cycle.creator);
  const roleInvites: Array<{
    key: string;
    label: string;
    role: ClearingInviteRole;
    wallet: Address;
  }> = [
    ...cycle.participants.map((wallet) => ({
      key: `participant-${wallet}`,
      label: labelFor(cycle, wallet),
      role: "participant" as const,
      wallet,
    })),
    ...cycle.verifiers.map((wallet) => ({
      key: `verifier-${wallet}`,
      label: labelFor(cycle, wallet),
      role: "verifier" as const,
      wallet,
    })),
    {
      key: `arbitrator-${cycle.arbitrator}`,
      label: "Independent arbitrator",
      role: "arbitrator",
      wallet: cycle.arbitrator,
    },
  ];

  async function copyPath(path: string, key: string) {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(key);
  }

  return (
    <section className="border-b border-white/[0.09] bg-blue-500/[0.025] p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-300">
            <Link2 className="h-4 w-4" />
            <p className="font-mono text-[9px] uppercase tracking-[0.14em]">
              Invite people
            </p>
          </div>
          <h3 className="mt-2 text-base font-semibold">
            Everyone returns to the same live room.
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-white/38">
            People can read the public terms first, then connect the wallet
            assigned to them.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            void copyPath(`/dashboard?cycle=${cycle.id.toString()}`, "room")
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 border border-blue-400/20 bg-blue-500/[0.08] px-4 text-[11px] font-semibold text-blue-200"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied === "room" ? "Room link copied" : "Copy room link"}
        </button>
      </div>
      {creator ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {roleInvites.map((invite) => (
            <button
              key={invite.key}
              type="button"
              onClick={() =>
                void copyPath(
                  buildClearingInvitePath(cycle.id, invite.role, invite.wallet),
                  invite.key
                )
              }
              className="flex min-h-11 items-center justify-between gap-3 border border-white/[0.08] bg-black/15 px-3 text-left hover:border-blue-400/25"
            >
              <span>
                <span className="block text-[11px] font-semibold text-white/70">
                  {invite.label}
                </span>
                <span className="mt-0.5 block font-mono text-[9px] text-white/28">
                  {invite.role === "participant"
                    ? "payment participant"
                    : invite.role === "verifier"
                    ? "independent reviewer"
                    : "dispute resolver"}{" "}
                  · {shortWallet(invite.wallet)}
                </span>
              </span>
              <span className="text-[9px] font-semibold text-blue-300">
                {copied === invite.key ? "Copied" : "Copy invite"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[10px] text-white/28">
          Personal invite links are available to the room creator.
        </p>
      )}
    </section>
  );
}

function EvidenceModal({
  target,
  busy,
  onClose,
  onSubmit,
}: {
  target?: { cycle: ClearingCycleRecord; obligation: ClearingObligationRecord };
  busy: boolean;
  onClose: () => void;
  onSubmit: (reference: string, files: readonly File[]) => Promise<void>;
}) {
  const [reference, setReference] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>();
  const targetKey = target
    ? `${target.cycle.id.toString()}:${target.obligation.id.toString()}`
    : "";

  useEffect(() => {
    setReference("");
    setFiles([]);
    setFileError(undefined);
  }, [targetKey]);

  function selectFiles(nextFiles: File[]) {
    if (nextFiles.length > CLEARING_EVIDENCE_MAX_ATTACHMENTS) {
      setFileError(
        `Attach no more than ${CLEARING_EVIDENCE_MAX_ATTACHMENTS} files.`
      );
      return;
    }
    if (
      nextFiles.some(
        (file) =>
          !CLEARING_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.includes(
            file.type as ClearingEvidenceAttachment["contentType"]
          ) || file.size > CLEARING_EVIDENCE_MAX_ATTACHMENT_BYTES
      )
    ) {
      setFileError(
        `Use PDF, PNG, JPEG, or TXT files smaller than ${Math.floor(
          CLEARING_EVIDENCE_MAX_ATTACHMENT_BYTES / 1_000
        )} KB each.`
      );
      return;
    }
    if (
      nextFiles.reduce((sum, file) => sum + file.size, 0) >
      CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES
    ) {
      setFileError(
        `Attachments must total less than ${Math.floor(
          CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES / 1_000
        )} KB.`
      );
      return;
    }
    setFiles(nextFiles);
    setFileError(undefined);
  }

  if (!target) return null;
  return (
    <div
      className="t-modal-overlay is-open fixed inset-0 z-[95] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(reference, files);
        }}
        className="t-modal is-open max-h-[90dvh] w-full max-w-[620px] overflow-y-auto border border-white/[0.14] bg-[#090f16] p-6"
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-blue-300">
          Proof of work · Room {target.cycle.id.toString()}
        </p>
        <h2 className="mt-3 text-xl font-semibold">
          {target.obligation.title}
        </h2>
        <p className="mt-2 text-[12px] leading-5 text-white/40">
          Add a delivery note and optionally attach a small invoice, receipt, or
          output file. File fingerprints become part of the signed evidence hash
          recorded on Arc.
        </p>
        <textarea
          autoFocus
          required
          maxLength={1000}
          rows={6}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Public URL, content hash, deployment ID, or a concise delivery statement…"
          className="cd-input mt-5 resize-none"
        />
        <section className="mt-4 border border-white/[0.1] bg-white/[0.025] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold text-white/75">
                Attach supporting files
              </p>
              <p className="mt-1 text-[10px] leading-4 text-white/35">
                Optional · up to {CLEARING_EVIDENCE_MAX_ATTACHMENTS} public
                files ·{" "}
                {Math.floor(
                  CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES / 1_000
                )}{" "}
                KB total
              </p>
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center border border-blue-400/20 bg-blue-500/[0.08] px-4 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/[0.14]">
              Choose files
              <input
                type="file"
                multiple
                accept={CLEARING_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.join(",")}
                className="sr-only"
                onChange={(event) =>
                  selectFiles(Array.from(event.target.files ?? []))
                }
              />
            </label>
          </div>
          {files.length ? (
            <ul className="mt-4 space-y-2">
              {files.map((file) => (
                <li
                  key={`${file.name}:${file.size}`}
                  className="flex items-center justify-between gap-3 border-t border-white/[0.08] pt-2 text-[10px]"
                >
                  <span className="truncate text-white/60">{file.name}</span>
                  <span className="shrink-0 font-mono text-white/30">
                    {(file.size / 1_000).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {fileError ? (
            <p className="mt-3 text-[10px] leading-4 text-rose-300">
              {fileError}
            </p>
          ) : null}
        </section>
        <p className="mt-3 text-[10px] leading-4 text-amber-200/55">
          Public Testnet evidence: do not upload personal data, bank details,
          confidential invoices, or production secrets.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-10 border border-white/[0.12] px-4 text-[12px] text-white/55"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !reference.trim() || Boolean(fileError)}
            className="min-h-10 bg-blue-600 px-5 text-[12px] font-semibold disabled:opacity-40"
          >
            {busy ? "Waiting…" : "Sign & submit proof"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Action({
  children,
  icon: Icon,
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
      className={`inline-flex min-h-9 items-center gap-2 border px-3 text-[11px] font-semibold disabled:opacity-35 ${
        danger
          ? "border-rose-400/20 bg-rose-400/[0.05] text-rose-200"
          : "border-blue-400/20 bg-blue-500/[0.08] text-blue-200"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
function Status({ value }: { value: string }) {
  const good = ["Passed", "Settled", "Approved", "Complete"].includes(value);
  const bad = ["Failed", "Defaulted", "Rejected", "Payment missed"].includes(
    value
  );
  return (
    <span
      className={`inline-flex border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${
        good
          ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
          : bad
          ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-300"
          : "border-blue-400/20 bg-blue-400/[0.06] text-blue-300"
      }`}
    >
      {value}
    </span>
  );
}
function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "error" | "warning" | "info";
}) {
  return (
    <div
      className={`mx-auto mt-5 max-w-[1410px] border px-4 py-3 text-[12px] ${
        tone === "error"
          ? "border-rose-400/25 bg-rose-400/[0.06] text-rose-200"
          : tone === "warning"
          ? "border-amber-300/20 bg-amber-300/[0.05] text-amber-100"
          : "border-blue-400/20 bg-blue-400/[0.05] text-blue-100"
      }`}
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
    <div className="grid min-h-[220px] place-items-center p-8 text-center">
      <div>
        <Icon
          className={`mx-auto h-6 w-6 text-white/25 ${
            spin ? "animate-spin" : ""
          }`}
        />
        <h3 className="mt-4 text-sm font-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-xs text-[11px] leading-5 text-white/35">
          {text}
        </p>
      </div>
    </div>
  );
}
