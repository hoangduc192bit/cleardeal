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
  if (status === 3) return "Refunded";
  if (status === 4) return "Disputed";
  return "Resolved";
}

function mapMilestoneStatus(status: number): MilestoneStatus {
  if (status === 1) return "Ready for approval";
  if (status === 2) return "Released";
  if (status === 3) return "Refunded";
  return "Pending";
}

async function loadMetadata(metadataHash: Hex) {
  const response = await fetch(`/api/deals/metadata?hash=${metadataHash}`, { cache: "no-store" });
  if (!response.ok) return null;
  const body = (await response.json()) as { metadata?: ClearDealMetadata };
  return body.metadata ?? null;
}

export function useClearDeals(participant?: Address) {
  const publicClient = usePublicClient();
  const [deals, setDeals] = useState<ClearDealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!participant || !publicClient || !clearDealEscrowAddress) {
      setDeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const contract = clearDealEscrowAddress;
      const dealCount = await publicClient.readContract({
        address: contract,
        abi: clearDealEscrowAbi,
        functionName: "participantDealCount",
        args: [participant],
      });
      const offset = dealCount > 50n ? dealCount - 50n : 0n;
      const dealIds = await publicClient.readContract({
        address: contract,
        abi: clearDealEscrowAbi,
        functionName: "getDealIds",
        args: [participant, offset, 50n],
      });

      const records = await Promise.all([...dealIds].reverse().map(async (dealId) => {
        const rawDeal = await publicClient.readContract({
          address: contract,
          abi: clearDealEscrowAbi,
          functionName: "deals",
          args: [dealId],
        });
        const [buyer, seller, arbitrator, totalAmount, releasedAmount, metadataHash, createdAt, refundDeadline, milestoneCount, rawStatus, refundRequested] = rawDeal;
        const metadata = await loadMetadata(metadataHash);
        const milestones = await Promise.all(Array.from({ length: Number(milestoneCount) }, async (_, index) => {
          const rawMilestone = await publicClient.readContract({
            address: contract,
            abi: clearDealEscrowAbi,
            functionName: "milestones",
            args: [dealId, BigInt(index)],
          });
          const [recipient, amount, dueAt, deliverableHash, milestoneStatus] = rawMilestone;
          return {
            id: BigInt(index),
            title: metadata?.milestones[index]?.title ?? `Milestone ${index + 1}`,
            recipient,
            amount,
            dueAt: Number(dueAt),
            deliverableHash: deliverableHash || EMPTY_HASH,
            status: mapMilestoneStatus(milestoneStatus),
          } satisfies ClearDealMilestone;
        }));

        return {
          id: dealId,
          client: metadata?.client ?? shortFallback(buyer),
          title: metadata?.title ?? `Deal #${dealId}`,
          buyer,
          seller,
          arbitrator,
          totalAmount,
          releasedAmount,
          metadataHash,
          createdAt: Number(createdAt),
          refundDeadline: Number(refundDeadline),
          refundRequested,
          status: mapDealStatus(rawStatus, releasedAmount),
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
  }, [participant, publicClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { deals, loading, error, refresh };
}

function shortFallback(address: Address) {
  return `Wallet ${address.slice(0, 6)}…${address.slice(-4)}`;
}
