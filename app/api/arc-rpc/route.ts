import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
  "net_version",
]);

const TRANSIENT_UPSTREAM = /request limit|rate limit|too many requests|temporarily unavailable|timeout/i;
const MAX_BODY_BYTES = 20_000;

export const dynamic = "force-dynamic";

function upstreamUrl() {
  const configured = process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.network";
  try {
    const url = new URL(configured);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return Response.json({ error: "rpc_request_too_large" }, { status: 413 });
  const limited = await rateLimit(request, { key: "arc-rpc-read", limit: 300, windowSeconds: 60 });
  if (limited) return limited;

  let body: { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }
  if (body.jsonrpc !== "2.0" || typeof body.method !== "string" || !ALLOWED_METHODS.has(body.method) || (body.params !== undefined && !Array.isArray(body.params))) {
    return Response.json({ error: "rpc_method_not_allowed" }, { status: 403 });
  }
  const upstream = upstreamUrl();
  if (!upstream) return Response.json({ error: "arc_rpc_not_configured" }, { status: 503 });
  const payload = JSON.stringify(body);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(upstream, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const responseBody = await response.text();
      const transient = response.status === 429 || response.status === 502 || response.status === 503 || TRANSIENT_UPSTREAM.test(responseBody);
      if (!transient || attempt === 4) {
        return new Response(responseBody, {
          status: response.ok ? 200 : 502,
          headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
        });
      }
    } catch (cause) {
      if (attempt === 4) return Response.json({ error: "arc_rpc_unavailable", message: cause instanceof Error ? cause.message : "Upstream RPC failed." }, { status: 502 });
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
  }

  return Response.json({ error: "arc_rpc_unavailable" }, { status: 502 });
}
