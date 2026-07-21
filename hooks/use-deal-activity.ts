"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hash, Hex } from "viem";
import { usePublicClient } from "wagmi";

import { clearDealDeploymentBlock, clearDealEscrowAbi, clearDealEscrowAddress } from "@/lib/cleardeal-contract";
import type { StoredClearDealEvidence } from "@/lib/cleardeal-evidence";
import { formatUsdc, shortAddress } from "@/lib/cleardeal-data";

export interface ClearDealActivity {
  key: string;
  title: string;
  detail: string;
  transactionHash: Hash;
  blockNumber: bigint;
  timestamp: number;
  evidenceHash?: Hex;
  evidence?: StoredClearDealEvidence;
}

interface ContractEvent {
  eventName: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  transactionHash: Hash;
  logIndex: number;
}

async function loadEvidence(hash: Hex) {
  const response = await fetch(`/api/deals/evidence?hash=${hash}`, { cache: "no-store" });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { evidence?: StoredClearDealEvidence };
  return body.evidence;
}

function evidenceHashFor(event: ContractEvent) {
  if (event.eventName === "MilestoneSubmitted") return event.args.deliverableHash as Hex;
  if (event.eventName === "DisputeOpened") return event.args.reasonHash as Hex;
  if (event.eventName === "DisputeResolved") return event.args.resolutionHash as Hex;
  return undefined;
}

function activityCopy(event: ContractEvent, evidence?: StoredClearDealEvidence) {
  const args = event.args;
  const reference = evidence?.evidence.reference;
  if (event.eventName === "DealCreated") return { title: "Deal created", detail: `${formatUsdc(args.totalAmount as bigint)} agreement opened by ${shortAddress(args.buyer as `0x${string}`)}.` };
  if (event.eventName === "DealFunded") return { title: "Escrow funded", detail: `${formatUsdc(args.amount as bigint)} locked in ClearDealEscrow.` };
  if (event.eventName === "MilestoneSubmitted") return { title: `Milestone #${Number(args.milestoneId) + 1} submitted`, detail: reference ?? "Wallet-signed evidence is unavailable for this submission." };
  if (event.eventName === "MilestoneReleased") return { title: `Milestone #${Number(args.milestoneId) + 1} released`, detail: `${formatUsdc(args.amount as bigint)} paid to ${shortAddress(args.recipient as `0x${string}`)}.` };
  if (event.eventName === "RefundRequested") return { title: "Refund requested", detail: "The buyer requested return of unreleased escrow." };
  if (event.eventName === "DealRefunded") return { title: "Escrow refunded", detail: `${formatUsdc(args.amount as bigint)} returned to the buyer.` };
  if (event.eventName === "DisputeOpened") return { title: "Dispute opened", detail: reference ?? `Opened by ${shortAddress(args.openedBy as `0x${string}`)}.` };
  return { title: "Dispute resolved", detail: reference ?? `${formatUsdc(args.sellerAward as bigint)} awarded to seller; ${formatUsdc(args.buyerRefund as bigint)} returned to buyer.` };
}

export function useDealActivity(dealId?: bigint, refreshKey?: Hash) {
  const publicClient = usePublicClient();
  const [activity, setActivity] = useState<ClearDealActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (dealId === undefined || !publicClient || !clearDealEscrowAddress) {
      setActivity([]);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const events = await publicClient.getContractEvents({
        address: clearDealEscrowAddress,
        abi: clearDealEscrowAbi,
        fromBlock: clearDealDeploymentBlock,
        toBlock: "latest",
      }) as ContractEvent[];
      const dealEvents = events.filter((event) => event.args.dealId === dealId);
      const blockNumbers = [...new Set(dealEvents.map((event) => event.blockNumber.toString()))].map(BigInt);
      const blocks = await Promise.all(blockNumbers.map((blockNumber) => publicClient.getBlock({ blockNumber })));
      const timestamps = new Map(blocks.map((block) => [block.number.toString(), Number(block.timestamp)]));
      const evidenceHashes = [...new Set(dealEvents.map(evidenceHashFor).filter(Boolean) as Hex[])];
      const evidenceEntries = await Promise.all(evidenceHashes.map(async (hash) => [hash.toLowerCase(), await loadEvidence(hash)] as const));
      const evidenceByHash = new Map(evidenceEntries);

      const mapped = dealEvents.map((event) => {
        const evidenceHash = evidenceHashFor(event);
        const evidence = evidenceHash ? evidenceByHash.get(evidenceHash.toLowerCase()) : undefined;
        const copy = activityCopy(event, evidence);
        return {
          key: `${event.transactionHash}-${event.logIndex}`,
          ...copy,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: timestamps.get(event.blockNumber.toString()) ?? 0,
          evidenceHash,
          evidence,
        } satisfies ClearDealActivity;
      }).sort((left, right) => left.blockNumber === right.blockNumber ? Number(right.key.split("-").at(-1)) - Number(left.key.split("-").at(-1)) : left.blockNumber > right.blockNumber ? -1 : 1);
      setActivity(mapped);
    } catch (cause) {
      setActivity([]);
      setError(cause instanceof Error ? cause.message : "Could not load the onchain activity timeline.");
    } finally {
      setLoading(false);
    }
  }, [dealId, publicClient, refreshKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { activity, loading, error, refresh };
}
