"use client";

import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import type {
  ChallengeResult,
  LoginCompleteCallback,
  SignMessageResult,
  SignTransactionResult,
  SocialLoginResult,
} from "@circle-fin/w3s-pw-web-sdk/dist/src/types";
import type { Address, Hash } from "viem";

type DeviceCredentials = {
  deviceToken: string;
  deviceEncryptionKey: string;
};

type GoogleWalletFlow = DeviceCredentials & {
  pending: true;
  returnTo: string;
  startedAt: number;
};

export const isCircleGoogleWalletConfigured = Boolean(
  process.env.NEXT_PUBLIC_CIRCLE_APP_ID?.trim() &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim(),
);

function appId() {
  return process.env.NEXT_PUBLIC_CIRCLE_APP_ID?.trim() ?? "";
}

function googleClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

async function createSdk(
  onLoginComplete: LoginCompleteCallback,
  credentials?: DeviceCredentials,
) {
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");

  return new W3SSdk(
    {
      appSettings: { appId: appId() },
      loginConfigs: credentials
        ? {
            ...credentials,
            google: {
              clientId: googleClientId(),
              redirectUri: window.location.origin,
              selectAccountPrompt: true,
            },
          }
        : undefined,
    },
    onLoginComplete,
  );
}

async function postWalletAction(body: Record<string, unknown>) {
  const response = await fetch("/api/wallets/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Google wallet request failed.",
    );
  }
  return data;
}

async function getPendingFlow() {
  const response = await fetch("/api/wallets/google?flow=1", {
    cache: "no-store",
  });
  const data = (await response.json()) as Partial<GoogleWalletFlow> & {
    pending?: boolean;
  };
  if (
    !response.ok ||
    !data.pending ||
    !data.deviceToken ||
    !data.deviceEncryptionKey ||
    !data.returnTo ||
    !Number.isFinite(data.startedAt)
  ) {
    return undefined;
  }
  return data as GoogleWalletFlow;
}

export async function startCircleGoogleLogin(returnTo = "/dashboard") {
  if (!isCircleGoogleWalletConfigured) {
    throw new Error("Google wallet is not configured.");
  }

  const sdk = await createSdk(() => undefined);
  const deviceId = await sdk.getDeviceId();
  const data = await postWalletAction({
    action: "createDeviceToken",
    deviceId,
    returnTo:
      returnTo.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/dashboard",
  });
  const credentials = {
    deviceToken: String(data.deviceToken ?? ""),
    deviceEncryptionKey: String(data.deviceEncryptionKey ?? ""),
  };
  if (!credentials.deviceToken || !credentials.deviceEncryptionKey) {
    throw new Error("Circle did not return device credentials.");
  }

  sdk.updateConfigs({
    appSettings: { appId: appId() },
    loginConfigs: {
      ...credentials,
      google: {
        clientId: googleClientId(),
        redirectUri: window.location.origin,
        selectAccountPrompt: true,
      },
    },
  });

  const { SocialLoginProvider } = await import(
    "@circle-fin/w3s-pw-web-sdk/dist/src/types"
  );
  await sdk.performLogin(SocialLoginProvider.GOOGLE);
}

type CircleAuthentication = {
  userToken: string;
  encryptionKey: string;
};

type CircleChallengeResult =
  | ChallengeResult
  | SignMessageResult
  | SignTransactionResult;

function executeChallenge(
  sdk: W3SSdk,
  challengeId: string,
  authentication: CircleAuthentication,
) {
  sdk.setAuthentication({
    userToken: authentication.userToken,
    encryptionKey: authentication.encryptionKey,
  });

  return new Promise<CircleChallengeResult>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          "Circle approval timed out. Please close the wallet window and try again.",
        ),
      );
    }, 120_000);

    sdk.execute(challengeId, (error, result) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (error) {
        reject(new Error(error.message || "Wallet approval was cancelled."));
        return;
      }
      if (!result) {
        reject(new Error("Circle did not return the wallet approval result."));
        return;
      }
      resolve(result);
    });
  });
}

function challengeAuthentication(data: Record<string, unknown>) {
  const challengeId =
    typeof data.challengeId === "string" ? data.challengeId : "";
  const userToken = typeof data.userToken === "string" ? data.userToken : "";
  const encryptionKey =
    typeof data.encryptionKey === "string" ? data.encryptionKey : "";
  if (!challengeId || !userToken || !encryptionKey) {
    throw new Error("Circle did not return a valid wallet approval.");
  }
  return { challengeId, userToken, encryptionKey };
}

async function executeAuthenticatedChallenge(data: Record<string, unknown>) {
  const { challengeId, userToken, encryptionKey } =
    challengeAuthentication(data);
  const sdk = await createSdk(() => undefined);
  await sdk.getDeviceId();
  const result = await executeChallenge(sdk, challengeId, {
    userToken,
    encryptionKey,
  });
  return { challengeId, result };
}

