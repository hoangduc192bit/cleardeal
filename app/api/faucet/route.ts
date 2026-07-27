import { isAddress } from "viem";

import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CIRCLE_FAUCET_URL = "https://api.circle.com/v1/faucet/drips";
const ARC_BLOCKCHAIN = "ARC-TESTNET";

function noStore(data: unknown, status = 200) {
  return Response.json(data, {
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

function circleErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return "Circle Faucet could not process this request.";
  }
  const value = data as {
    message?: string;
    error?: string | { message?: string };
  };
  if (typeof value.error === "string") return value.error;
  return (
    value.message ??
    value.error?.message ??
    "Circle Faucet could not process this request."
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return noStore({ error: "invalid_request_origin" }, 403);
  }

  const limited = await rateLimit(request, {
    key: "arc-faucet",
    limit: 5,
    windowSeconds: 3_600,
  });
  if (limited) return limited;

  let body: { address?: unknown };
  try {
    body = (await request.json()) as { address?: unknown };
  } catch {
    return noStore({ error: "invalid_json_body" }, 400);
  }

  const address =
    typeof body.address === "string" ? body.address.trim() : "";
  if (!isAddress(address)) {
    return noStore({ error: "invalid_wallet_address" }, 400);
  }

  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) {
    return noStore(
      {
        error: "circle_api_not_configured",
        message: "Use the public Circle Faucet to fund this wallet.",
        faucetUrl: "https://faucet.circle.com",
      },
      503,
    );
  }

  const response = await fetch(CIRCLE_FAUCET_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address,
      blockchain: ARC_BLOCKCHAIN,
      native: true,
      usdc: true,
      eurc: false,
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    return noStore(
      {
        error: "circle_faucet_failed",
        message: circleErrorMessage(data),
        faucetUrl: "https://faucet.circle.com",
      },
      response.status >= 400 && response.status < 500
        ? response.status
        : 502,
    );
  }

  return noStore({
    requested: true,
    address,
    blockchain: ARC_BLOCKCHAIN,
    message:
      "Circle accepted the request. Test USDC may take a short time to appear.",
  });
}
