"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  LoaderCircle,
  Menu,
  Paperclip,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  erc20Abi,
  formatUnits,
  parseEventLogs,
  parseUnits,
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
  CreateDealModal,
  type CreateDealInput,
} from "@/components/cleardeal/CreateDealModal";
import { ClearDealBrand } from "@/components/cleardeal/ClearDealBrand";
import { CrosschainFundingModal } from "@/components/cleardeal/CrosschainFundingModal";
import { WalletDirectoryModal } from "@/components/treasury/WalletDirectoryModal";
import { WalletButton } from "@/components/WalletButton";
import { arcTestnet } from "@/config/chain";
import { useClearDeals } from "@/hooks/use-clear-deals";
import { useDealActivity } from "@/hooks/use-deal-activity";
import { useWalletDirectory } from "@/hooks/use-wallet-directory";
import {
  clearDealEscrowAbi,
  clearDealEscrowAddress,
  clearDealEscrowConfigured,
  clearDealUsdcAddress,
} from "@/lib/cleardeal-contract";
import {
  escrowBalance,
  formatDate,
  formatUsdc,
  shortAddress,
  type ClearDealMilestone,
  type ClearDealRecord,
} from "@/lib/cleardeal-data";
import {
  buildStoreClearDealEvidenceMessage,
  CLEARDEAL_EVIDENCE_ALLOWED_ATTACHMENT_TYPES,
  CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS,
  CLEARDEAL_EVIDENCE_MAX_ATTACHMENT_BYTES,
  CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES,
  hashClearDealEvidence,
  type ClearDealEvidence,
  type ClearDealEvidenceAttachment,
  type ClearDealEvidenceAttachmentPayload,
  type StoreClearDealEvidenceAuthorization,
} from "@/lib/cleardeal-evidence";
import {
  buildStoreDealMetadataMessage,
  hashDealMetadata,
  type ClearDealMetadata,
  type StoreDealMetadataAuthorization,
} from "@/lib/cleardeal-metadata";

const EXPLORER = "https://testnet.arcscan.app";
const DEMO_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;
const DEMO_TEAM = "0x2222222222222222222222222222222222222222" as Address;
const DEMO_HELPER = "0x3333333333333333333333333333333333333333" as Address;

const demoProject: ClearDealRecord = {
  id: -1n,
  client: "Northstar Studio",
  team: "Saigon Digital",
  title: "Vietnam website launch",
  buyer: DEMO_ADDRESS,
  seller: DEMO_TEAM,
  arbitrator: DEMO_HELPER,
  totalAmount: 1_000_000_000n,
  releasedAmount: 200_000_000n,
  metadataHash: `0x${"1".repeat(64)}`,
  createdAt: Math.floor(Date.now() / 1_000) - 604_800,
  refundDeadline: Math.floor(Date.now() / 1_000) + 2_592_000,
  refundRequested: false,
  status: "In progress",
  metadataAvailable: true,
  milestones: [
    {
      id: 0n,
      title: "Brand design",
      recipient: DEMO_TEAM,
      amount: 200_000_000n,
      dueAt: Math.floor(Date.now() / 1_000) - 172_800,
      deliverableHash: `0x${"a".repeat(64)}`,
      status: "Released",
    },
    {
      id: 1n,
      title: "Website build",
      recipient: DEMO_TEAM,
      amount: 500_000_000n,
      dueAt: Math.floor(Date.now() / 1_000) + 432_000,
      deliverableHash: `0x${"b".repeat(64)}`,
      status: "Ready for approval",
    },
    {
      id: 2n,
      title: "Source handoff",
      recipient: DEMO_TEAM,
      amount: 300_000_000n,
      dueAt: Math.floor(Date.now() / 1_000) + 1_209_600,
      deliverableHash: `0x${"0".repeat(64)}`,
      status: "Pending",
    },
  ],
};

interface TransactionState {
  status: "pending" | "confirmed" | "error";
  message: string;
  hash?: Hash;
}

function sameAddress(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16_384) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16_384));
  }
  return window.btoa(binary);
}

