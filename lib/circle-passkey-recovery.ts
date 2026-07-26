"use client";

import { createPublicClient, type Address, type Hex } from "viem";
import {
  english,
  generateMnemonic,
  mnemonicToAccount,
} from "viem/accounts";
import {
  createBundlerClient,
  toWebAuthnAccount,
} from "viem/account-abstraction";

import { arcTestnet } from "@/config/chain";
import {
  isValidRecoveryPhrase,
  normalizeRecoveryPhrase,
} from "@/lib/passkey-recovery-phrase";

type RecoveryResult = {
  walletAddress: Address;
  recoveryAddress: Address;
  userOperationHash: Hex;
  transactionHash?: Hex;
};

type RecoveryActionsClient = {
  executeRecovery(parameters: unknown): Promise<Hex>;
  registerRecoveryAddress(parameters: unknown): Promise<Hex>;
};

function recoveryConfiguration() {
  const clientKey =
    process.env.NEXT_PUBLIC_CIRCLE_MODULAR_CLIENT_KEY?.trim();
  const clientUrl =
    process.env.NEXT_PUBLIC_CIRCLE_MODULAR_CLIENT_URL?.trim();
  if (!clientKey || !clientUrl) {
    throw new Error("circle_recovery_not_configured");
  }
  return { clientKey, clientUrl: clientUrl.replace(/\/$/, "") };
}

async function recoveryInfrastructure() {
  const circle = await import("@circle-fin/modular-wallets-core");
  const { clientKey, clientUrl } = recoveryConfiguration();
  const modularTransport = circle.toModularTransport(
    `${clientUrl}/arcTestnet`,
    clientKey,
  );
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: modularTransport as never,
  });
  const passkeyTransport = circle.toPasskeyTransport(clientUrl, clientKey);

  return {
    circle,
    modularTransport,
    passkeyTransport,
    publicClient,
  };
}

function transactionHashFromReceipt(receipt: unknown) {
  if (!receipt || typeof receipt !== "object") return undefined;
  const value = receipt as {
    receipt?: { transactionHash?: unknown };
  };
  return typeof value.receipt?.transactionHash === "string"
    ? (value.receipt.transactionHash as Hex)
    : undefined;
}

export function createRecoveryPhrase() {
  return generateMnemonic(english);
}

export async function registerPasskeyRecovery(
  recoveryPhrase: string,
): Promise<RecoveryResult> {
  const phrase = normalizeRecoveryPhrase(recoveryPhrase);
  if (!isValidRecoveryPhrase(phrase)) {
    throw new Error("invalid_recovery_phrase");
  }

  const {
    circle,
    modularTransport,
    passkeyTransport,
    publicClient,
  } = await recoveryInfrastructure();
  const credential = await circle.toWebAuthnCredential({
    mode: circle.WebAuthnMode.Login,
    transport: passkeyTransport,
  });
  const account = await circle.toCircleSmartAccount({
    client: publicClient as never,
    name: "ClearDeal account",
    owner: toWebAuthnAccount({
      credential: credential as never,
      rpId: credential.rpId,
    }) as never,
  });
  const bundlerClient = createBundlerClient({
    account: account as never,
    chain: arcTestnet,
    client: publicClient,
    paymaster: true,
    transport: modularTransport as never,
  });
  // modular-wallets-core currently bundles a different compatible viem minor.
  // Keep that unavoidable type boundary isolated to the SDK extension.
  const recoveryClient = bundlerClient.extend(
    circle.recoveryActions as never,
  ) as unknown as RecoveryActionsClient;
  const recoveryAccount = mnemonicToAccount(phrase);
  const userOperationHash = await recoveryClient.registerRecoveryAddress({
    account: account as never,
    recoveryAddress: recoveryAccount.address,
    paymaster: true,
  } as never);
  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOperationHash,
  });

  return {
    walletAddress: await account.getAddress(),
    recoveryAddress: recoveryAccount.address,
    userOperationHash,
    transactionHash: transactionHashFromReceipt(receipt),
  };
}

export async function recoverPasskeyWallet(
  recoveryPhrase: string,
): Promise<RecoveryResult> {
  const phrase = normalizeRecoveryPhrase(recoveryPhrase);
  if (!isValidRecoveryPhrase(phrase)) {
    throw new Error("invalid_recovery_phrase");
  }

  const {
    circle,
    modularTransport,
    passkeyTransport,
    publicClient,
  } = await recoveryInfrastructure();
  const recoveryAccount = mnemonicToAccount(phrase);
  const temporaryAccount = await circle.toCircleSmartAccount({
    client: publicClient as never,
    owner: recoveryAccount as never,
  });
  const credential = await circle.toWebAuthnCredential({
    mode: circle.WebAuthnMode.Register,
    transport: passkeyTransport,
    username: `cleardeal-recovered-${window.crypto.randomUUID()}`,
  });
  const bundlerClient = createBundlerClient({
    account: temporaryAccount as never,
    chain: arcTestnet,
    client: publicClient,
    paymaster: true,
    transport: modularTransport as never,
  });
  const recoveryClient = bundlerClient.extend(
    circle.recoveryActions as never,
  ) as unknown as RecoveryActionsClient;
  const userOperationHash = await recoveryClient.executeRecovery({
    account: temporaryAccount as never,
    credential,
    paymaster: true,
  } as never);
  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOperationHash,
  });
  const recoveredAccount = await circle.toCircleSmartAccount({
    client: publicClient as never,
    name: "ClearDeal account",
    owner: toWebAuthnAccount({
      credential: credential as never,
      rpId: credential.rpId,
    }) as never,
  });

  return {
    walletAddress: await recoveredAccount.getAddress(),
    recoveryAddress: recoveryAccount.address,
    userOperationHash,
    transactionHash: transactionHashFromReceipt(receipt),
  };
}

export function friendlyRecoveryError(error: unknown) {
  const name =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";
  const message = error instanceof Error ? error.message : String(error);

  if (name === "NotAllowedError") {
    return "The passkey request was cancelled or timed out. Try again when your device is ready.";
  }
  if (name === "SecurityError") {
    return "This passkey belongs to a different website domain. Open the production ClearDeal URL and try again.";
  }
  if (message.includes("invalid_recovery_phrase")) {
    return "That recovery phrase is not valid. Check the 12 words and their order.";
  }
  if (message.includes("circle_recovery_not_configured")) {
    return "Passkey recovery is not configured for this deployment.";
  }
  if (message.includes("AA33") || message.toLowerCase().includes("paymaster")) {
    return "Arc could not sponsor the recovery transaction. Please try again shortly.";
  }
  return "Recovery could not be completed. No recovery phrase was stored. Please try again.";
}
