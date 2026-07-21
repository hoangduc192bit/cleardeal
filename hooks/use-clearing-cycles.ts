"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address, Hex } from "viem";

import { clearingHouseAbi, clearingHouseAddress } from "@/lib/clearing-contract";
import { mapCycleStatus, mapObligationStatus, type ClearingCycleRecord, type RiskPassportRecord } from "@/lib/clearing-data";
import type { ClearingMetadata } from "@/lib/clearing-metadata";
import { createRpcReadQueue, mapWithConcurrency } from "@/lib/arc-rpc";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function loadMetadata(hash: Hex) {
  const response = await fetch(`/api/clearing/metadata?hash=${hash}`, { cache: "no-store" });
  if (!response.ok) return undefined;
  const body = await response.json() as { metadata?: ClearingMetadata };
  return body.metadata;
}

export function useClearingCycles(account?: Address, requestedCycleId?: bigint) {
  const publicClient = usePublicClient();
  const [cycles, setCycles] = useState<ClearingCycleRecord[]>([]);
  const [passport, setPassport] = useState<RiskPassportRecord>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if ((!account && requestedCycleId === undefined) || !publicClient || !clearingHouseAddress) {
      setCycles([]);
      setPassport(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const contract = clearingHouseAddress;
      const rpcRead = createRpcReadQueue();
      let rawPassport: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
      let ids: readonly bigint[] = [];

      if (account) {
        const count = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "roleCycleCount", args: [account] }));
        rawPassport = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "riskPassports", args: [account] }));
        const offset = count > 50n ? count - 50n : 0n;
        ids = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "getCycleIds", args: [account, offset, 50n] }));
      }

      const requestedIds = requestedCycleId === undefined || ids.some((id) => id === requestedCycleId)
        ? [...ids]
        : [...ids, requestedCycleId];
      const orderedIds = [...requestedIds].reverse();
      const records = await mapWithConcurrency(orderedIds, 2, async (cycleId) => {
        const rawCycle = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "cycles", args: [cycleId] }));
        if (rawCycle[0].toLowerCase() === ZERO_ADDRESS) throw new Error(`Clearing cycle #${cycleId.toString()} does not exist.`);
        const participants = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "getParticipants", args: [cycleId] }));
        const verifiers = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "getVerifiers", args: [cycleId] }));
        const [creator, arbitrator, metadataHash, createdAt, evidenceDeadline, fundingDeadline, , , obligationCount, finalizedCount, verifierThreshold, rawStatus, totalGross, clearedGross, totalNetDebit, fundedNet] = rawCycle;
        const metadataPromise = loadMetadata(metadataHash);
        const obligationRecords = await mapWithConcurrency(Array.from({ length: Number(obligationCount) }, (_, index) => index), 2, async (index) => {
            const raw = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "obligations", args: [cycleId, BigInt(index)] }));
            const [payer, provider, amount, bondAmount, specHash, evidenceHash, approveVotes, rejectVotes, bondPosted, status] = raw;
            return {
              id: BigInt(index), payer, provider, amount, bondAmount, specHash, evidenceHash,
              approveVotes: Number(approveVotes), rejectVotes: Number(rejectVotes), bondPosted,
              status: mapObligationStatus(Number(status)),
              title: `Obligation ${index + 1}`,
              acceptance: "Terms are committed by the cycle metadata hash.",
            };
          });
        const positionRows = await mapWithConcurrency(participants, 2, async (participant) => {
            const position = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "netPositions", args: [cycleId, participant] }));
            const funded = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "netFunding", args: [cycleId, participant] }));
            return [participant.toLowerCase(), position, funded] as const;
          });
        const metadata = await metadataPromise;
        const obligations = obligationRecords.map((obligation, index) => ({
          ...obligation,
          title: metadata?.obligations[index]?.title ?? obligation.title,
          acceptance: metadata?.obligations[index]?.acceptance ?? obligation.acceptance,
        }));
        return {
          id: cycleId, creator, arbitrator, metadataHash, createdAt: Number(createdAt), evidenceDeadline: Number(evidenceDeadline), fundingDeadline: Number(fundingDeadline),
          verifierThreshold: Number(verifierThreshold), finalizedCount: Number(finalizedCount), status: mapCycleStatus(Number(rawStatus)),
          totalGross, clearedGross, totalNetDebit, fundedNet, participants: [...participants], verifiers: [...verifiers],
          positions: Object.fromEntries(positionRows.map(([address, position]) => [address, position])),
          funding: Object.fromEntries(positionRows.map(([address, , funded]) => [address, funded])),
          obligations, metadata,
        } satisfies ClearingCycleRecord;
      });
      setCycles(records);
      setPassport(rawPassport ? {
        passedObligations: rawPassport[0], failedObligations: rawPassport[1], fundedCycles: rawPassport[2], defaultedCycles: rawPassport[3],
        clearedVolume: rawPassport[4], slashedBond: rawPassport[5], netReceived: rawPassport[6],
      } : undefined);
    } catch (cause) {
      setCycles([]);
      setPassport(undefined);
      setError(cause instanceof Error ? cause.message : "Could not load clearing cycles from Arc Testnet.");
    } finally {
      setLoading(false);
    }
  }, [account, publicClient, requestedCycleId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { cycles, passport, loading, error, refresh };
}