export async function signCircleGoogleMessage(message: string) {
  const challenge = await postWalletAction({
    action: "signMessage",
    message,
  });
  const { result } = await executeAuthenticatedChallenge(challenge);
  const signature =
    "data" in result && result.data && "signature" in result.data
      ? result.data.signature
      : undefined;
  if (typeof signature !== "string" || !signature.startsWith("0x")) {
    throw new Error("Circle approved the message but returned no signature.");
  }
  return signature as Hash;
}

function failedStatus(status: unknown) {
  return (
    typeof status === "string" &&
    ["FAILED", "DENIED", "EXPIRED", "CANCELLED"].includes(status.toUpperCase())
  );
}

async function waitForCircleTransaction(challengeId: string) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const state = await postWalletAction({
      action: "transactionStatus",
      challengeId,
    });
    if (
      typeof state.txHash === "string" &&
      /^0x[0-9a-fA-F]{64}$/.test(state.txHash)
    ) {
      return state.txHash as Hash;
    }
    if (failedStatus(state.challengeStatus) || failedStatus(state.transactionState)) {
      throw new Error(
        typeof state.errorReason === "string"
          ? state.errorReason
          : "The Google wallet transaction was not completed.",
      );
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1_500));
  }
  throw new Error(
    "The wallet approved the transaction, but Arc is still processing it. Refresh shortly to see the result.",
  );
}

export async function executeCircleGoogleContract(input: {
  contractAddress: Address;
  callData: Hash;
}) {
  const challenge = await postWalletAction({
    action: "contractExecution",
    contractAddress: input.contractAddress,
    callData: input.callData,
  });
  const { challengeId } = await executeAuthenticatedChallenge(challenge);
  return waitForCircleTransaction(challengeId);
}

async function waitForWallet() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch("/api/wallets/google", {
      cache: "no-store",
    });
    const data = (await response.json()) as {
      authenticated?: boolean;
      wallets?: unknown[];
    };
    if (response.ok && data.authenticated && data.wallets?.length) return;
    await new Promise((resolve) => window.setTimeout(resolve, 1_000));
  }
  throw new Error("Wallet was created but is still being indexed by Circle.");
}

async function finishRedirect(
  status: "ready" | "error",
  returnTo: string,
  message?: string,
) {
  try {
    await postWalletAction({ action: "clearFlow" });
  } catch {
    // The short-lived encrypted cookie expires automatically.
  }
  const url = new URL(
    returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/dashboard",
    window.location.origin,
  );
  url.searchParams.set("google_wallet", status);
  if (message) {
    url.searchParams.set("google_wallet_message", message.slice(0, 180));
  }
  window.location.replace(url.toString());
}

export async function resumeCircleGoogleLogin() {
  if (!isCircleGoogleWalletConfigured) {
    return false;
  }

  const flow = await getPendingFlow();
  if (!flow) return false;

  if (Date.now() - flow.startedAt > 2 * 60_000) {
    await finishRedirect(
      "error",
      flow.returnTo,
      "The previous Google wallet setup expired. Please start again.",
    );
    return true;
  }

  let sdk: W3SSdk;
  let callbackStarted = false;
  let loginWatchdog: number | undefined;
  const onLoginComplete: LoginCompleteCallback = async (error, result) => {
    callbackStarted = true;
    window.clearTimeout(loginWatchdog);

    if (error || !result || !("oAuthInfo" in result)) {
      await finishRedirect(
        "error",
        flow.returnTo,
        error?.message ?? "Google sign-in failed.",
      );
      return;
    }

    const login = result as SocialLoginResult;
    try {
      await postWalletAction({
        action: "storeSession",
        userToken: login.userToken,
        encryptionKey: login.encryptionKey,
        refreshToken: login.refreshToken,
        email: login.oAuthInfo.socialUserInfo?.email,
        name: login.oAuthInfo.socialUserInfo?.name,
      });
      const initialized = await postWalletAction({ action: "initialize" });
      const challengeId =
        typeof initialized.challengeId === "string"
          ? initialized.challengeId
          : undefined;

      if (challengeId) {
        await executeChallenge(sdk, challengeId, login);
      }
      await waitForWallet();
      await finishRedirect("ready", flow.returnTo);
    } catch (cause) {
      await finishRedirect(
        "error",
        flow.returnTo,
        cause instanceof Error ? cause.message : "Google wallet setup failed.",
      );
    }
  };

  sdk = await createSdk(onLoginComplete, flow);
  if (!callbackStarted) {
    loginWatchdog = window.setTimeout(() => {
      void finishRedirect(
        "error",
        flow.returnTo,
        "Google returned to ClearDeal, but Circle did not finish the login. Please try again.",
      );
    }, 30_000);
  }
  return true;
}
