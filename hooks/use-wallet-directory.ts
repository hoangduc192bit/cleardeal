"use client";

import { useCallback, useEffect, useState } from "react";
import { getAddress, isAddress, type Address } from "viem";

const STORAGE_KEY = "cleardeal:wallet-directory:v1";

export const walletDirectoryCategories = [
  "Team",
  "Customer",
  "Vendor",
  "Other",
] as const;

export type WalletDirectoryCategory =
  (typeof walletDirectoryCategories)[number];

export interface WalletDirectoryEntry {
  name: string;
  address: Address;
  category: WalletDirectoryCategory;
  updatedAt: number;
}

function isCategory(value: unknown): value is WalletDirectoryCategory {
  return walletDirectoryCategories.includes(
    value as WalletDirectoryCategory,
  );
}

function readDirectory() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): WalletDirectoryEntry[] => {
      if (
        !item ||
        typeof item !== "object" ||
        !("name" in item) ||
        !("address" in item) ||
        !("category" in item) ||
        typeof item.name !== "string" ||
        typeof item.address !== "string" ||
        !isAddress(item.address) ||
        !isCategory(item.category)
      ) {
        return [];
      }
      return [
        {
          name: item.name.slice(0, 80),
          address: getAddress(item.address),
          category: item.category,
          updatedAt:
            "updatedAt" in item && typeof item.updatedAt === "number"
              ? item.updatedAt
              : 0,
        },
      ];
    });
  } catch {
    return [];
  }
}

function sortDirectory(entries: WalletDirectoryEntry[]) {
  return [...entries].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function useWalletDirectory() {
  const [entries, setEntries] = useState<WalletDirectoryEntry[]>([]);

  useEffect(() => {
    setEntries(sortDirectory(readDirectory()));
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setEntries(sortDirectory(readDirectory()));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const saveEntry = useCallback(
    (input: {
      name: string;
      address: string;
      category: WalletDirectoryCategory;
    }) => {
      const name = input.name.trim();
      if (name.length < 2 || name.length > 80) {
        throw new Error("Use a name between 2 and 80 characters.");
      }
      if (!isAddress(input.address)) {
        throw new Error("Add a valid wallet address.");
      }
      const address = getAddress(input.address);
      const duplicateName = entries.find(
        (entry) =>
          entry.name.toLowerCase() === name.toLowerCase() &&
          entry.address.toLowerCase() !== address.toLowerCase(),
      );
      if (duplicateName) {
        throw new Error("That name is already assigned to another wallet.");
      }
      const next = sortDirectory([
        ...entries.filter(
          (entry) =>
            entry.address.toLowerCase() !== address.toLowerCase(),
        ),
        {
          name,
          address,
          category: input.category,
          updatedAt: Date.now(),
        },
      ]);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setEntries(next);
    },
    [entries],
  );

  const removeEntry = useCallback(
    (address: Address) => {
      const next = entries.filter(
        (entry) =>
          entry.address.toLowerCase() !== address.toLowerCase(),
      );
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setEntries(next);
    },
    [entries],
  );

  return { entries, saveEntry, removeEntry };
}
