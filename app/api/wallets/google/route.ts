import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  CIRCLE_GOOGLE_COOKIE,
  CIRCLE_GOOGLE_SESSION_SECONDS,
  openCircleGoogleSession,
  sealCircleGoogleSession,
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

export async function GET() {
  if (!configured()) {
    return noStore(
      { configured: false, authenticated: false, wallets: [] },
      503,
    );
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

  const limited = await rateLimit(request, {
    key: "circle-google-wallet",
    limit: 20,
    windowSeconds: 60,
  });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return noStore({ error: "invalid_json_body" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";

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
    return noStore(data.data);
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

  return noStore({ error: "unknown_wallet_action" }, 400);
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return noStore({ error: "invalid_request_origin" }, 403);
  }
  await clearSessionCookie();
  return noStore({ signedOut: true });
}
