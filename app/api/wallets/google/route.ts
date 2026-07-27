import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  CIRCLE_GOOGLE_COOKIE,
  CIRCLE_GOOGLE_FLOW_COOKIE,
  CIRCLE_GOOGLE_FLOW_SECONDS,
  CIRCLE_GOOGLE_SESSION_SECONDS,
  openCircleGoogleFlow,
  openCircleGoogleSession,
  sealCircleGoogleFlow,
  sealCircleGoogleSession,
  type CircleGoogleFlow,
  type CircleGoogleSession,
} from "@/lib/circle-google-session";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CIRCLE_BASE_URL = "https://api.circle.com";
const ARC_BLOCKCHAIN = "ARC-TESTNET";

type CircleWallet = {
  id: string;
  address: string;
  blockchain: string;
  accountType?: string;
  state?: string;
};

function configured() {
  return Boolean(
    process.env.CIRCLE_API_KEY?.trim() &&
      process.env.NEXT_PUBLIC_CIRCLE_APP_ID?.trim() &&
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim(),
  );
}

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";

  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function circleRequest(
  path: string,
  init: RequestInit,
  userToken?: string,
) {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      data: { error: "circle_api_not_configured" },
    };
  }

  const response = await fetch(`${CIRCLE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(userToken ? { "X-User-Token": userToken } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({
    error: "circle_returned_invalid_json",
  }));

  return { ok: response.ok, status: response.status, data };
}

function circleErrorCode(data: unknown) {
  if (!data || typeof data !== "object") return undefined;
  const value = data as {
    code?: number;
    error?: { code?: number };
    data?: { code?: number };
  };
  return value.code ?? value.error?.code ?? value.data?.code;
}

function circleErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") return "Circle request failed.";
  const value = data as {
    message?: string;
    error?: string | { message?: string };
  };
  if (typeof value.error === "string") return value.error;
  return value.message ?? value.error?.message ?? "Circle request failed.";
}

function validChallengeId(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{1,128}$/.test(value);
}

function validContractAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function validCallData(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^0x(?:[0-9a-fA-F]{2})*$/.test(value) &&
    value.length <= 131_074
  );
}

async function currentSession() {
  const cookieStore = await cookies();
  return openCircleGoogleSession(
    cookieStore.get(CIRCLE_GOOGLE_COOKIE)?.value,
  );
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CIRCLE_GOOGLE_COOKIE);
}

async function currentFlow() {
  const cookieStore = await cookies();
  return openCircleGoogleFlow(
    cookieStore.get(CIRCLE_GOOGLE_FLOW_COOKIE)?.value,
  );
}

async function clearFlowCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CIRCLE_GOOGLE_FLOW_COOKIE);
}

function safeReturnTo(value: unknown) {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    value.length <= 1024
  ) {
    return value;
  }
  return "/dashboard";
}

async function listArcWallets(userToken: string) {
  const result = await circleRequest(
    "/v1/w3s/wallets",
    { method: "GET" },
    userToken,
  );

  if (!result.ok) return result;

  const responseData = result.data as {
    data?: { wallets?: CircleWallet[] };
  };
  const wallets = (responseData.data?.wallets ?? []).filter(
    (wallet) => wallet.blockchain === ARC_BLOCKCHAIN,
  );

  return {
    ok: true,
    status: 200,
    data: { wallets },
  };
}

export async function GET(request: Request) {
  if (!configured()) {
    return noStore(
      { configured: false, authenticated: false, wallets: [] },
      503,
    );
  }

  if (new URL(request.url).searchParams.get("flow") === "1") {
    const flow = await currentFlow();
    if (!flow) {
      await clearFlowCookie();
      return noStore({ pending: false });
    }
    return noStore({
      pending: true,
      deviceToken: flow.deviceToken,
      deviceEncryptionKey: flow.deviceEncryptionKey,
      returnTo: flow.returnTo,
      startedAt: flow.startedAt,
    });
  }

  const session = await currentSession();
  if (!session) {
    await clearSessionCookie();
    return noStore({
      configured: true,
      authenticated: false,
      wallets: [],
    });
  }

  const walletsResult = await listArcWallets(session.userToken);
  if (!walletsResult.ok) {
    if (walletsResult.status === 401) await clearSessionCookie();
    return noStore(
      {
        configured: true,
        authenticated: false,
        error: circleErrorMessage(walletsResult.data),
        wallets: [],
      },
      walletsResult.status,
    );
  }

  const wallets = (walletsResult.data as { wallets: CircleWallet[] }).wallets;
  return noStore({
    configured: true,
    authenticated: true,
    profile: { email: session.email, name: session.name },
    wallets,
  });
}

export async function POST(request: Request) {
  if (!configured()) {
    return noStore({ error: "circle_google_wallet_not_configured" }, 503);
  }
  if (!sameOrigin(request)) {
    return noStore({ error: "invalid_request_origin" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return noStore({ error: "invalid_json_body" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const limited = await rateLimit(request, {
    key: `circle-google-wallet:${action || "unknown"}`,
    limit: action === "transactionStatus" ? 90 : 20,
    windowSeconds: 60,
  });
  if (limited) return limited;

  if (action === "createDeviceToken") {
    const deviceId =
      typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    if (!deviceId || deviceId.length > 512) {
      return noStore({ error: "invalid_device_id" }, 400);
    }

    const result = await circleRequest(
      "/v1/w3s/users/social/token",
      {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          deviceId,
        }),
      },
    );
    if (!result.ok) {
      return noStore(
        {
          error: "device_token_failed",
          message: circleErrorMessage(result.data),
        },
        result.status,
      );
    }

    const data = result.data as {
      data?: {
        deviceToken?: string;
        deviceEncryptionKey?: string;
      };
    };
    if (!data.data?.deviceToken || !data.data.deviceEncryptionKey) {
      return noStore({ error: "invalid_device_token_response" }, 502);
    }

    const flow: CircleGoogleFlow = {
      deviceToken: data.data.deviceToken,
      deviceEncryptionKey: data.data.deviceEncryptionKey,
      returnTo: safeReturnTo(body.returnTo),
      startedAt: Date.now(),
      expiresAt: Date.now() + CIRCLE_GOOGLE_FLOW_SECONDS * 1000,
    };
    const cookieStore = await cookies();
    cookieStore.set(CIRCLE_GOOGLE_FLOW_COOKIE, sealCircleGoogleFlow(flow), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CIRCLE_GOOGLE_FLOW_SECONDS,
    });

    return noStore(data.data);
  }

  if (action === "clearFlow") {
    await clearFlowCookie();
    return noStore({ cleared: true });
  }

  if (action === "storeSession") {
    const userToken =
      typeof body.userToken === "string" ? body.userToken.trim() : "";
    const encryptionKey =
      typeof body.encryptionKey === "string"
        ? body.encryptionKey.trim()
        : "";
    const refreshToken =
      typeof body.refreshToken === "string"
        ? body.refreshToken.trim()
        : undefined;
    const email =
      typeof body.email === "string" ? body.email.trim().slice(0, 254) : undefined;
    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, 120) : undefined;

    if (
      !userToken ||
      !encryptionKey ||
      userToken.length > 8192 ||
      encryptionKey.length > 8192
    ) {
      return noStore({ error: "invalid_google_wallet_session" }, 400);
    }

    const session: CircleGoogleSession = {
      userToken,
      encryptionKey,
      refreshToken,
      email,
      name,
      expiresAt: Date.now() + CIRCLE_GOOGLE_SESSION_SECONDS * 1000,
    };
    const cookieStore = await cookies();
    cookieStore.set(CIRCLE_GOOGLE_COOKIE, sealCircleGoogleSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CIRCLE_GOOGLE_SESSION_SECONDS,
    });

    return noStore({ stored: true });
  }

  const session = await currentSession();
  if (!session) {
    return noStore({ error: "google_wallet_session_expired" }, 401);
  }

  if (action === "initialize") {
    const result = await circleRequest(
      "/v1/w3s/user/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          accountType: "SCA",
          blockchains: [ARC_BLOCKCHAIN],
        }),
      },
      session.userToken,
    );

    if (!result.ok && circleErrorCode(result.data) !== 155106) {
      return noStore(
        {
          error: "wallet_initialization_failed",
          code: circleErrorCode(result.data),
          message: circleErrorMessage(result.data),
        },
        result.status,
      );
    }

    if (circleErrorCode(result.data) === 155106) {
      const walletsResult = await listArcWallets(session.userToken);
      if (!walletsResult.ok) {
        return noStore(
          {
            error: "wallet_lookup_failed",
            message: circleErrorMessage(walletsResult.data),
          },
          walletsResult.status,
        );
      }
      return noStore({
        alreadyInitialized: true,
        ...(walletsResult.data as object),
      });
    }

    const data = result.data as { data?: { challengeId?: string } };
    if (!data.data?.challengeId) {
      return noStore({ error: "missing_wallet_challenge" }, 502);
    }
    return noStore({ challengeId: data.data.challengeId });
  }

  if (action === "signMessage") {
    const message = typeof body.message === "string" ? body.message : "";
    if (!message || message.length > 16_384) {
      return noStore({ error: "invalid_message" }, 400);
    }

    const walletsResult = await listArcWallets(session.userToken);
    if (!walletsResult.ok) {
      return noStore(
        {
          error: "wallet_lookup_failed",
          message: circleErrorMessage(walletsResult.data),
        },
        walletsResult.status,
      );
    }
    const wallet = (walletsResult.data as { wallets: CircleWallet[] }).wallets[0];
    if (!wallet) return noStore({ error: "arc_wallet_not_found" }, 404);

    const result = await circleRequest(
      "/v1/w3s/user/sign/message",
      {
        method: "POST",
        body: JSON.stringify({
          walletId: wallet.id,
          message,
          encodedByHex: false,
          memo: "ClearDeal authorization",
        }),
      },
      session.userToken,
    );
    if (!result.ok) {
      return noStore(
        {
          error: "message_signing_failed",
          message: circleErrorMessage(result.data),
        },
        result.status,
      );
    }
    const data = result.data as { data?: { challengeId?: string } };
    if (!data.data?.challengeId) {
      return noStore({ error: "missing_signing_challenge" }, 502);
    }
    return noStore({
      challengeId: data.data.challengeId,
      userToken: session.userToken,
      encryptionKey: session.encryptionKey,
    });
  }

  if (action === "contractExecution") {
    if (!validContractAddress(body.contractAddress)) {
      return noStore({ error: "invalid_contract_address" }, 400);
    }
    if (!validCallData(body.callData)) {
      return noStore({ error: "invalid_contract_call_data" }, 400);
    }

    const walletsResult = await listArcWallets(session.userToken);
    if (!walletsResult.ok) {
      return noStore(
        {
          error: "wallet_lookup_failed",
          message: circleErrorMessage(walletsResult.data),
        },
        walletsResult.status,
      );
    }
    const wallet = (walletsResult.data as { wallets: CircleWallet[] }).wallets[0];
    if (!wallet) return noStore({ error: "arc_wallet_not_found" }, 404);

    const result = await circleRequest(
      "/v1/w3s/user/transactions/contractExecution",
      {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          contractAddress: body.contractAddress,
          walletId: wallet.id,
          callData: body.callData,
          feeLevel: "MEDIUM",
          refId: `cleardeal-${crypto.randomUUID()}`,
        }),
      },
      session.userToken,
    );
    if (!result.ok) {
      return noStore(
        {
          error: "contract_execution_failed",
          message: circleErrorMessage(result.data),
        },
        result.status,
      );
    }
    const data = result.data as { data?: { challengeId?: string } };
    if (!data.data?.challengeId) {
      return noStore({ error: "missing_contract_challenge" }, 502);
    }
    return noStore({
      challengeId: data.data.challengeId,
      userToken: session.userToken,
      encryptionKey: session.encryptionKey,
    });
  }

  if (action === "transactionStatus") {
    if (!validChallengeId(body.challengeId)) {
      return noStore({ error: "invalid_challenge_id" }, 400);
    }
    const challengeId = body.challengeId as string;
    const challengeResult = await circleRequest(
      `/v1/w3s/user/challenges/${encodeURIComponent(challengeId)}`,
      { method: "GET" },
      session.userToken,
    );
    if (!challengeResult.ok) {
      return noStore(
        {
          error: "challenge_lookup_failed",
          message: circleErrorMessage(challengeResult.data),
        },
        challengeResult.status,
      );
    }

    const challengeData = challengeResult.data as {
      data?: {
        challenge?: {
          status?: string;
          correlationIds?: string[];
        };
      };
    };
    const challenge = challengeData.data?.challenge;
    const transactionId = challenge?.correlationIds?.find((value) =>
      /^[a-zA-Z0-9-]{1,128}$/.test(value),
    );
    if (!transactionId) {
      return noStore({
        challengeStatus: challenge?.status ?? "PENDING",
      });
    }

    const transactionResult = await circleRequest(
      `/v1/w3s/transactions/${encodeURIComponent(transactionId)}`,
      { method: "GET" },
      session.userToken,
    );
    if (!transactionResult.ok) {
      return noStore(
        {
          error: "transaction_lookup_failed",
          message: circleErrorMessage(transactionResult.data),
        },
        transactionResult.status,
      );
    }
    const transactionData = transactionResult.data as {
      data?: {
        transaction?: {
          state?: string;
          txHash?: string;
          errorReason?: string;
        };
      };
    };
    const transaction = transactionData.data?.transaction;
    return noStore({
      challengeStatus: challenge?.status ?? "PENDING",
      transactionId,
      transactionState: transaction?.state ?? "PENDING",
      txHash: transaction?.txHash,
      errorReason: transaction?.errorReason,
    });
  }

  return noStore({ error: "unknown_wallet_action" }, 400);
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return noStore({ error: "invalid_request_origin" }, 403);
  }
  await clearSessionCookie();
  await clearFlowCookie();
  return noStore({ signedOut: true });
}
