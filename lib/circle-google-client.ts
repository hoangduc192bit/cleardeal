"use client";

import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import type {
  LoginCompleteCallback,
  SocialLoginResult,
} from "@circle-fin/w3s-pw-web-sdk/dist/src/types";

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
