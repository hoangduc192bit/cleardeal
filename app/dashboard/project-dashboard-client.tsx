"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Eye,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Scale,
  Upload,
  X,
} from "lucide-react";
import {
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  parseEventLogs,
  parseUnits,
  type Abi,
  type Address,
  type Hash,
  type Hex,
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
import { useCircleGoogleWallet } from "@/hooks/use-circle-google-wallet";
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
  executeCircleGoogleContract,
  signCircleGoogleMessage,
} from "@/lib/circle-google-client";
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
  buildAccessClearDealEvidenceMessage,
  CLEARDEAL_EVIDENCE_ALLOWED_ATTACHMENT_TYPES,
  CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS,
  CLEARDEAL_EVIDENCE_MAX_ATTACHMENT_BYTES,
  CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES,
  hashClearDealEvidence,
  type ClearDealEvidence,
  type ClearDealEvidenceAttachment,
  type ClearDealEvidenceAttachmentPayload,
  type StoreClearDealEvidenceAuthorization,
  type AccessClearDealEvidenceAuthorization,
} from "@/lib/cleardeal-evidence";
import {
  buildStoreDealMetadataMessage,
  hashDealMetadata,
  type ClearDealMetadata,
  type StoreDealMetadataAuthorization,
} from "@/lib/cleardeal-metadata";
import {
  hashNotificationContacts,
  type ClearDealNotificationContacts,
} from "@/lib/cleardeal-notification-contacts";

const EXPLORER = "https://testnet.arcscan.app";
const DEMO_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;
const DEMO_TEAM = "0x2222222222222222222222222222222222222222" as Address;
const DEMO_HELPER = "0x3333333333333333333333333333333333333333" as Address;

const demoProject: ClearDealRecord = {
  id: -1n,
  client: "Northstar Studio",
  team: "Saigon Digital",
  title: "Vietnam website launch",
  category: "Website development",
  summary:
    "Design and deliver a responsive business website with an approved prototype, working staging release, and clean production handoff.",
  buyer: DEMO_ADDRESS,
  seller: DEMO_TEAM,
  arbitrator: DEMO_HELPER,
  totalAmount: 1_000_000_000n,
  releasedAmount: 200_000_000n,
  refundedAmount: 0n,
  metadataHash: `0x${"1".repeat(64)}`,
  createdAt: Math.floor(Date.now() / 1_000) - 604_800,
  refundDeadline: Math.floor(Date.now() / 1_000) + 2_592_000,
  reviewPeriod: 259_200,
  maxRevisions: 2,
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
      submittedAt: Math.floor(Date.now() / 1_000) - 345_600,
      reviewDeadline: Math.floor(Date.now() / 1_000) - 86_400,
      revisionCount: 0,
      deliverableHash: `0x${"a".repeat(64)}`,
      status: "Released",
      deliverable: "Responsive page designs and an interactive prototype.",
      acceptanceCriteria:
        "The prototype includes every agreed page and can be reviewed on desktop and mobile.",
    },
    {
      id: 1n,
      title: "Website build",
      recipient: DEMO_TEAM,
      amount: 500_000_000n,
      dueAt: Math.floor(Date.now() / 1_000) + 432_000,
      submittedAt: Math.floor(Date.now() / 1_000) - 43_200,
      reviewDeadline: Math.floor(Date.now() / 1_000) + 216_000,
      revisionCount: 1,
      deliverableHash: `0x${"b".repeat(64)}`,
      status: "Ready for approval",
      deliverable:
        "A deployed staging website with the agreed pages, CMS, and contact form.",
      acceptanceCriteria:
        "All agreed pages load on mobile and desktop, navigation works, and the contact form submits successfully.",
    },
    {
      id: 2n,
      title: "Source handoff",
      recipient: DEMO_TEAM,
      amount: 300_000_000n,
      dueAt: Math.floor(Date.now() / 1_000) + 1_209_600,
      submittedAt: 0,
      reviewDeadline: 0,
      revisionCount: 0,
      deliverableHash: `0x${"0".repeat(64)}`,
      status: "Pending",
      deliverable:
        "Production deployment, source code, and administrator handoff.",
      acceptanceCriteria:
        "The production URL is live and the client receives working source and administrator access.",
    },
  ],
};

interface TransactionState {
  status: "pending" | "confirmed" | "error";
  message: string;
  hash?: Hash;
}

type DecisionKind = "change_request" | "milestone_dispute" | "milestone_resolution";
type ProjectFilter = "all" | "action" | "active" | "completed" | "disputed";

interface DecisionTarget {
  kind: DecisionKind;
  deal: ClearDealRecord;
  milestone: ClearDealMilestone;
}

function reviewTimeLeft(deadline: number, now: number) {
  const seconds = Math.max(0, deadline - now);
  if (seconds === 0) return "Review time ended";
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  return `${hours}h ${minutes}m left`;
}

function sameAddress(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function projectNeedsAction(deal: ClearDealRecord, address?: Address) {
  if (!address) return false;
  if (deal.status === "Draft" && sameAddress(address, deal.buyer)) return true;
  return deal.milestones.some((milestone) => {
    if (
      milestone.status === "Pending" &&
      sameAddress(address, deal.seller)
    ) {
      return true;
    }
    if (
      milestone.status === "Ready for approval" &&
      sameAddress(address, deal.buyer)
    ) {
      return true;
    }
    return (
      milestone.status === "Disputed" &&
      sameAddress(address, deal.arbitrator)
    );
  });
}

function projectActionLabel(deal: ClearDealRecord, address?: Address) {
  if (!address) return undefined;
  if (deal.status === "Draft" && sameAddress(address, deal.buyer)) {
    return "Deposit budget";
  }
  const milestone = deal.milestones.find((item) => {
    if (item.status === "Pending") return sameAddress(address, deal.seller);
    if (item.status === "Ready for approval") {
      return sameAddress(address, deal.buyer);
    }
    if (item.status === "Disputed") {
      return sameAddress(address, deal.arbitrator);
    }
    return false;
  });
  if (!milestone) return undefined;
  if (milestone.status === "Pending") return "Submit delivery";
  if (milestone.status === "Ready for approval") return "Review delivery";
  return "Decide dispute";
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16_384) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16_384));
  }
  return window.btoa(binary);
}