async function prepareEvidenceAttachments(files: readonly File[]) {
  if (files.length > CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS) {
    throw new Error(`Attach no more than ${CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS} files.`);
  }
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES) {
    throw new Error("Attachments must total less than 2 MB.");
  }
  const descriptors: ClearDealEvidenceAttachment[] = [];
  const payloads: ClearDealEvidenceAttachmentPayload[] = [];
  for (const file of files) {
    if (
      !CLEARDEAL_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.includes(
        file.type as ClearDealEvidenceAttachment["contentType"],
      )
    ) {
      throw new Error(`${file.name} is not a supported PDF, PNG, JPEG, or text file.`);
    }
    if (file.size < 1 || file.size > CLEARDEAL_EVIDENCE_MAX_ATTACHMENT_BYTES) {
      throw new Error(`${file.name} must be smaller than 1 MB.`);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const sha256 = `0x${Array.from(digest, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")}` as Hash;
    descriptors.push({
      name: file.name,
      contentType: file.type as ClearDealEvidenceAttachment["contentType"],
      size: file.size,
      sha256,
    });
    payloads.push({ sha256, dataBase64: bytesToBase64(bytes) });
  }
  return { descriptors, payloads };
}

export function ProjectDashboardClient() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const { deals, loading, error, refresh } = useClearDeals(address);
  const directory = useWalletDirectory();
  const [selectedId, setSelectedId] = useState<bigint>();
  const [createOpen, setCreateOpen] = useState(false);
  const [crosschainOpen, setCrosschainOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>();
  const [evidenceTarget, setEvidenceTarget] = useState<{
    deal: ClearDealRecord;
    milestone: ClearDealMilestone;
  }>();
  const [evidenceReference, setEvidenceReference] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!deals.length) return setSelectedId(undefined);
    if (selectedId === undefined || !deals.some((deal) => deal.id === selectedId)) {
      setSelectedId(deals[0].id);
    }
  }, [deals, selectedId]);

  const liveSelected =
    deals.find((deal) => deal.id === selectedId) ?? deals[0];
  const selected = liveSelected ?? demoProject;
  const isDemo = selected.id === -1n;
  const {
    activity,
    loading: activityLoading,
  } = useDealActivity(isDemo ? undefined : selected.id, transaction?.hash);

  const activeMilestone =
    selected.milestones.find((milestone) => milestone.status === "Ready for approval") ??
    selected.milestones.find((milestone) => milestone.status === "Pending") ??
    selected.milestones.at(-1);
  const activeEvidence = activeMilestone
    ? activity.find(
        (item) =>
          item.evidence?.evidence.kind === "milestone_submission" &&
          item.evidence.evidence.milestoneId === activeMilestone.id.toString(),
      )?.evidence
    : undefined;
  const paid = selected.releasedAmount;
  const held = escrowBalance(selected);
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;
  const disabledReason = !isConnected
    ? "Sign in first."
    : wrongNetwork
      ? "Switch to Arc Testnet first."
      : !clearDealEscrowConfigured
        ? "The ClearDeal project contract is not configured."
        : undefined;
  const role = isDemo
    ? "Demo"
    : sameAddress(address, selected.buyer)
      ? "Client"
      : sameAddress(address, selected.seller)
        ? "Team"
        : sameAddress(address, selected.arbitrator)
          ? "Dispute helper"
          : "Viewer";

  const labelFor = (wallet: Address, fallback: string) =>
    directory.entries.find((entry) => sameAddress(entry.address, wallet))?.name ??
    fallback;

  async function requireReady() {
    if (!address || !publicClient || !clearDealEscrowAddress) {
      throw new Error("Sign in and configure the ClearDeal contract first.");
    }
    if (chainId !== arcTestnet.id) {
      await switchChainAsync({ chainId: arcTestnet.id });
    }
    return { address, publicClient, contract: clearDealEscrowAddress };
  }

  async function waitFor(hash: Hash, message: string, refreshAfter = true) {
    if (!publicClient) throw new Error("Arc is temporarily unavailable.");
    setTransaction({ status: "pending", message, hash });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("The Arc transaction did not complete.");
    setTransaction({ status: "confirmed", message: `${message} confirmed.`, hash });
    if (refreshAfter) await refresh();
    return receipt;
  }

  async function runAction(action: () => Promise<Hash>, message: string) {
    setBusy(true);
    setTransaction({ status: "pending", message: `Confirm ${message.toLowerCase()} in your wallet.` });
    try {
      await waitFor(await action(), message);
    } catch (cause) {
      setTransaction({
        status: "error",
        message: cause instanceof Error ? cause.message : `${message} failed.`,
      });
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
    const hash = await writeContractAsync({
      address: clearDealUsdcAddress,
      abi: erc20Abi,
      chainId: arcTestnet.id,
      functionName: "approve",
      args: [ready.contract, amount],
    });
    await waitFor(hash, "USDC approval", false);
  }

  async function createProject(input: CreateDealInput) {
    const ready = await requireReady();
    setBusy(true);
    try {
      const metadata: ClearDealMetadata = {
        version: 1,
        client: input.client,
        team: input.team,
        title: input.title,
        milestones: input.milestones.map(({ title, dueDate }) => ({ title, dueDate })),
      };
      const metadataHash = hashDealMetadata(metadata);
      const authorization: StoreDealMetadataAuthorization = {
        ownerAddress: ready.address,
        metadataHash,
        requestId: crypto.randomUUID(),
        issuedAt: Date.now(),
      };
      setTransaction({
        status: "pending",
        message: "Sign the project description. This does not move USDC.",
      });
      const signature = await signMessageAsync({
        message: buildStoreDealMetadataMessage(authorization),
      });
      const response = await fetch("/api/deals/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authorization, metadata, signature }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "The project description could not be stored.");
      }
      const hash = await writeContractAsync({
        address: ready.contract,
        abi: clearDealEscrowAbi,
        chainId: arcTestnet.id,
        functionName: "createDeal",
        args: [
          input.seller,
          input.arbitrator,
          metadataHash,
          BigInt(Math.floor(Date.parse(`${input.refundDeadline}T23:59:59Z`) / 1_000)),
          input.milestones.map(() => input.seller),
          input.milestones.map((milestone) => parseUnits(milestone.amount, 6)),
          input.milestones.map((milestone) =>
            BigInt(Math.floor(Date.parse(`${milestone.dueDate}T23:59:59Z`) / 1_000)),
          ),
        ],
      });
      const receipt = await waitFor(hash, "Project creation");
      const created = parseEventLogs({
        abi: clearDealEscrowAbi,
        logs: receipt.logs,
        eventName: "DealCreated",
        strict: false,
      })[0];
      if (typeof created?.args.dealId === "bigint") {
        setSelectedId(created.args.dealId);
      }
    } catch (cause) {
      setTransaction({
        status: "error",
        message: cause instanceof Error ? cause.message : "Project creation failed.",
      });
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function fundProject(deal: ClearDealRecord) {
    try {
      await ensureAllowance(deal.totalAmount);
      await runAction(async () => {
        const ready = await requireReady();
        return writeContractAsync({
          address: ready.contract,
          abi: clearDealEscrowAbi,
          chainId: arcTestnet.id,
          functionName: "fundDeal",
          args: [deal.id],
        });
      }, `deposit ${formatUsdc(deal.totalAmount)}`);
    } catch (cause) {
      setTransaction({
        status: "error",
        message: cause instanceof Error ? cause.message : "USDC deposit failed.",
      });
    }
  }

  async function releaseMilestone(deal: ClearDealRecord, milestone: ClearDealMilestone) {
    await runAction(async () => {
      const ready = await requireReady();
      return writeContractAsync({
        address: ready.contract,
        abi: clearDealEscrowAbi,
        chainId: arcTestnet.id,
        functionName: "releaseMilestone",
        args: [deal.id, milestone.id],
      });
    }, `approve and release ${formatUsdc(milestone.amount)}`);
  }

  async function requestRefund(deal: ClearDealRecord) {
    await runAction(async () => {
      const ready = await requireReady();
      return writeContractAsync({
        address: ready.contract,
        abi: clearDealEscrowAbi,
        chainId: arcTestnet.id,
        functionName: "requestRefund",
        args: [deal.id],
      });
    }, "refund request");
  }

  async function submitDelivery() {
    if (!evidenceTarget) return;
    const ready = await requireReady();
    setBusy(true);
    try {
      const { descriptors, payloads } = await prepareEvidenceAttachments(evidenceFiles);
      const evidence: ClearDealEvidence = {
        version: 1,
        kind: "milestone_submission",
        dealId: evidenceTarget.deal.id.toString(),
        milestoneId: evidenceTarget.milestone.id.toString(),
        reference: evidenceReference.trim(),
        submittedAt: Date.now(),
        ...(descriptors.length ? { attachments: descriptors } : {}),
      };
      if (!evidence.reference) throw new Error("Describe what was delivered.");
      const evidenceHash = hashClearDealEvidence(evidence);
      const authorization: StoreClearDealEvidenceAuthorization = {
        signerAddress: ready.address,
        evidenceHash,
        dealId: evidence.dealId,
        kind: evidence.kind,
        milestoneId: evidence.milestoneId,
        requestId: crypto.randomUUID(),
        issuedAt: Date.now(),
      };
      setTransaction({
        status: "pending",
        message: "Sign the delivery note. This does not move USDC.",
      });
      const signature = await signMessageAsync({
        message: buildStoreClearDealEvidenceMessage(authorization),
      });
      const response = await fetch("/api/deals/evidence", {
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
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "The delivery proof could not be stored.");
      }
      await waitFor(
        await writeContractAsync({
          address: ready.contract,
          abi: clearDealEscrowAbi,
          chainId: arcTestnet.id,
          functionName: "submitMilestone",
          args: [evidenceTarget.deal.id, evidenceTarget.milestone.id, evidenceHash],
        }),
        "Delivery submission",
      );
      setEvidenceTarget(undefined);
      setEvidenceReference("");
      setEvidenceFiles([]);
    } catch (cause) {
      setTransaction({
        status: "error",
        message: cause instanceof Error ? cause.message : "Delivery submission failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  const projectRows = liveSelected ? deals : [demoProject];

  return (
    <main className="cleardeal-app min-h-[100dvh] bg-[#fffcf0] text-[#2b2118]">
      <header className="sticky top-0 z-50 border-b border-[#ded5c6] bg-[#fffcf0]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1580px] items-center justify-between px-4 sm:px-7">
          <ClearDealBrand />
          <nav className="hidden h-full items-center gap-8 lg:flex" aria-label="Project navigation">
            <Link href="/dashboard" className="relative grid h-full place-items-center text-[13px] font-semibold">
              Projects
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#c88400]" />
            </Link>
            <Link href="/how-it-works" className="text-[13px] text-[#766b5d] hover:text-[#2b2118]">
              How it works
            </Link>
            <button
              type="button"
              onClick={() => setDirectoryOpen(true)}
              className="text-[13px] text-[#766b5d] hover:text-[#2b2118]"
            >
              Wallet contacts
            </button>
            <Link href="/docs" className="text-[13px] text-[#766b5d] hover:text-[#2b2118]">
              Docs
            </Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Arc Testnet
            </span>
            <WalletButton />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center border border-[#ded5c6] md:hidden"
            aria-label="Open navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen ? (
          <div className="grid gap-2 border-t border-[#ded5c6] bg-[#fffcf0] p-4 md:hidden">
            <Link href="/dashboard" className="px-3 py-2 text-sm font-semibold">Projects</Link>
            <Link href="/how-it-works" className="px-3 py-2 text-sm">How it works</Link>
            <button type="button" onClick={() => setDirectoryOpen(true)} className="px-3 py-2 text-left text-sm">Wallet contacts</button>
            <Link href="/docs" className="px-3 py-2 text-sm">Docs</Link>
            <div className="mt-2 border-t border-[#ded5c6] pt-4"><WalletButton /></div>
          </div>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-[1580px] lg:grid-cols-[310px_minmax(0,1fr)_330px]">
        <aside className="border-b border-[#ded5c6] lg:min-h-[calc(100dvh-78px)] lg:border-b-0 lg:border-r">
          <div className="p-5">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={Boolean(disabledReason)}
              className="inline-flex min-h-14 w-full items-center justify-center gap-3 bg-[#d58b00] px-5 text-[13px] font-semibold text-white hover:bg-[#bd7b00] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus className="h-5 w-5" />
              New project
            </button>
          </div>
          <div className="flex items-center justify-between border-y border-[#ded5c6] px-6 py-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">Projects</p>
              <strong className="mt-1 block text-[12px]">
                {liveSelected ? deals.length : "Demo project"}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="grid h-9 w-9 place-items-center border border-[#ded5c6] text-[#766b5d]"
              aria-label="Refresh projects"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="lg:max-h-[calc(100dvh-250px)] lg:overflow-y-auto">
            {projectRows.map((deal) => {
              const active = deal.id === selected.id;
              return (
                <button
                  key={deal.id.toString()}
                  type="button"
                  onClick={() => deal.id >= 0n && setSelectedId(deal.id)}
                  className={`flex w-full items-center gap-4 border-b border-[#ded5c6] px-5 py-5 text-left ${
                    active ? "border-l-[3px] border-l-[#d58b00] bg-[#fff2c9]" : "hover:bg-[#f7f4e9]"
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-[#ded5c6] bg-white">
                    <FolderKanban className="h-4 w-4 text-[#a66c00]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[13px]">{deal.title}</strong>
                    <span className="mt-1 block truncate text-[10px] text-[#766b5d]">{deal.team}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#766b5d]" />
                </button>
              );
            })}
          </div>
          {!isConnected ? (
            <p className="m-5 border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
              You are viewing a sample project. Sign in to create and run your own Arc Testnet project.
            </p>
          ) : error ? (
            <p className="m-5 border border-rose-200 bg-rose-50 p-4 text-[11px] leading-5 text-rose-700">{error}</p>
          ) : null}
        </aside>

        <section className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="border-b border-[#ded5c6] pb-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#a66c00]">
                  {isDemo ? "Sample project" : `CD-PROJECT-${selected.id.toString()}`}
                </p>
                <h1 className="mt-3 font-display text-4xl tracking-[-0.035em] sm:text-5xl">{selected.title}</h1>
              </div>
              {isDemo ? (
                <span className="w-fit border border-[#ded5c6] bg-white px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#766b5d]">
                  Read-only demo
                </span>
              ) : null}
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              <ProjectFact label="Client" value={labelFor(selected.buyer, selected.client)} />
              <ProjectFact label="Team" value={labelFor(selected.seller, selected.team)} />
              <ProjectFact label="Total" value={formatUsdc(selected.totalAmount)} strong />
            </div>
          </div>

          <p className="py-7 font-display text-2xl leading-tight text-[#382d22]">
            Funds are released only after each delivery is approved.
          </p>
          {isDemo ? (
            <p className="mb-7 border-l-2 border-[#d58b00] pl-4 text-[11px] leading-6 text-[#766b5d]">
              A direct transfer only sends money. ClearDeal first proves that the
              complete project budget is ready, then releases each agreed amount
              after the client accepts the matching delivery.
            </p>
          ) : null}

          <div className="grid gap-3 border-y border-[#ded5c6] py-7 md:grid-cols-3">
            {selected.milestones.map((milestone, index) => (
              <MilestoneStep
                key={milestone.id.toString()}
                milestone={milestone}
                number={index + 1}
                active={milestone.id === activeMilestone?.id}
              />
            ))}
          </div>

          {activeMilestone ? (
            <div className="mt-7 border border-[#d58b00] bg-white p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 border-b border-[#ded5c6] pb-5 sm:flex-row sm:items-start">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#a66c00]">
                    Current delivery
                  </p>
                  <h2 className="mt-2 font-display text-2xl">{activeMilestone.title}</h2>
                  <p className="mt-2 text-[12px] leading-5 text-[#766b5d]">
                    Due {formatDate(activeMilestone.dueAt)} · {formatUsdc(activeMilestone.amount)}
                  </p>
                </div>
                <span className="w-fit border border-[#e5c06d] bg-[#fff5d9] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a5900]">
                  {activeMilestone.status}
                </span>
              </div>

              {isDemo || activeEvidence ? (
                <div className="py-5">
                  <p className="text-[13px] font-semibold">Delivery from {selected.team}</p>
                  <p className="mt-2 text-[12px] leading-6 text-[#766b5d]">
                    {isDemo
                      ? "Complete responsive website with CMS, content pages, and contact form."
                      : activeEvidence?.evidence.reference}
                  </p>
                  <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">Attached files</p>
                  <div className="mt-2 divide-y divide-[#ded5c6] border border-[#ded5c6]">
                    {(isDemo
                      ? [
                          { name: "website-preview.png", size: 742_000, contentType: "image/png" },
                          { name: "deployment-guide.pdf", size: 315_000, contentType: "application/pdf" },
                        ]
                      : activeEvidence?.evidence.attachments ?? []
                    ).map((file, index) => (
                      <a
                        key={`${file.name}-${index}`}
                        href={
                          isDemo
                            ? undefined
                            : `/api/deals/evidence/attachment?hash=${activeMilestone.deliverableHash}&index=${index}`
                        }
                        className="flex items-center gap-3 px-4 py-3 text-[11px] hover:bg-[#f7f4e9]"
                      >
                        <FileText className="h-4 w-4 text-[#766b5d]" />
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                        <span className="font-mono text-[9px] text-[#766b5d]">{Math.ceil(file.size / 1_000)} KB</span>
                        <Download className="h-4 w-4 text-[#766b5d]" />
                      </a>
                    ))}
                    {!isDemo && !activeEvidence?.evidence.attachments?.length ? (
                      <p className="px-4 py-3 text-[11px] text-[#766b5d]">No file attached. Review the signed delivery note above.</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="grid min-h-40 place-items-center py-6 text-center">
                  <div>
                    <Upload className="mx-auto h-6 w-6 text-[#a66c00]" />
                    <p className="mt-3 text-[13px] font-semibold">
                      {activeMilestone.status === "Pending" ? "Waiting for the team to submit work" : "Loading delivery proof"}
                    </p>
                    <p className="mt-2 text-[11px] text-[#766b5d]">
                      The client pays only after this delivery is reviewed.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-[#ded5c6] pt-5 sm:flex-row">
                {isDemo ? (
                  <>
                    <button type="button" disabled className="min-h-12 flex-1 bg-[#d58b00] px-5 text-[13px] font-semibold text-white opacity-70">
                      Approve & release {formatUsdc(activeMilestone.amount)}
                    </button>
                    <button type="button" disabled className="min-h-12 flex-1 border border-[#766b5d] px-5 text-[13px] font-semibold opacity-60">
                      Sign in to try
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrosschainOpen(true)}
                      className="min-h-12 flex-1 border border-[#a66c00] px-5 text-[13px] font-semibold text-[#8c5a00] hover:bg-[#fff5d9]"
                    >
                      Preview crosschain funding
                    </button>
                  </>
                ) : selected.status === "Draft" && role === "Client" ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void fundProject(selected)}
                      className="min-h-12 flex-1 bg-[#d58b00] px-6 text-[13px] font-semibold text-white hover:bg-[#bd7b00] disabled:opacity-45"
                    >
                      Deposit from Arc
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setCrosschainOpen(true)}
                      className="min-h-12 flex-1 border border-[#a66c00] px-6 text-[13px] font-semibold text-[#8c5a00] hover:bg-[#fff5d9] disabled:opacity-45"
                    >
                      Bring USDC from another testnet
                    </button>
                  </>
                ) : activeMilestone.status === "Pending" && role === "Team" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEvidenceTarget({ deal: selected, milestone: activeMilestone });
                      setEvidenceReference("");
                      setEvidenceFiles([]);
                    }}
                    className="min-h-12 bg-[#d58b00] px-6 text-[13px] font-semibold text-white hover:bg-[#bd7b00] disabled:opacity-45"
                  >
                    Submit this delivery
                  </button>
                ) : activeMilestone.status === "Ready for approval" && role === "Client" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void releaseMilestone(selected, activeMilestone)}
                    className="min-h-12 bg-[#d58b00] px-6 text-[13px] font-semibold text-white hover:bg-[#bd7b00] disabled:opacity-45"
                  >
                    Approve & release {formatUsdc(activeMilestone.amount)}
                  </button>
                ) : (
                  <p className="flex min-h-12 items-center text-[12px] text-[#766b5d]">
                    {role === "Viewer"
                      ? "This wallet can view the project but has no action at this step."
                      : `Waiting for the ${activeMilestone.status === "Pending" ? "team" : "client"} at this step.`}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-8 border-t border-[#ded5c6] pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">Project history</p>
                <p className="mt-2 text-[11px] text-[#766b5d]">Every payment stays readable on Arc Testnet.</p>
              </div>
              {activityLoading ? <LoaderCircle className="h-4 w-4 animate-spin text-[#a66c00]" /> : null}
            </div>
            <div className="mt-4 divide-y divide-[#ded5c6] border-y border-[#ded5c6]">
              {(isDemo
                ? [
                    { key: "3", title: "Website build submitted", detail: "Delivery proof is waiting for client approval.", transactionHash: undefined },
                    { key: "2", title: "Brand design paid", detail: "200 USDC was released to Saigon Digital.", transactionHash: undefined },
                    { key: "1", title: "Project funded", detail: "1,000 USDC was deposited for the complete project.", transactionHash: undefined },
                  ]
                : activity
              ).slice(0, 5).map((item) => (
                <div key={item.key} className="flex items-start gap-3 py-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold">{item.title}</p>
                    <p className="mt-1 text-[10px] leading-5 text-[#766b5d]">{item.detail}</p>
                  </div>
                  {item.transactionHash ? (
                    <a href={`${EXPLORER}/tx/${item.transactionHash}`} target="_blank" rel="noreferrer" className="text-[#1f5ed3]">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="border-t border-[#ded5c6] lg:min-h-[calc(100dvh-78px)] lg:border-l lg:border-t-0">
          {isDemo ? (
            <div className="border-b border-[#ded5c6] bg-[#fff5d9] p-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#8c5a00]">
                Three-step demo story
              </p>
              <ol className="mt-5 space-y-4">
                <DemoStep
                  number="1"
                  title="Budget prepared"
                  text="The client deposited the complete 1,000 USDC before work started."
                />
                <DemoStep
                  number="2"
                  title="Work submitted"
                  text="The team attached the website delivery for the client to review."
                />
                <DemoStep
                  number="3"
                  title="Pay only this step"
                  text="Approval releases 500 USDC. The remaining 300 USDC stays protected."
                />
              </ol>
              <Link
                href="/how-it-works"
                className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold text-[#8c5a00]"
              >
                Open the complete workflow <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}
          <div className="border-b border-[#ded5c6] p-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">Money summary</p>
            <dl className="mt-7 space-y-6">
              <MoneyRow label="Client deposited" value={selected.status === "Draft" ? "Not yet" : formatUsdc(selected.totalAmount)} />
              <MoneyRow label="Paid" value={formatUsdc(paid)} positive />
              <MoneyRow label="Safely held" value={formatUsdc(held)} accent />
            </dl>
            <div className="mt-7 h-2 overflow-hidden bg-[#eee8dc]">
              <span
                className="block h-full bg-emerald-600"
                style={{ width: `${Math.round(Number((paid * 100n) / selected.totalAmount))}%` }}
              />
            </div>
          </div>

          <div className="border-b border-[#ded5c6] p-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">Built on Arc</p>
            <div className="mt-6 flex gap-4">
              <ShieldCheck className="h-8 w-8 shrink-0 text-[#1f5ed3]" strokeWidth={1.5} />
              <p className="text-[11px] leading-6 text-[#574c40]">
                USDC pays both the project and network fee. Approved payments confirm quickly so both sides can move forward.
              </p>
            </div>
            <a
              href={clearDealEscrowAddress ? `${EXPLORER}/address/${clearDealEscrowAddress}` : EXPLORER}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold text-[#1f5ed3]"
            >
              View contract on ArcScan <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="p-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#766b5d]">Your role</p>
            <p className="mt-3 text-[13px] font-semibold">{role}</p>
            {!isDemo ? <p className="mt-2 font-mono text-[9px] text-[#766b5d]">{address ? shortAddress(address) : "Not connected"}</p> : null}
            {!isDemo && role === "Client" && selected.status === "In progress" && !selected.refundRequested ? (
              <button
                type="button"
                onClick={() => void requestRefund(selected)}
                disabled={busy}
                className="mt-5 text-[10px] font-semibold text-rose-700 disabled:opacity-45"
              >
                Request return of unpaid funds
              </button>
            ) : selected.refundRequested ? (
              <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">
                The client requested a refund of funds that have not been paid.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {transaction ? (
        <div className={`fixed bottom-5 left-1/2 z-[90] flex w-[min(92vw,620px)] -translate-x-1/2 items-center gap-3 border px-4 py-3 shadow-xl ${
          transaction.status === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-[#e1c27e] bg-[#fff5d9] text-[#5f4309]"
        }`}>
          {transaction.status === "pending" ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : transaction.status === "confirmed" ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
          <p className="min-w-0 flex-1 text-[11px] leading-5">{transaction.message}</p>
          {transaction.hash ? (
            <a href={`${EXPLORER}/tx/${transaction.hash}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
          ) : null}
          <button type="button" onClick={() => setTransaction(undefined)} aria-label="Close message"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      <CreateDealModal
        open={createOpen}
        ownerAddress={address}
        disabledReason={disabledReason}
        busy={busy}
        onClose={() => setCreateOpen(false)}
        onCreate={createProject}
      />
      <CrosschainFundingModal
        open={crosschainOpen}
        defaultAmount={formatUnits(selected.totalAmount, 6)}
        onClose={() => setCrosschainOpen(false)}
      />
      <WalletDirectoryModal
        open={directoryOpen}
        entries={directory.entries}
        connectedAddress={address}
        onClose={() => setDirectoryOpen(false)}
        onSave={directory.saveEntry}
        onRemove={directory.removeEntry}
      />

      {evidenceTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Submit delivery">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitDelivery();
            }}
            className="w-full max-w-[620px] border border-[#ded5c6] bg-[#fffcf0] shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-[#ded5c6] p-6">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#a66c00]">Team delivery</p>
                <h2 className="mt-2 font-display text-3xl">{evidenceTarget.milestone.title}</h2>
                <p className="mt-2 text-[11px] text-[#766b5d]">Add a clear note and up to three sample files.</p>
              </div>
              <button type="button" onClick={() => setEvidenceTarget(undefined)} className="grid h-10 w-10 place-items-center border border-[#ded5c6]" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="grid gap-5 p-6">
              <label className="grid gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">What was delivered?</span>
                <textarea
                  required
                  maxLength={1_000}
                  rows={4}
                  value={evidenceReference}
                  onChange={(event) => setEvidenceReference(event.target.value)}
                  placeholder="The responsive website, CMS, and deployment guide are ready for review."
                  className="cd-input resize-y"
                />
              </label>
              <label className="grid cursor-pointer place-items-center border border-dashed border-[#cdbfaa] bg-[#f7f4e9] p-7 text-center">
                <Paperclip className="h-5 w-5 text-[#a66c00]" />
                <span className="mt-3 text-[12px] font-semibold">Attach PDF, PNG, JPEG, or text</span>
                <span className="mt-1 text-[9px] text-[#766b5d]">Up to 3 files, 1 MB each, 2 MB total</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
                  className="sr-only"
                  onChange={(event) => setEvidenceFiles(Array.from(event.target.files ?? []))}
                />
              </label>
              {evidenceFiles.length ? (
                <div className="divide-y divide-[#ded5c6] border border-[#ded5c6]">
                  {evidenceFiles.map((file) => (
                    <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 px-4 py-3 text-[11px]">
                      <FileText className="h-4 w-4 text-[#766b5d]" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="font-mono text-[9px] text-[#766b5d]">{Math.ceil(file.size / 1_000)} KB</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">
                Arc Testnet is public. Upload sample work only—never personal or confidential files.
              </p>
            </div>
            <footer className="flex justify-end gap-3 border-t border-[#ded5c6] p-6">
              <button type="button" onClick={() => setEvidenceTarget(undefined)} className="min-h-11 border border-[#ded5c6] px-5 text-[12px] font-semibold">Cancel</button>
              <button type="submit" disabled={busy || !evidenceReference.trim()} className="min-h-11 bg-[#d58b00] px-5 text-[12px] font-semibold text-white disabled:opacity-45">
                {busy ? "Waiting for wallet…" : "Sign & submit delivery"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function ProjectFact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 border-l border-[#ded5c6] pl-5">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">{label}</p>
      <p className={`mt-3 truncate ${strong ? "font-display text-2xl" : "text-[14px] font-semibold"}`}>{value}</p>
    </div>
  );
}

function DemoStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center border border-[#d58b00] bg-white font-mono text-[9px] text-[#8c5a00]">
        {number}
      </span>
      <div>
        <p className="text-[11px] font-semibold">{title}</p>
        <p className="mt-1 text-[10px] leading-5 text-[#766b5d]">{text}</p>
      </div>
    </li>
  );
}

function MoneyRow({ label, value, positive = false, accent = false }: { label: string; value: string; positive?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-display text-lg">{label}</dt>
      <dd className={`font-mono text-[11px] font-semibold ${positive ? "text-emerald-700" : accent ? "text-[#b16f00]" : ""}`}>{value}</dd>
    </div>
  );
}

function MilestoneStep({ milestone, number, active }: { milestone: ClearDealMilestone; number: number; active: boolean }) {
  const released = milestone.status === "Released";
  return (
    <div className={`relative min-w-0 px-4 py-3 text-center ${active ? "bg-[#fff7df]" : ""}`}>
      <span className={`mx-auto grid h-10 w-10 place-items-center rounded-full border font-display text-lg ${
        released ? "border-emerald-600 bg-emerald-600 text-white" : active ? "border-[#d58b00] bg-white text-[#7a4f00]" : "border-[#b7aa98] bg-white text-[#766b5d]"
      }`}>
        {released ? <Check className="h-5 w-5" /> : number}
      </span>
      <p className="mt-3 truncate font-display text-xl">{milestone.title}</p>
      <p className="mt-1 font-mono text-[10px]">{formatUsdc(milestone.amount)}</p>
      <span className={`mt-3 inline-flex border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] ${
        released ? "border-emerald-200 bg-emerald-50 text-emerald-700" : active ? "border-amber-300 bg-amber-50 text-amber-800" : "border-[#ded5c6] text-[#766b5d]"
      }`}>
        {released ? "Approved & paid" : milestone.status === "Ready for approval" ? "Waiting for client" : "Upcoming"}
      </span>
    </div>
  );
}
