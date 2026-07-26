"use client";

import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import type {
  LoginCompleteCallback,
  SocialLoginResult,
} from "@circle-fin/w3s-pw-web-sdk/dist/src/types";

const DEVICE_STORAGE_KEY = "cleardeal.google-wallet-device";
const PENDING_STORAGE_KEY = "cleardeal.google-wallet-pending";
const RETURN_STORAGE_KEY = "cleardeal.google-wallet-return";

type DeviceCredentials = {
  deviceToken: string;
  deviceEncryptionKey: string;
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

function readDeviceCredentials() {
  try {
    const value = sessionStorage.getItem(DEVICE_STORAGE_KEY);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as DeviceCredentials;
    if (!parsed.deviceToken || !parsed.deviceEncryptionKey) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeDeviceCredentials(credentials: DeviceCredentials) {
  sessionStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(credentials));
}

async function createSdk(onLoginComplete: LoginCompleteCallback) {
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
  const credentials = readDeviceCredentials();

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

export async function startCircleGoogleLogin(returnTo = "/dashboard") {
  if (!isCircleGoogleWalletConfigured) {
    throw new Error("Google wallet is not configured.");
  }

  const sdk = await createSdk(() => undefined);
  const deviceId = await sdk.getDeviceId();
  const data = await postWalletAction({
    action: "createDeviceToken",
    deviceId,
  });
  const credentials = {
    deviceToken: String(data.deviceToken ?? ""),
    deviceEncryptionKey: String(data.deviceEncryptionKey ?? ""),
  };
  if (!credentials.deviceToken || !credentials.deviceEncryptionKey) {
    throw new Error("Circle did not return device credentials.");
  }

  writeDeviceCredentials(credentials);
  sessionStorage.setItem(PENDING_STORAGE_KEY, String(Date.now()));
  sessionStorage.setItem(
    RETURN_STORAGE_KEY,
    returnTo.startsWith("/") ? returnTo : "/dashboard",
  );

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

function executeChallenge(
  sdk: W3SSdk,
  challengeId: string,
  login: SocialLoginResult,
) {
  sdk.setAuthentication({
    userToken: login.userToken,
    encryptionKey: login.encryptionKey,
  });

  return new Promise<void>((resolve, reject) => {
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

    sdk.execute(challengeId, (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (error) {
        reject(new Error(error.message || "Wallet creation was cancelled."));
        return;
      }
      resolve();
    });
  });
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

function finishRedirect(status: "ready" | "error", message?: string) {
  const returnTo =
    sessionStorage.getItem(RETURN_STORAGE_KEY) ?? "/dashboard";
  sessionStorage.removeItem(PENDING_STORAGE_KEY);
  sessionStorage.removeItem(RETURN_STORAGE_KEY);
  sessionStorage.removeItem(DEVICE_STORAGE_KEY);

  const url = new URL(
    returnTo.startsWith("/") ? returnTo : "/dashboard",
    window.location.origin,
  );
  url.searchParams.set("google_wallet", status);
  if (message) {
    url.searchParams.set("google_wallet_message", message.slice(0, 180));
  }
  window.location.replace(url.toString());
}

export async function resumeCircleGoogleLogin() {
  const pendingValue = sessionStorage.getItem(PENDING_STORAGE_KEY);
  if (!isCircleGoogleWalletConfigured || !pendingValue) {
    return false;
  }

  const startedAt = Number(pendingValue);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt > 2 * 60_000) {
    finishRedirect(
      "error",
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
      finishRedirect("error", error?.message ?? "Google sign-in failed.");
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
      finishRedirect("ready");
    } catch (cause) {
      finishRedirect(
        "error",
        cause instanceof Error ? cause.message : "Google wallet setup failed.",
      );
    }
  };

  sdk = await createSdk(onLoginComplete);
  await sdk.getDeviceId();
  if (!callbackStarted) {
    loginWatchdog = window.setTimeout(() => {
      finishRedirect(
        "error",
        "Google returned to ClearDeal, but Circle did not finish the login. Please try again.",
      );
    }, 30_000);
  }
  return true;
}