async function prepareEvidenceAttachments(
  files: readonly File[],
  access: "review" | "paid",
) {
  if (files.length > CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS) {
    throw new Error(`Attach no more than ${CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS} files.`);
  }
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES) {
    throw new Error("Attachments must total less than 2.5 MB.");
  }
  const descriptors: ClearDealEvidenceAttachment[] = [];
  const payloads: ClearDealEvidenceAttachmentPayload[] = [];
  for (const file of files) {
    if (
      !CLEARDEAL_EVIDENCE_ALLOWED_ATTACHMENT_TYPES.includes(
        file.type as ClearDealEvidenceAttachment["contentType"],
      )
    ) {
      throw new Error(`${file.name} is not a supported PDF, PNG, JPEG, MP4, WebM, or text file.`);
    }
    if (file.size < 1 || file.size > CLEARDEAL_EVIDENCE_MAX_ATTACHMENT_BYTES) {
      throw new Error(`${file.name} must be smaller than 1.5 MB.`);
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
      access,
      protection:
        access === "paid"
          ? "locked_original"
          : file.type === "image/png" || file.type === "image/jpeg"
            ? "server_watermark"
            : file.type === "video/mp4" || file.type === "video/webm"
              ? "provided_preview"
              : "participant_only",
    });
    payloads.push({ sha256, dataBase64: bytesToBase64(bytes) });
  }
  return { descriptors, payloads };
}

