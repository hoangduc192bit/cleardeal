"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address, Hex } from "viem";

import {
  clearDealTreasuryAbi,
  clearDealTreasuryAddress,
} from "@/lib/treasury-contract";
import {
  mapExpenseStatus,
  type ExpenseRecord,
} from "@/lib/expense-data";
import type { ExpenseMetadata } from "@/lib/expense-metadata";
import type { ExpenseEvidence } from "@/lib/expense-evidence";
import {
  createRpcReadQueue,
  mapWithConcurrency,
} from "@/lib/arc-rpc";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = `0x${"0".repeat(64)}`;

async function loadMetadata(hash: Hex) {
  const response = await fetch(`/api/expenses/metadata?hash=${hash}`, {
    cache: "no-store",
  });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { metadata?: ExpenseMetadata };
  return body.metadata;
}

async function loadEvidence(hash: Hex) {
  if (hash.toLowerCase() === ZERO_HASH) return undefined;
  const response = await fetch(`/api/expenses/evidence?hash=${hash}`, {
    cache: "no-store",
  });
  if (!response.ok) return undefined;
  const body = (await response.json()) as {
    evidence?: ExpenseEvidence;
  };
  return body.evidence;
}

export function useExpenseRequests(
  account?: Address,
  requestedExpenseId?: bigint,
) {
  const publicClient = usePublicClient();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (
      (!account && requestedExpenseId === undefined) ||
      !publicClient ||
      !clearDealTreasuryAddress
    ) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const contract = clearDealTreasuryAddress;
      const rpcRead = createRpcReadQueue();
      let ids: readonly bigint[] = [];
      if (account) {
        const count = await rpcRead(() =>
          publicClient.readContract({
            address: contract,
            abi: clearDealTreasuryAbi,
            functionName: "roleExpenseCount",
            args: [account],
          }),
        );
        const offset = count > 50n ? count - 50n : 0n;
        ids = await rpcRead(() =>
          publicClient.readContract({
            address: contract,
            abi: clearDealTreasuryAbi,
            functionName: "getExpenseIds",
            args: [account, offset, 50n],
          }),
        );
      }
      const requestedIds =
        requestedExpenseId === undefined ||
        ids.some((id) => id === requestedExpenseId)
          ? [...ids]
          : [...ids, requestedExpenseId];
      const orderedIds = [...requestedIds].reverse();
      const records = await mapWithConcurrency(
        orderedIds,
        2,
        async (expenseId) => {
          const raw = await rpcRead(() =>
            publicClient.readContract({
              address: contract,
              abi: clearDealTreasuryAbi,
              functionName: "expenses",
              args: [expenseId],
            }),
          );
          if (raw[0].toLowerCase() === ZERO_ADDRESS) {
            throw new Error(
              `Expense request #${expenseId.toString()} does not exist.`,
            );
          }
          const [
            requester,
            manager,
            finance,
            vendor,
            metadataHash,
            evidenceHash,
            memoId,
            createdAt,
            approvedBudget,
            payoutAmount,
            rawStatus,
          ] = raw;
          const [metadata, evidence] = await Promise.all([
            loadMetadata(metadataHash),
            loadEvidence(evidenceHash),
          ]);
          return {
            id: expenseId,
            requester,
            manager,
            finance,
            vendor,
            metadataHash,
            evidenceHash,
            memoId,
            createdAt: Number(createdAt),
            approvedBudget,
            payoutAmount,
            status: mapExpenseStatus(Number(rawStatus)),
            metadata,
            evidence,
          } satisfies ExpenseRecord;
        },
      );
      setExpenses(records);
    } catch (cause) {
      setExpenses([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load expense requests from Arc Testnet.",
      );
    } finally {
      setLoading(false);
    }
  }, [account, publicClient, requestedExpenseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { expenses, loading, error, refresh };
}
