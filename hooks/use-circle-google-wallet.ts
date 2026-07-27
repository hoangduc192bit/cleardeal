"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";

import { isCircleGoogleWalletConfigured } from "@/lib/circle-google-client";

const GOOGLE_WALLET_EVENT = "cleardeal:google-wallet-changed";

type GoogleWalletResponse = {
  authenticated?: boolean;
  wallets?: Array<{
    id?: string;
    address?: string;
    blockchain?: string;
  }>;
};

export function notifyCircleGoogleWalletChanged() {
  window.dispatchEvent(new Event(GOOGLE_WALLET_EVENT));
}

export function useCircleGoogleWallet() {
  const [address, setAddress] = useState<Address>();
  const [walletId, setWalletId] = useState<string>();
  const [loading, setLoading] = useState(isCircleGoogleWalletConfigured);

  const refresh = useCallback(async () => {
    if (!isCircleGoogleWalletConfigured) {
      setAddress(undefined);
      setWalletId(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/wallets/google", {
        cache: "no-store",
      });
      const data = (await response.json()) as GoogleWalletResponse;
      const wallet = data.wallets?.find(
        (item) =>
          item.blockchain === "ARC-TESTNET" &&
          typeof item.address === "string" &&
          /^0x[0-9a-fA-F]{40}$/.test(item.address),
      );
      if (response.ok && data.authenticated && wallet?.address && wallet.id) {
        setAddress(wallet.address as Address);
        setWalletId(wallet.id);
      } else {
        setAddress(undefined);
        setWalletId(undefined);
      }
    } catch {
      setAddress(undefined);
      setWalletId(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handleChange = () => void refresh();
    window.addEventListener(GOOGLE_WALLET_EVENT, handleChange);
    return () => window.removeEventListener(GOOGLE_WALLET_EVENT, handleChange);
  }, [refresh]);

  return {
    address,
    walletId,
    isConnected: Boolean(address && walletId),
    loading,
    refresh,
  };
}