export function ProjectDashboardClient() {
  const searchParams = useSearchParams();
  const focusedProjectParam = searchParams.get("project");
  const focusedDealId = useMemo(() => {
    if (!focusedProjectParam || !/^\d+$/.test(focusedProjectParam)) {
      return undefined;
    }
    try {
      return BigInt(focusedProjectParam);
    } catch {
      return undefined;
    }
  }, [focusedProjectParam]);
  const {
    address: connectedWalletAddress,
    isConnected: isCryptoWalletConnected,
  } = useAccount();
  const googleWallet = useCircleGoogleWallet();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync: signCryptoWalletMessage } = useSignMessage();
  const { writeContractAsync: writeCryptoWalletContract } = useWriteContract();
  const useGoogleWallet =
    !isCryptoWalletConnected && googleWallet.isConnected;
  const address = connectedWalletAddress ?? googleWallet.address;
  const isConnected = isCryptoWalletConnected || googleWallet.isConnected;
  const { deals, loading, error, refresh } = useClearDeals(
    address,
    focusedDealId,
  );
  const directory = useWalletDirectory();
  const [selectedId, setSelectedId] = useState<bigint>();
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] =
    useState<ProjectFilter>("all");
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
  const [evidenceReviewFiles, setEvidenceReviewFiles] = useState<File[]>([]);
  const [evidenceCleanFiles, setEvidenceCleanFiles] = useState<File[]>([]);
  const [fileAccess, setFileAccess] = useState<{
    evidenceHash: Hex;
    access: "review" | "paid";
    expiresAt: number;
  }>();
  const [decisionTarget, setDecisionTarget] = useState<DecisionTarget>();
  const [decisionNote, setDecisionNote] = useState("");
  const [resolutionAward, setResolutionAward] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1_000));

  useEffect(() => {
    if (!deals.length) return setSelectedId(undefined);
    if (
      focusedDealId !== undefined &&
      deals.some((deal) => deal.id === focusedDealId)
    ) {
      setSelectedId(focusedDealId);
      return;
    }
    setSelectedId((current) =>
      current !== undefined && deals.some((deal) => deal.id === current)
        ? current
        : deals[0].id,
    );
  }, [deals, focusedDealId]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1_000)),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const liveSelected =
    deals.find((deal) => deal.id === selectedId) ?? deals[0];
  const selected = liveSelected ?? demoProject;
  const isDemo = selected.id === -1n;
  const {
    activity,
    loading: activityLoading,
  } = useDealActivity(isDemo ? undefined : selected.id, transaction?.hash);

  const activeMilestone =
    selected.milestones.find((milestone) => milestone.status === "Disputed") ??
    selected.milestones.find((milestone) => milestone.status === "Ready for approval") ??
    selected.milestones.find((milestone) => milestone.status === "Pending") ??
    selected.milestones.at(-1);
  const activeEvidence = activeMilestone
    ? activity.find(
        (item) =>
          item.evidence?.evidence.kind === "milestone_submission" &&
          item.evidence.evidence.milestoneId === activeMilestone.id.toString() &&
          item.evidenceHash?.toLowerCase() ===
            activeMilestone.deliverableHash.toLowerCase(),
      )?.evidence
    : undefined;
  const latestChangeRequest = activeMilestone
    ? activity.find(
        (item) =>
          item.evidence?.evidence.kind === "change_request" &&
          item.evidence.evidence.milestoneId === activeMilestone.id.toString(),
      )?.evidence
    : undefined;
  const activeAttachments = isDemo
    ? [
        {
          name: "website-preview.png",
          size: 742_000,
          contentType: "image/png" as const,
          access: "review" as const,
          protection: "server_watermark" as const,
          sha256: `0x${"c".repeat(64)}` as Hex,
        },
        {
          name: "clean-delivery.pdf",
          size: 1_120_000,
          contentType: "application/pdf" as const,
          access: "paid" as const,
          protection: "locked_original" as const,
          sha256: `0x${"d".repeat(64)}` as Hex,
        },
      ]
    : activeEvidence?.evidence.attachments ?? [];
  const activeFileAccess =
    fileAccess &&
    activeMilestone &&
    fileAccess.evidenceHash.toLowerCase() ===
      activeMilestone.deliverableHash.toLowerCase() &&
    fileAccess.expiresAt > now * 1_000
      ? fileAccess
      : undefined;

  useEffect(() => {
    setFileAccess(undefined);
  }, [activeMilestone?.deliverableHash]);
  const paid = selected.releasedAmount;
  const held = escrowBalance(selected);
  const wrongNetwork =
    isCryptoWalletConnected && chainId !== arcTestnet.id;
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

  function selectProject(dealId: bigint) {
    setSelectedId(dealId);
    const url = new URL(window.location.href);
    url.searchParams.set("project", dealId.toString());
    window.history.replaceState({}, "", url);
  }

  async function copyProjectLink(deal: ClearDealRecord) {
    const url = new URL(window.location.href);
    url.pathname = "/dashboard";
    url.search = "";
    url.searchParams.set("project", deal.id.toString());
    await navigator.clipboard.writeText(url.toString());
    setTransaction({
      status: "confirmed",
      message: "Public project link copied. Protected files still require a participant signature.",
    });
  }

  function downloadProjectReceipt(deal: ClearDealRecord) {
    const receipt = {
      product: "ClearDeal",
      network: "Arc Testnet",
      contract: clearDealEscrowAddress,
      project: {
        id: deal.id.toString(),
        title: deal.title,
        category: deal.category,
        summary: deal.summary,
        client: { name: deal.client, wallet: deal.buyer },
        team: { name: deal.team, wallet: deal.seller },
        disputeHelperWallet: deal.arbitrator,
        status: deal.status,
        totalUsdc: formatUnits(deal.totalAmount, 6),
        releasedUsdc: formatUnits(deal.releasedAmount, 6),
        refundedUsdc: formatUnits(deal.refundedAmount, 6),
        metadataHash: deal.metadataHash,
        createdAt: new Date(deal.createdAt * 1_000).toISOString(),
        refundDeadline: new Date(deal.refundDeadline * 1_000).toISOString(),
        reviewHours: deal.reviewPeriod / 3_600,
        maximumRevisions: deal.maxRevisions,
        milestones: deal.milestones.map((milestone) => ({
          number: Number(milestone.id) + 1,
          title: milestone.title,
          deliverable: milestone.deliverable,
          acceptanceCriteria: milestone.acceptanceCriteria,
          amountUsdc: formatUnits(milestone.amount, 6),
          dueAt: new Date(milestone.dueAt * 1_000).toISOString(),
          status: milestone.status,
          submittedAt: milestone.submittedAt
            ? new Date(milestone.submittedAt * 1_000).toISOString()
            : null,
          reviewDeadline: milestone.reviewDeadline
            ? new Date(milestone.reviewDeadline * 1_000).toISOString()
            : null,
          revisionCount: milestone.revisionCount,
          deliveryHash: milestone.deliverableHash,
        })),
      },
      explorer: clearDealEscrowAddress
        ? `${EXPLORER}/address/${clearDealEscrowAddress}`
        : EXPLORER,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(receipt, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cleardeal-project-${deal.id.toString()}-receipt.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function requireReady() {
    if (!address || !publicClient || !clearDealEscrowAddress) {
      throw new Error("Sign in and configure the ClearDeal contract first.");
    }
    if (isCryptoWalletConnected && chainId !== arcTestnet.id) {
      await switchChainAsync({ chainId: arcTestnet.id });
    }
    return { address, publicClient, contract: clearDealEscrowAddress };
  }

  async function signMessageAsync({ message }: { message: string }) {
    if (useGoogleWallet) return signCircleGoogleMessage(message);
    return signCryptoWalletMessage({ message });
  }

  async function writeContractAsync(request: {
    address: Address;
    abi: Abi;
    chainId?: number;
    functionName: string;
    args?: readonly unknown[];
  }): Promise<Hash> {
    if (!useGoogleWallet) {
      return writeCryptoWalletContract(
        request as Parameters<typeof writeCryptoWalletContract>[0],
      );
    }
    const callData = encodeFunctionData({
      abi: request.abi,
      functionName: request.functionName,
      args: request.args,
    } as Parameters<typeof encodeFunctionData>[0]);
    return executeCircleGoogleContract({
      contractAddress: request.address,
      callData,
    });
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
        version: 2,
        client: input.client,
        team: input.team,
        title: input.title,
        category: input.category,
        summary: input.summary,
        milestones: input.milestones.map(
          ({
            title,
            dueDate,
            deliverable,
            acceptanceCriteria,
          }) => ({
            title,
            dueDate,
            deliverable,
            acceptanceCriteria,
          }),
        ),
      };
      const metadataHash = hashDealMetadata(metadata);
      const notificationContacts: ClearDealNotificationContacts = {
        ...(input.clientEmail ? { clientEmail: input.clientEmail } : {}),
        ...(input.teamEmail ? { teamEmail: input.teamEmail } : {}),
      };
      const notificationHash = hashNotificationContacts(notificationContacts);
      const authorization: StoreDealMetadataAuthorization = {
        ownerAddress: ready.address,
        metadataHash,
        notificationHash,
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
        body: JSON.stringify({
          ...authorization,
          metadata,
          notificationContacts,
          signature,
        }),
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
          input.reviewHours * 3_600,
          input.maxRevisions,
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
        selectProject(created.args.dealId);
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

  async function finalizeMilestone(deal: ClearDealRecord, milestone: ClearDealMilestone) {
    await runAction(async () => {
      const ready = await requireReady();
      return writeContractAsync({
        address: ready.contract,
        abi: clearDealEscrowAbi,
        chainId: arcTestnet.id,
        functionName: "finalizeMilestone",
        args: [deal.id, milestone.id],
      });
    }, `finalize ${formatUsdc(milestone.amount)} after review`);
  }

  async function storeDecisionEvidence(target: DecisionTarget, reference: string) {
    const ready = await requireReady();
    const evidence: ClearDealEvidence = {
      version: 1,
      kind: target.kind,
      dealId: target.deal.id.toString(),
      milestoneId: target.milestone.id.toString(),
      reference,
      submittedAt: Date.now(),
    };
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
      message: "Sign this decision note. This signature does not move USDC.",
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
        attachmentPayloads: [],
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "The signed decision note could not be stored.");
    }
    return { ready, evidenceHash };
  }

  async function openProtectedDelivery(evidenceHash: Hex) {
    const ready = await requireReady();
    setBusy(true);
    try {
      const authorization: AccessClearDealEvidenceAuthorization = {
        signerAddress: ready.address,
        evidenceHash,
        requestId: crypto.randomUUID(),
        issuedAt: Date.now(),
      };
      setTransaction({
        status: "pending",
        message: "Sign to open this participant-only delivery. This does not move USDC.",
      });
      const signature = await signMessageAsync({
        message: buildAccessClearDealEvidenceMessage(authorization),
      });
      const response = await fetch("/api/deals/evidence/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authorization, signature }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        opened?: boolean;
        access?: "review" | "paid";
        expiresAt?: number;
        error?: string;
      };
      if (
        !response.ok ||
        !body.opened ||
        !body.access ||
        !Number.isSafeInteger(body.expiresAt)
      ) {
        throw new Error(body.error ?? "The protected delivery could not be opened.");
      }
      setFileAccess({
        evidenceHash,
        access: body.access,
        expiresAt: body.expiresAt as number,
      });
      setTransaction({
        status: "confirmed",
        message:
          body.access === "paid"
            ? "Clean delivery unlocked after payment."
            : "Protected review preview opened for 10 minutes.",
      });
    } catch (cause) {
      setTransaction({
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "The protected delivery could not be opened.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision() {
    if (!decisionTarget) return;
    const note = decisionNote.trim();
    if (!note) return;
    setBusy(true);
    try {
      const sellerAward = decisionTarget.kind === "milestone_resolution"
        ? parseUnits(resolutionAward || "0", 6)
        : 0n;
      if (
        decisionTarget.kind === "milestone_resolution" &&
        (sellerAward < 0n || sellerAward > decisionTarget.milestone.amount)
      ) {
        throw new Error("The team award must be between 0 and the milestone amount.");
      }
      const { ready, evidenceHash } = await storeDecisionEvidence(decisionTarget, note);
      let functionName:
        | "requestChanges"
        | "openMilestoneDispute"
        | "resolveMilestoneDispute";
      let args: readonly unknown[];
      let message: string;
      if (decisionTarget.kind === "change_request") {
        functionName = "requestChanges";
        args = [decisionTarget.deal.id, decisionTarget.milestone.id, evidenceHash];
        message = "Change request";
      } else if (decisionTarget.kind === "milestone_dispute") {
        functionName = "openMilestoneDispute";
        args = [decisionTarget.deal.id, decisionTarget.milestone.id, evidenceHash];
        message = "Milestone dispute";
      } else {
        functionName = "resolveMilestoneDispute";
        args = [
          decisionTarget.deal.id,
          decisionTarget.milestone.id,
          sellerAward,
          evidenceHash,
        ];
        message = "Dispute decision";
      }
      await waitFor(
        await writeContractAsync({
          address: ready.contract,
          abi: clearDealEscrowAbi,
          chainId: arcTestnet.id,
          functionName,
          args,
        }),
        message,
      );
      setDecisionTarget(undefined);
      setDecisionNote("");
      setResolutionAward("");
    } catch (cause) {
      setTransaction({
        status: "error",
        message: cause instanceof Error ? cause.message : "The milestone decision failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitDelivery() {
    if (!evidenceTarget) return;
    const ready = await requireReady();
    setBusy(true);
    try {
      if (evidenceCleanFiles.length && !evidenceReviewFiles.length) {
        throw new Error("Add at least one review preview before locking a clean delivery.");
      }
      const [review, clean] = await Promise.all([
        prepareEvidenceAttachments(evidenceReviewFiles, "review"),
        prepareEvidenceAttachments(evidenceCleanFiles, "paid"),
      ]);
      if (
        review.descriptors.length + clean.descriptors.length >
        CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS
      ) {
        throw new Error(`Attach no more than ${CLEARDEAL_EVIDENCE_MAX_ATTACHMENTS} files in total.`);
      }
      if (
        [...evidenceReviewFiles, ...evidenceCleanFiles].reduce(
          (sum, file) => sum + file.size,
          0,
        ) > CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES
      ) {
        throw new Error("All attachments must total less than 2.5 MB.");
      }
      const descriptors = [...review.descriptors, ...clean.descriptors];
      const payloads = [...review.payloads, ...clean.payloads];
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
      setEvidenceReviewFiles([]);
      setEvidenceCleanFiles([]);
    } catch (cause) {
      setTransaction({
        status: "error",
        message: cause instanceof Error ? cause.message : "Delivery submission failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  const normalizedProjectSearch = projectSearch.trim().toLowerCase();
  const visibleDeals = deals.filter((deal) => {
    const matchesSearch =
      !normalizedProjectSearch ||
      [deal.title, deal.client, deal.team, deal.category]
        .filter(Boolean)
        .some((value) =>
          value?.toLowerCase().includes(normalizedProjectSearch),
        );
    if (!matchesSearch) return false;
    if (projectFilter === "action") return projectNeedsAction(deal, address);
    if (projectFilter === "completed") return deal.status === "Completed";
    if (projectFilter === "disputed") return deal.status === "Disputed";
    if (projectFilter === "active") {
      return (
        deal.status === "Draft" ||
        deal.status === "Fully funded" ||
        deal.status === "In progress"
      );
    }
    return true;
  });
  const projectRows = deals.length ? visibleDeals : [demoProject];

  return (
    <main
      id="main-content"
      className="cleardeal-app cd-page-shell cd-page-enter min-h-[100dvh] text-[#2b2118]"
    >
      <header className="cd-topbar sticky top-0 z-50">
        <div className="mx-auto flex h-[78px] max-w-[1580px] items-center justify-between px-4 sm:px-7">
          <ClearDealBrand />
          <nav className="hidden h-full items-center gap-8 lg:flex" aria-label="Project navigation">
            <Link href="/dashboard" className="cd-nav-link relative grid h-full place-items-center">
              Projects
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#c88400]" />
            </Link>
            <Link href="/how-it-works" className="cd-nav-link">
              How it works
            </Link>
            <button
              type="button"
              onClick={() => setDirectoryOpen(true)}
              className="cd-nav-link"
            >
              Wallet contacts
            </button>
            <Link href="/docs" className="cd-nav-link">
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

      <div className="cd-dashboard-grid mx-auto grid max-w-[1580px] lg:grid-cols-[310px_minmax(0,1fr)_330px]">
        <aside className="cd-dashboard-sidebar border-b border-[#ded5c6] lg:min-h-[calc(100dvh-78px)] lg:border-b-0 lg:border-r">
          <div className="p-5">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={busy}
              className="cd-button-primary inline-flex min-h-14 w-full items-center justify-center gap-3 px-5 text-[13px] disabled:cursor-not-allowed disabled:opacity-45"
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
          {deals.length ? (
            <div className="grid gap-3 border-b border-[#ded5c6] p-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8070]" />
                <input
                  type="search"
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search projects..."
                  className="min-h-11 w-full border border-[#d8cebd] bg-white pl-10 pr-3 text-[12px] outline-none focus:border-[#c88400]"
                  aria-label="Search projects"
                />
              </label>
              <select
                value={projectFilter}
                onChange={(event) =>
                  setProjectFilter(event.target.value as ProjectFilter)
                }
                className="min-h-11 border border-[#d8cebd] bg-white px-3 text-[12px] outline-none focus:border-[#c88400]"
                aria-label="Filter projects"
              >
                <option value="all">All projects</option>
                <option value="action">Needs my action</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
          ) : null}
          <div className="lg:max-h-[calc(100dvh-360px)] lg:overflow-y-auto">
            {projectRows.map((deal) => {
              const active = deal.id === selected.id;
              const actionLabel =
                deal.id >= 0n
                  ? projectActionLabel(deal, address)
                  : undefined;
              return (
                <button
                  key={deal.id.toString()}
                  type="button"
                  onClick={() => deal.id >= 0n && selectProject(deal.id)}
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
                    {actionLabel ? (
                      <span className="mt-2 inline-flex border border-[#e0ad3f] bg-[#fff8e4] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#8c5a00]">
                        {actionLabel}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#766b5d]" />
                </button>
              );
            })}
            {deals.length && !projectRows.length ? (
              <div className="p-6 text-center">
                <Search className="mx-auto h-5 w-5 text-[#9a8d7d]" />
                <p className="mt-3 text-[12px] font-semibold">
                  No matching projects
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProjectSearch("");
                    setProjectFilter("all");
                  }}
                  className="mt-3 min-h-11 text-[11px] font-semibold text-[#8c5a00]"
                >
                  Clear search and filter
                </button>
              </div>
            ) : null}
          </div>
          {error ? (
            <p className="m-5 border border-rose-200 bg-rose-50 p-4 text-[11px] leading-5 text-rose-700">
              {error}
            </p>
          ) : !isConnected ? (
            <p className="m-5 border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
              {isDemo
                ? "You are viewing a sample project. Sign in to create and run your own Arc Testnet project."
                : "This is a public project receipt. Sign in with an assigned wallet to submit, review, or decide a dispute."}
            </p>
          ) : !deals.length ? (
            <div className="m-5 border border-[#e1c27e] bg-[#fff8e4] p-4 text-[11px] leading-5 text-[#67501e]">
              <strong className="block text-[12px] text-[#2b2118]">
                Create your first protected project
              </strong>
              <ol className="mt-3 space-y-2">
                <li>1. Choose a real project template.</li>
                <li>2. Add the team and independent helper.</li>
                <li>3. Sign the delivery and payment rules.</li>
              </ol>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-4 min-h-11 bg-[#d58b00] px-4 font-semibold text-white"
              >
                Start a project
              </button>
            </div>
          ) : null}
        </aside>

        <section className="cd-dashboard-content min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="border-b border-[#ded5c6] pb-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#a66c00]">
                  {isDemo ? "Sample project" : `CD-PROJECT-${selected.id.toString()}`}
                </p>
                <h1 className="mt-3 font-display text-4xl tracking-[-0.035em] sm:text-5xl">{selected.title}</h1>
                {selected.category ? (
                  <span className="mt-3 inline-flex border border-[#d9c8a9] bg-[#fff8e4] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#8c5a00]">
                    {selected.category}
                  </span>
                ) : null}
              </div>
              {isDemo ? (
                <span className="w-fit border border-[#ded5c6] bg-white px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#766b5d]">
                  Read-only demo
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyProjectLink(selected)}
                    className="inline-flex min-h-11 items-center gap-2 border border-[#cdbfaa] bg-white px-4 text-[11px] font-semibold text-[#574c40] hover:border-[#a66c00]"
                  >
                    <Share2 className="h-4 w-4" /> Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadProjectReceipt(selected)}
                    className="inline-flex min-h-11 items-center gap-2 border border-[#cdbfaa] bg-white px-4 text-[11px] font-semibold text-[#574c40] hover:border-[#a66c00]"
                  >
                    <ReceiptText className="h-4 w-4" /> Download receipt
                  </button>
                </div>
              )}
            </div>
            {selected.summary ? (
              <p className="mt-5 max-w-3xl text-[13px] leading-6 text-[#675b4e]">
                {selected.summary}
              </p>
            ) : null}
            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              <ProjectFact label="Client" value={labelFor(selected.buyer, selected.client)} />
              <ProjectFact label="Team" value={labelFor(selected.seller, selected.team)} />
              <ProjectFact label="Total" value={formatUsdc(selected.totalAmount)} strong />
            </div>
          </div>

          <p className="py-7 font-display text-2xl leading-tight text-[#382d22]">
            Each delivery is paid after approval. It can also release automatically when its review time ends without a dispute.
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
                  {activeMilestone.status === "Ready for approval" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                      <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono ${
                        activeMilestone.reviewDeadline <= now
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}>
                        <Clock3 className="h-3.5 w-3.5" />
                        {reviewTimeLeft(activeMilestone.reviewDeadline, now)}
                      </span>
                      <span className="border border-[#ded5c6] px-2.5 py-1.5 text-[#766b5d]">
                        Revision {activeMilestone.revisionCount}/{selected.maxRevisions}
                      </span>
                    </div>
                  ) : activeMilestone.status === "Disputed" ? (
                    <p className="mt-3 inline-flex items-center gap-2 border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700">
                      <Scale className="h-3.5 w-3.5" />
                      Payment paused until the dispute helper decides this milestone.
                    </p>
                  ) : null}
                </div>
                <span className="w-fit border border-[#e5c06d] bg-[#fff5d9] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a5900]">
                  {activeMilestone.status}
                </span>
              </div>

              {activeMilestone.deliverable ||
              activeMilestone.acceptanceCriteria ? (
                <div className="mt-5 grid gap-4 border-b border-[#ded5c6] pb-5 sm:grid-cols-2">
                  <div className="border-l-2 border-[#d58b00] pl-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#8c5a00]">
                      Team must deliver
                    </p>
                    <p className="mt-2 text-[11px] leading-6 text-[#574c40]">
                      {activeMilestone.deliverable ??
                        "The agreed milestone delivery."}
                    </p>
                  </div>
                  <div className="border-l-2 border-emerald-600 pl-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-emerald-700">
                      Client approves when
                    </p>
                    <p className="mt-2 text-[11px] leading-6 text-[#574c40]">
                      {activeMilestone.acceptanceCriteria ??
                        "The delivery matches the agreed project scope."}
                    </p>
                  </div>
                </div>
              ) : null}

              {latestChangeRequest && activeMilestone.status === "Pending" ? (
                <div className="mt-5 border border-amber-300 bg-amber-50 p-4">
                  <p className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-900">
                    <RotateCcw className="h-4 w-4" />
                    Client requested revision {activeMilestone.revisionCount}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-amber-900/80">
                    {latestChangeRequest.evidence.reference}
                  </p>
                </div>
              ) : null}

              {isDemo || activeEvidence ? (
                <div className="py-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-[13px] font-semibold">Delivery from {selected.team}</p>
                      <p className="mt-2 text-[12px] leading-6 text-[#766b5d]">
                        {isDemo
                          ? "Complete responsive website with CMS, content pages, and contact form."
                          : activeEvidence?.evidence.reference}
                      </p>
                    </div>
                    {!isDemo && activeEvidence?.clientViewedAt ? (
                      <span className="inline-flex w-fit items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-700">
                        <Eye className="h-3.5 w-3.5" />
                        Client opened preview
                      </span>
                    ) : !isDemo && role === "Team" ? (
                      <span className="inline-flex w-fit items-center gap-2 border border-[#ded5c6] px-3 py-2 text-[10px] text-[#766b5d]">
                        <Eye className="h-3.5 w-3.5" />
                        Not viewed yet
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">Protected delivery files</p>
                      <p className="mt-1 text-[10px] leading-5 text-[#766b5d]">
                        Review previews are participant-only. Clean files unlock only after this milestone is paid.
                      </p>
                    </div>
                    {!isDemo && activeAttachments.length && !activeFileAccess ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void openProtectedDelivery(activeMilestone.deliverableHash)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#a66c00] px-4 text-[11px] font-semibold text-[#8c5a00] hover:bg-[#fff5d9] disabled:opacity-45"
                      >
                        <LockKeyhole className="h-4 w-4" />
                        Sign to open files
                      </button>
                    ) : null}
                  </div>

                  {activeAttachments.length ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {activeAttachments.map((file, index) => (
                        <ProtectedFileCard
                          key={`${file.sha256}-${index}`}
                          file={file}
                          index={index}
                          evidenceHash={activeMilestone.deliverableHash}
                          opened={isDemo || Boolean(activeFileAccess)}
                          paidAccess={isDemo || activeFileAccess?.access === "paid"}
                          demo={isDemo}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 border border-[#ded5c6] px-4 py-3 text-[11px] text-[#766b5d]">
                      No file attached. Review the signed delivery note above.
                    </p>
                  )}
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
                      setEvidenceReviewFiles([]);
                      setEvidenceCleanFiles([]);
                    }}
                    className="min-h-12 bg-[#d58b00] px-6 text-[13px] font-semibold text-white hover:bg-[#bd7b00] disabled:opacity-45"
                  >
                    {activeMilestone.revisionCount > 0 ? "Submit revised delivery" : "Submit this delivery"}
                  </button>
                ) : activeMilestone.status === "Ready for approval" && activeMilestone.reviewDeadline <= now ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void finalizeMilestone(selected, activeMilestone)}
                    className="min-h-12 bg-emerald-700 px-6 text-[13px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-45"
                  >
                    Release after completed review · {formatUsdc(activeMilestone.amount)}
                  </button>
                ) : activeMilestone.status === "Ready for approval" && role === "Client" ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void releaseMilestone(selected, activeMilestone)}
                      className="min-h-12 flex-1 bg-[#d58b00] px-5 text-[12px] font-semibold text-white hover:bg-[#bd7b00] disabled:opacity-45"
                    >
                      Approve & release {formatUsdc(activeMilestone.amount)}
                    </button>
                    <button
                      type="button"
                      disabled={busy || activeMilestone.revisionCount >= selected.maxRevisions}
                      onClick={() => {
                        setDecisionTarget({ kind: "change_request", deal: selected, milestone: activeMilestone });
                        setDecisionNote("");
                      }}
                      className="min-h-12 flex-1 border border-[#a66c00] px-5 text-[12px] font-semibold text-[#8c5a00] hover:bg-[#fff5d9] disabled:opacity-40"
                    >
                      <span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Request changes</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setDecisionTarget({ kind: "milestone_dispute", deal: selected, milestone: activeMilestone });
                        setDecisionNote("");
                      }}
                      className="min-h-12 flex-1 border border-rose-300 px-5 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                    >
                      Open dispute
                    </button>
                  </>
                ) : activeMilestone.status === "Ready for approval" && role === "Team" ? (
                  <>
                    <p className="flex min-h-12 flex-1 items-center text-[11px] leading-5 text-[#766b5d]">
                      The client can approve, request a revision, or dispute before the clock ends.
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setDecisionTarget({ kind: "milestone_dispute", deal: selected, milestone: activeMilestone });
                        setDecisionNote("");
                      }}
                      className="min-h-12 border border-rose-300 px-5 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                    >
                      Open dispute
                    </button>
                  </>
                ) : activeMilestone.status === "Disputed" && role === "Dispute helper" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setDecisionTarget({ kind: "milestone_resolution", deal: selected, milestone: activeMilestone });
                      setDecisionNote("");
                      setResolutionAward(formatUnits(activeMilestone.amount, 6));
                    }}
                    className="min-h-12 bg-[#2b2118] px-6 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-45"
                  >
                    Decide this milestone
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

        <aside className="cd-dashboard-sidebar border-t border-[#ded5c6] lg:min-h-[calc(100dvh-78px)] lg:border-l lg:border-t-0">
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
        <div className={`fixed bottom-[6.8rem] left-1/2 z-[90] flex w-[min(92vw,620px)] -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
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
        directoryEntries={directory.entries}
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
                <p className="mt-2 text-[11px] text-[#766b5d]">Add a review preview and, when needed, the clean file that unlocks after payment.</p>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid min-h-36 cursor-pointer place-items-center border border-dashed border-[#cdbfaa] bg-[#f7f4e9] p-5 text-center">
                  <span>
                    <Eye className="mx-auto h-5 w-5 text-[#a66c00]" />
                    <span className="mt-3 block text-[12px] font-semibold">Review preview</span>
                    <span className="mt-1 block text-[9px] leading-4 text-[#766b5d]">Images get a server watermark. Upload videos already watermarked and compressed.</span>
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.mp4,.webm,application/pdf,image/png,image/jpeg,text/plain,video/mp4,video/webm"
                    className="sr-only"
                    onChange={(event) => setEvidenceReviewFiles(Array.from(event.target.files ?? []))}
                  />
                </label>
                <label className="grid min-h-36 cursor-pointer place-items-center border border-dashed border-emerald-300 bg-emerald-50 p-5 text-center">
                  <span>
                    <LockKeyhole className="mx-auto h-5 w-5 text-emerald-700" />
                    <span className="mt-3 block text-[12px] font-semibold">Clean delivery</span>
                    <span className="mt-1 block text-[9px] leading-4 text-emerald-800/70">Encrypted at rest. The client cannot download it before this milestone is paid.</span>
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.mp4,.webm,application/pdf,image/png,image/jpeg,text/plain,video/mp4,video/webm"
                    className="sr-only"
                    onChange={(event) => setEvidenceCleanFiles(Array.from(event.target.files ?? []))}
                  />
                </label>
              </div>
              {evidenceReviewFiles.length ? (
                <EvidenceFileList label="Review preview" files={evidenceReviewFiles} />
              ) : null}
              {evidenceCleanFiles.length ? (
                <EvidenceFileList label="Locked clean delivery" files={evidenceCleanFiles} />
              ) : null}
              <p className="border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">
                Maximum 3 files total, 1.5 MB each and 2.5 MB combined. ClearDeal stores encrypted files offchain; Arc stores only their signed fingerprint. This is access control, not DRM. A reviewer can still record their screen.
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

      {decisionTarget ? (
        <div className="fixed inset-0 z-[105] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Milestone decision">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitDecision();
            }}
            className="w-full max-w-[560px] border border-[#ded5c6] bg-[#fffcf0] shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-[#ded5c6] p-6">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#a66c00]">
                  {decisionTarget.kind === "change_request"
                    ? "Revision request"
                    : decisionTarget.kind === "milestone_dispute"
                      ? "Payment protection"
                      : "Independent decision"}
                </p>
                <h2 className="mt-2 font-display text-3xl">
                  {decisionTarget.kind === "change_request"
                    ? "What needs to change?"
                    : decisionTarget.kind === "milestone_dispute"
                      ? "Why should payment pause?"
                      : "How should this milestone be paid?"}
                </h2>
                <p className="mt-2 text-[11px] leading-5 text-[#766b5d]">
                  {decisionTarget.milestone.title} · {formatUsdc(decisionTarget.milestone.amount)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDecisionTarget(undefined)}
                className="grid h-10 w-10 place-items-center border border-[#ded5c6]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="grid gap-5 p-6">
              {decisionTarget.kind === "milestone_resolution" ? (
                <label className="grid gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">Pay the team</span>
                  <div className="relative">
                    <input
                      required
                      min="0"
                      max={formatUnits(decisionTarget.milestone.amount, 6)}
                      step="0.000001"
                      type="number"
                      value={resolutionAward}
                      onChange={(event) => setResolutionAward(event.target.value)}
                      className="cd-input w-full pr-16 font-mono"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#766b5d]">USDC</span>
                  </div>
                  <span className="text-[10px] leading-5 text-[#766b5d]">
                    The remainder returns to the client. The total can never exceed this milestone.
                  </span>
                </label>
              ) : null}
              <label className="grid gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766b5d]">
                  {decisionTarget.kind === "milestone_resolution" ? "Decision and reason" : "Clear reason"}
                </span>
                <textarea
                  required
                  maxLength={1_000}
                  rows={5}
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder={
                    decisionTarget.kind === "change_request"
                      ? "List the exact agreed item that is missing or needs correction."
                      : decisionTarget.kind === "milestone_dispute"
                        ? "Describe the disagreement and point to the submitted evidence."
                        : "Explain the evidence reviewed and why this payment split is fair."
                  }
                  className="cd-input resize-y"
                />
              </label>
              <p className="border border-blue-200 bg-blue-50 p-3 text-[10px] leading-5 text-blue-900">
                Your wallet signs this note, then its exact fingerprint is recorded on Arc with the decision. Signing the note alone does not move USDC.
              </p>
            </div>
            <footer className="flex justify-end gap-3 border-t border-[#ded5c6] p-6">
              <button type="button" disabled={busy} onClick={() => setDecisionTarget(undefined)} className="min-h-11 border border-[#ded5c6] px-5 text-[12px] font-semibold">Cancel</button>
              <button
                type="submit"
                disabled={busy || !decisionNote.trim() || (decisionTarget.kind === "milestone_resolution" && resolutionAward === "")}
                className="min-h-11 bg-[#2b2118] px-5 text-[12px] font-semibold text-white disabled:opacity-45"
              >
                {busy
                  ? "Waiting for wallet…"
                  : decisionTarget.kind === "change_request"
                    ? "Sign & request changes"
                    : decisionTarget.kind === "milestone_dispute"
                      ? "Sign & pause payment"
                      : "Sign & resolve milestone"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function EvidenceFileList({ label, files }: { label: string; files: File[] }) {
  return (
    <div className="border border-[#ded5c6]">
      <p className="border-b border-[#ded5c6] bg-[#f7f4e9] px-4 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#766b5d]">
        {label}
      </p>
      <div className="divide-y divide-[#ded5c6]">
        {files.map((file) => (
          <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 px-4 py-3 text-[11px]">
            <FileText className="h-4 w-4 text-[#766b5d]" />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="font-mono text-[9px] text-[#766b5d]">{Math.ceil(file.size / 1_000)} KB</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtectedFileCard({
  file,
  index,
  evidenceHash,
  opened,
  paidAccess,
  demo,
}: {
  file: ClearDealEvidenceAttachment;
  index: number;
  evidenceHash: Hex;
  opened: boolean;
  paidAccess: boolean;
  demo: boolean;
}) {
  const paidFile = file.access === "paid";
  const unlocked = demo ? !paidFile : opened && (!paidFile || paidAccess);
  const url = unlocked && !demo
    ? `/api/deals/evidence/attachment?hash=${evidenceHash}&index=${index}`
    : undefined;
  const inlineUrl = url ? `${url}&view=1` : undefined;
  const image = file.contentType === "image/jpeg" || file.contentType === "image/png";
  const video = file.contentType === "video/mp4" || file.contentType === "video/webm";

  return (
    <article className="overflow-hidden border border-[#ded5c6] bg-[#f7f4e9]">
      {unlocked && image && inlineUrl ? (
        <Image
          src={inlineUrl}
          alt={`Protected preview ${file.name}`}
          width={900}
          height={560}
          unoptimized
          className="h-44 w-full bg-[#ece6d9] object-contain"
        />
      ) : unlocked && video && inlineUrl ? (
        <video
          controls
          preload="metadata"
          className="h-44 w-full bg-black object-contain"
          src={inlineUrl}
        >
          Your browser does not support this protected video preview.
        </video>
      ) : unlocked && demo && image ? (
        <div className="grid h-44 place-items-center bg-[#2b2118] p-6 text-center text-white">
          <div>
            <Eye className="mx-auto h-6 w-6 text-[#f2b431]" />
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em]">ClearDeal review preview</p>
            <p className="mt-2 text-[10px] text-white/60">Viewer watermark appears here</p>
          </div>
        </div>
      ) : (
        <div className="grid h-28 place-items-center bg-[#ece6d9] text-center">
          <div>
            <LockKeyhole className="mx-auto h-6 w-6 text-[#8c8070]" />
            <p className="mt-2 text-[10px] font-semibold text-[#62584c]">
              {paidFile ? "Locked until milestone payment" : "Sign to open participant preview"}
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 p-4 text-[11px]">
        <FileText className="h-4 w-4 shrink-0 text-[#766b5d]" />
        <span className="min-w-0 flex-1">
          <strong className="block truncate">{file.name}</strong>
          <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.08em] text-[#766b5d]">
            {paidFile ? "Clean file · after payment" : "Review preview"} · {Math.ceil(file.size / 1_000)} KB
          </span>
        </span>
        {unlocked && url ? (
          <a
            href={url}
            className="grid h-10 w-10 shrink-0 place-items-center border border-[#cdbfaa] bg-white text-[#8c5a00] hover:border-[#a66c00]"
            aria-label={`Download ${file.name}`}
          >
            <Download className="h-4 w-4" />
          </a>
        ) : (
          <LockKeyhole className="h-4 w-4 shrink-0 text-[#8c8070]" />
        )}
      </div>
    </article>
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
  const released = milestone.status === "Released" || milestone.status === "Resolved";
  const disputed = milestone.status === "Disputed";
  const stepLabel = released
    ? milestone.status === "Resolved" ? "Resolved" : "Approved & paid"
    : disputed
      ? "Payment paused"
      : milestone.status === "Ready for approval"
        ? "Client review"
        : milestone.revisionCount > 0
          ? `Revision ${milestone.revisionCount}`
          : "Upcoming";
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
        released
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : disputed
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : active
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-[#ded5c6] text-[#766b5d]"
      }`}>
        {stepLabel}
      </span>
    </div>
  );
}
