"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address, Hex } from "viem";

import { clearDealEscrowAbi, clearDealEscrowAddress } from "@/lib/cleardeal-contract";
import type { ClearDealMetadata } from "@/lib/cleardeal-metadata";
import type { ClearDealMilestone, ClearDealRecord, DealStatus, MilestoneStatus } from "@/lib/cleardeal-data";

const EMPTY_HASH = `0x${"0".repeat(64)}` as Hex;

function mapDealStatus(status: number, releasedAmount: bigint): DealStatus {
  if (status === 0) return "Draft";
  if (status === 1) return releasedAmount > 0n ? "In progress" : "Fully funded";
  if (status === 2) return "Completed";
  return "Refunded";
}

function mapMilestoneStatus(status: number): MilestoneStatus {
  if (status === 1) return "Ready for approval";
  if (status === 2) return "Released";
  if (status === 3) return "Refunded";
  if (status === 4) return "Disputed";
  if (status === 5) return "Resolved";
  return "Pending";
}

async function loadMetadata(metadataHash: Hex) {
  const response = await fetch(`/api/deals/metadata?hash=${metadataHash}`, { cache: "no-store" });
  if (!response.ok) return null;
  const body = (await response.json()) as { metadata?: ClearDealMetadata };
  return body.metadata ?? null;
}

export function useClearDeals(participant?: Address, focusedDealId?: bigint) {
  const publicClient = usePublicClient();
  const [deals, setDeals] = useState<ClearDealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!publicClient || !clearDealEscrowAddress) {
      setDeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const contract = clearDealEscrowAddress;
      let dealIds: readonly bigint[] = [];
      if (participant) {
        const dealCount = await publicClient.readContract({
          address: contract,
          abi: clearDealEscrowAbi,
          functionName: "participantDealCount",
          args: [participant],
        });
        const offset = dealCount > 50n ? dealCount - 50n : 0n;
        dealIds = await publicClient.readContract({
          address: contract,
          abi: clearDealEscrowAbi,
          functionName: "getDealIds",
          args: [participant, offset, 50n],
        });
      }
      const uniqueDealIds = [...dealIds];
      if (focusedDealId !== undefined && focusedDealId >= 0n) {
        const nextDealId = await publicClient.readContract({
          address: contract,
          abi: clearDealEscrowAbi,
          functionName: "nextDealId",
        });
        if (focusedDealId >= nextDealId) {
          throw new Error(
            `Project #${focusedDealId.toString()} does not exist on this ClearDeal contract.`,
          );
        }
        if (!uniqueDealIds.some((dealId) => dealId === focusedDealId)) {
          uniqueDealIds.push(focusedDealId);
        }
      }

      const records = await Promise.all([...uniqueDealIds].reverse().map(async (dealId) => {
        const rawDeal = await publicClient.readContract({
          address: contract,
          abi: clearDealEscrowAbi,
          functionName: "deals",
          args: [dealId],
        });
        const [
          buyer,
          seller,
          arbitrator,
          totalAmount,
          releasedAmount,
          refundedAmount,
          metadataHash,
          createdAt,
          refundDeadline,
          reviewPeriod,
          milestoneCount,
          maxRevisions,
          rawStatus,
          refundRequested,
        ] = rawDeal;
        const metadata = await loadMetadata(metadataHash);
        const milestones = await Promise.all(Array.from({ length: Number(milestoneCount) }, async (_, index) => {
          const rawMilestone = await publicClient.readContract({
            address: contract,
            abi: clearDealEscrowAbi,
            functionName: "milestones",
            args: [dealId, BigInt(index)],
          });
          const [recipient, amount, dueAt, submittedAt, reviewDeadline, revisionCount, deliverableHash, milestoneStatus] = rawMilestone;
          return {
            id: BigInt(index),
            title: metadata?.milestones[index]?.title ?? `Milestone ${index + 1}`,
            recipient,
            amount,
            dueAt: Number(dueAt),
            submittedAt: Number(submittedAt),
            reviewDeadline: Number(reviewDeadline),
            revisionCount: Number(revisionCount),
            deliverableHash: deliverableHash || EMPTY_HASH,
            status: mapMilestoneStatus(milestoneStatus),
            deliverable: metadata?.milestones[index]?.deliverable,
            acceptanceCriteria:
              metadata?.milestones[index]?.acceptanceCriteria,
          } satisfies ClearDealMilestone;
        }));

        return {
          id: dealId,
          client: metadata?.client ?? shortFallback(buyer),
          team: metadata?.team ?? shortFallback(seller),
          title: metadata?.title ?? `Deal #${dealId}`,
          category: metadata?.category,
          summary: metadata?.summary,
          buyer,
          seller,
          arbitrator,
          totalAmount,
          releasedAmount,
          refundedAmount,
          metadataHash,
          createdAt: Number(createdAt),
          refundDeadline: Number(refundDeadline),
          reviewPeriod: Number(reviewPeriod),
          maxRevisions: Number(maxRevisions),
          refundRequested,
          status: milestones.some((milestone) => milestone.status === "Disputed")
            ? "Disputed"
            : mapDealStatus(rawStatus, releasedAmount),
          metadataAvailable: Boolean(metadata),
          milestones,
        } satisfies ClearDealRecord;
      }));
      setDeals(records);
    } catch (cause) {
      setDeals([]);
      setError(cause instanceof Error ? cause.message : "Could not load onchain deals.");
    } finally {
      setLoading(false);
    }
  }, [focusedDealId, participant, publicClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { deals, loading, error, refresh };
}

function shortFallback(address: Address) {
  return `Wallet ${address.slice(0, 6)}…${address.slice(-4)}`;
}
