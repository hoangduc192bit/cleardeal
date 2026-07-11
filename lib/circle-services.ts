import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import { isIP } from "node:net";

const execFileAsync = promisify(execFile);

import { ExactEvmScheme } from "@x402/evm";
import { ExactEvmSchemeV1 } from "@x402/evm/exact/v1/client";
import { BatchEvmScheme, CompositeEvmScheme } from "@circle-fin/x402-batching/client";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import { privateKeyToAccount } from "viem/accounts";
import type { Hash, Address } from "viem";
import { sdkClient, circleWalletId, getCircleAgentWalletConfig } from "./circle-agent-wallet";

// Force Vercel to trace and package the CLI file
try {
  const dummyPath = path.resolve(process.cwd(), "node_modules", "@circle-fin", "cli", "dist", "index.js");
  if (fs.existsSync(dummyPath)) {
    fs.readFileSync(dummyPath, "utf8");
  }
} catch (e) {
  // Ignore
}

// Force Vercel node file tracer to bundle Circle CLI transitive dependencies
if (false) {
  try {
    require("cli-table3");
    require("@noble/curves");
    require("@noble/hashes");
    require("@solana/web3.js");
    require("@x402/core");
    require("@x402/evm");
    require("qrcode");
    require("node-forge");
    require("pino");
    require("semver");
    require("@circle-fin/x402-batching");
    require("rpc-websockets");
    require("zod");
    require("viem");
    require("abitype");
    require("bn.js");
    require("bs58");
    require("json-schema-faker");
    require("@ethersproject/address");
    require("@ethersproject/bytes");
    require("@ethersproject/units");
    require("@coral-xyz/anchor");
    require("@scure/bip32");
    require("@scure/bip39");
    require("@scure/base");
    require("isows");
    require("ws");
    require("ox");
    require("string-width");
  } catch (e) {}
}

export type CircleServiceMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface CircleServiceAccept {
  network?: string;
  amount?: string;
  payTo?: string;
  extra?: {
    name?: string;
    version?: string;
  };
}

export interface CircleServiceItem {
  resource: string;
  accepts?: CircleServiceAccept[];
  metadata?: {
    provider?: {
      name?: string;
      description?: string;
      website?: string;
      category?: string;
      tags?: string[];
    };
    method?: string;
    description?: string;
    input?: unknown;
    output?: unknown;
    supportsCircleGateway?: boolean;
    supportsVanillax402?: boolean;
  };
}

export interface NormalizedCircleService {
  resource: string;
  provider: string;
  providerDescription: string;
  method: CircleServiceMethod;
  description: string;
  category: string;
  tags: string[];
  priceUsdc: string | null;
  network: string | null;
  chain: string | null;
  scheme: string;
  supportsCircleGateway: boolean;
  supportsVanillax402: boolean;
  input?: unknown;
  output?: unknown;
}

export interface CircleInspectResult {
  status?: "payable" | "free" | "unavailable" | string;
  httpStatus?: number;
  url?: string;
  provider?: NormalizedCircleService["provider"];
  description?: string;
  method?: CircleServiceMethod;
  priceUsdc?: string | null;
  network?: string | null;
  chain?: string | null;
  scheme?: string;
  input?: unknown;
  output?: unknown;
  raw: unknown;
}

export interface CirclePayResult {
  raw: unknown;
}

const methodPattern = /^(GET|POST|PUT|DELETE|PATCH)$/;

export function isValidServiceUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
      return false;
    }

    if (isIP(hostname) === 4) {
      const octets = hostname.split(".").map(Number);
      const [a, b] = octets;
      if (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      ) {
        return false;
      }
    }

    if (isIP(hostname) === 6) {
      if (hostname === "::" || hostname === "::1" || hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd")) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function normalizeMethod(value: string | undefined): CircleServiceMethod {
  const method = (value ?? "GET").toUpperCase();
  if (!methodPattern.test(method)) return "GET";
  return method as CircleServiceMethod;
}

export function networkToChain(network?: string | null) {
  switch (network) {
    case "eip155:1":
      return "ETH";
    case "eip155:10":
      return "OP";
    case "eip155:130":
      return "UNI";
    case "eip155:137":
      return "MATIC";
    case "eip155:42161":
      return "ARB";
    case "eip155:43114":
      return "AVAX";
    case "eip155:8453":
      return "BASE";
    default:
      return null;
  }
}

export function microToUsdc(value?: string | null) {
  if (!value) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return (amount / 1_000_000).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function normalizeService(item: CircleServiceItem): NormalizedCircleService {
  const firstAccept = item.accepts?.[0];
  const method = normalizeMethod(item.metadata?.method);

  return {
    resource: item.resource,
    provider: cleanText(item.metadata?.provider?.name ?? "Unknown provider"),
    providerDescription: cleanText(item.metadata?.provider?.description ?? ""),
    method,
    description: cleanText(item.metadata?.description ?? "Paid x402 service"),
    category: item.metadata?.provider?.category ?? "UNKNOWN",
    tags: item.metadata?.provider?.tags?.slice(0, 8) ?? [],
    priceUsdc: microToUsdc(firstAccept?.amount),
    network: firstAccept?.network ?? null,
    chain: networkToChain(firstAccept?.network),
    scheme: firstAccept?.extra?.name ?? "x402",
    supportsCircleGateway: Boolean(item.metadata?.supportsCircleGateway),
    supportsVanillax402: Boolean(item.metadata?.supportsVanillax402),
    input: item.metadata?.input,
    output: item.metadata?.output,
  };
}

export async function searchCircleServices(query: string, limit = 6) {
  const params = new URLSearchParams({
    query: query.slice(0, 120),
    limit: String(Math.min(Math.max(limit, 1), 10)),
    siwx: "false"
  });
  const res = await fetch(`https://api.circle.com/v2/x402/discovery/resources?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Discovery API returned HTTP ${res.status}`);
  }
  const data = await res.json() as { items?: CircleServiceItem[] };
  return (data.items ?? []).map(normalizeService);
}

export async function inspectCircleService(params: {
  url: string;
  method?: CircleServiceMethod;
  data?: Record<string, unknown> | null;
}) {
  assertServiceUrl(params.url);

  // 1. Fetch discovery data directly from Circle Registry
  let discovery: any = null;
  try {
    const discoveryUrl = `https://api.circle.com/v2/x402/discovery/resources?query=${encodeURIComponent(params.url)}&limit=1&siwx=false`;
    const res = await fetch(discoveryUrl);
    if (res.ok) {
      const data = await res.json();
      const match = data.items?.find(
        (i: any) => i.resource === params.url || params.url.startsWith(i.resource)
      );
      discovery = match?.metadata ?? data.items?.[0]?.metadata ?? null;
    }
  } catch (e) {
    // Ignore discovery fetch failure
  }

  // 2. Probe endpoint
  let httpStatus = 0;
  let inspectStatus = "unavailable";
  let payment: any = null;
  try {
    const method = params.method ?? "GET";
    const headers: Record<string, string> = {
      "X-x402-Dry-Run": "true",
      "Content-Type": "application/json",
    };
    const body = params.data && Object.keys(params.data).length > 0
      ? JSON.stringify(params.data)
      : undefined;

    const res = await fetch(params.url, {
      method,
      headers,
      body,
    });
    httpStatus = res.status;

    if (httpStatus !== 402) {
      if (httpStatus >= 200 && httpStatus < 300) {
        inspectStatus = "free";
      } else {
        inspectStatus = "unavailable";
      }
    } else {
      const headerVal = res.headers.get("payment-required");
      if (headerVal) {
        try {
          const json = Buffer.from(headerVal, "base64").toString("utf-8");
          const raw = JSON.parse(json);
          const accepts = Array.isArray(raw.accepts)
            ? raw.accepts
                .map((opt: any) => {
                  if (opt.amount) return opt;
                  const v1 = opt.maxAmountRequired;
                  if (v1 == null) return null;
                  return { ...opt, amount: v1, maxAmountRequired: v1 };
                })
                .filter((a: any) => a !== null)
            : [];
          payment = { ...raw, accepts };
          if (payment.accepts.length > 0) {
            inspectStatus = "payable";
          } else {
            inspectStatus = "unsupported";
          }
        } catch {
          inspectStatus = "unsupported";
        }
      } else {
        // Try fallback body
        try {
          const bodyJson = await res.json();
          if (bodyJson && typeof bodyJson === "object" && Array.isArray(bodyJson.accepts)) {
            const accepts = bodyJson.accepts
              .map((opt: any) => {
                if (opt.amount) return opt;
                const v1 = opt.maxAmountRequired;
                if (v1 == null) return null;
                return { ...opt, amount: v1, maxAmountRequired: v1 };
              })
              .filter((a: any) => a !== null);
            payment = { ...bodyJson, accepts };
            if (payment.accepts.length > 0) {
              inspectStatus = "payable";
            } else {
              inspectStatus = "unsupported";
            }
          }
        } catch {
          inspectStatus = "unsupported";
        }
      }
    }
  } catch (e) {
    httpStatus = 0;
    inspectStatus = "unavailable";
    payment = null;
  }

  // 3. Construct result
  const accepts = payment?.accepts ?? [];
  const firstAccept = accepts[0];
  const priceUsdc = firstAccept ? microToUsdc(firstAccept.amount) : null;
  const network = firstAccept?.network ?? null;
  const chain = networkToChain(network);
  const scheme = firstAccept?.extra?.name ?? firstAccept?.scheme ?? null;

  return {
    status: inspectStatus,
    httpStatus,
    url: params.url,
    provider: cleanText(discovery?.provider?.name ?? "Unknown provider"),
    description: cleanText(discovery?.description ?? ""),
    method: normalizeMethod(discovery?.method),
    priceUsdc,
    network,
    chain,
    scheme,
    input: discovery?.input,
    output: discovery?.output,
    raw: { status: inspectStatus, httpStatus, payment },
  } satisfies CircleInspectResult;
}

function serializeForCircleApi(args: any) {
  const { domain, types, primaryType, message } = args;
  const serializable = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ],
      ...types
    },
    primaryType,
    domain,
    message: Object.fromEntries(
      Object.entries(message).map(([k, v]) => [k, String(v)])
    )
  };
  return JSON.stringify(serializable);
}

export async function payCircleService(params: {
  url: string;
  method: CircleServiceMethod;
  address: string;
  chain: string;
  data?: Record<string, unknown> | null;
  maxAmountUsdc?: string;
}) {
  assertServiceUrl(params.url);
  if (!/^0x[a-fA-F0-9]{40}$/.test(params.address)) {
    throw new Error("Invalid Circle services wallet address");
  }
  if (!/^[A-Z0-9-]{2,20}$/.test(params.chain)) {
    throw new Error("Invalid Circle services chain");
  }

  // 1. Send initial request to get EIP-712 challenge (402)
  const initialRes = await fetch(params.url, {
    method: params.method,
    headers: {
      "X-x402-Dry-Run": "true",
      "Content-Type": "application/json",
    },
    body: params.data ? JSON.stringify(params.data) : undefined,
  });

  if (initialRes.status !== 402) {
    if (initialRes.status >= 200 && initialRes.status < 300) {
      const responseBody = await initialRes.text();
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        parsedBody = responseBody;
      }
      return {
        raw: {
          response: parsedBody,
          payment: {
            amount: "0",
            chain: params.chain,
            scheme: "free",
            seller: "",
            receipt: ""
          }
        }
      } satisfies CirclePayResult;
    }
    throw new Error(`Tool service returned HTTP ${initialRes.status} instead of 402 challenge`);
  }

  // 2. Extract challenge/accept terms
  let payment: any = null;
  const headerVal = initialRes.headers.get("payment-required");
  if (headerVal) {
    try {
      const json = Buffer.from(headerVal, "base64").toString("utf-8");
      const raw = JSON.parse(json);
      const accepts = Array.isArray(raw.accepts)
        ? raw.accepts
            .map((opt: any) => {
              if (opt.amount) return opt;
              const v1 = opt.maxAmountRequired;
              if (v1 == null) return null;
              return { ...opt, amount: v1, maxAmountRequired: v1 };
            })
            .filter((a: any) => a !== null)
        : [];
      payment = { ...raw, accepts };
    } catch (e) {
      throw new Error("Failed to parse payment-required header");
    }
  } else {
    try {
      const bodyJson = await initialRes.json();
      if (bodyJson && typeof bodyJson === "object" && Array.isArray(bodyJson.accepts)) {
        const accepts = bodyJson.accepts
          .map((opt: any) => {
            if (opt.amount) return opt;
            const v1 = opt.maxAmountRequired;
            if (v1 == null) return null;
            return { ...opt, amount: v1, maxAmountRequired: v1 };
          })
          .filter((a: any) => a !== null);
        payment = { ...bodyJson, accepts };
      }
    } catch (e) {
      throw new Error("Failed to parse payment-required response body");
    }
  }

  if (!payment || !payment.accepts || payment.accepts.length === 0) {
    throw new Error("No acceptable payment options found in the 402 challenge");
  }

  const accepts = payment.accepts;
  const option = accepts[0];
  const x402Version = payment.x402Version ?? 2;

  // Find option matching chain
  const matchingOption = accepts.find((opt: any) => {
    const chainName = networkToChain(opt.network);
    return chainName === params.chain;
  }) ?? option;

  // 3. Setup the signer
  let signer: any;
  if (process.env.CIRCLE_AGENT_WALLET_PRIVATE_KEY) {
    const account = privateKeyToAccount(process.env.CIRCLE_AGENT_WALLET_PRIVATE_KEY as Hash);
    signer = {
      address: account.address,
      signTypedData: async (args: any) => {
        return account.signTypedData(args);
      }
    };
  } else if (sdkClient && circleWalletId) {
    const activeSdkClient = sdkClient;
    const activeWalletId = circleWalletId;
    const address = getCircleAgentWalletConfig().address;
    signer = {
      address: address,
      signTypedData: async (args: any) => {
        const dataJson = serializeForCircleApi(args);
        const res = await activeSdkClient.signTypedData({
          walletId: activeWalletId,
          data: dataJson
        });
        const signature = res.data?.signature;
        if (!signature) {
          throw new Error("No signature returned from Circle SDK signTypedData challenge.");
        }
        return signature;
      }
    };
  } else {
    throw new Error("No wallet private key or Circle SDK credentials configured for x402 payment signing.");
  }

  // 4. Setup the scheme
  const batchScheme = new BatchEvmScheme(signer);
  const exactScheme = new ExactEvmScheme(signer);
  const scheme = new CompositeEvmScheme(batchScheme, exactScheme);

  // 5. Create the payload & sign
  let signatureResult: any;
  if (x402Version === 1) {
    const exactSchemeV1 = new ExactEvmSchemeV1(signer);
    const result = await exactSchemeV1.createPaymentPayload(1, matchingOption);
    signatureResult = { ...result, effectiveOption: matchingOption };
  } else {
    const isBatched = false; // Arc Testnet is not batched
    const GATEWAY_MIN_TIMEOUT = 30 * 24 * 60 * 60;
    const payOption = isBatched ? {
      ...matchingOption,
      maxTimeoutSeconds: Math.max(matchingOption.maxTimeoutSeconds ?? 0, GATEWAY_MIN_TIMEOUT)
    } : matchingOption;

    const result = await scheme.createPaymentPayload(x402Version, payOption);
    signatureResult = { ...result, effectiveOption: payOption };
  }

  // 6. Build payment header
  const { effectiveOption, ...paymentPayload } = signatureResult;
  let headerName = "PAYMENT-SIGNATURE";
  let paymentHeader = "";
  let fullPayload: any = null;

  if (x402Version === 1) {
    headerName = "X-PAYMENT";
    paymentHeader = encodePaymentSignatureHeader(paymentPayload);
    fullPayload = paymentPayload;
  } else {
    const resource = {
      url: params.url,
      description: "Paid resource",
      mimeType: "application/json"
    };
    fullPayload = { ...paymentPayload, accepted: effectiveOption, resource };
    paymentHeader = encodePaymentSignatureHeader(fullPayload);
  }

  // 7. Send paid request
  const paidRes = await fetch(params.url, {
    method: params.method,
    headers: {
      ...params.data ? { "Content-Type": "application/json" } : {},
      [headerName]: paymentHeader,
    },
    body: params.data ? JSON.stringify(params.data) : undefined
  });

  if (!paidRes.ok) {
    const errText = await paidRes.text();
    throw new Error(`Tool service request failed with HTTP ${paidRes.status} after payment: ${errText}`);
  }

  const responseText = await paidRes.text();
  let parsedBody: any;
  try {
    parsedBody = JSON.parse(responseText);
  } catch {
    parsedBody = responseText;
  }

  const paymentResponseHeader = paidRes.headers.get("payment-response") ?? paidRes.headers.get("x-payment-response") ?? "";

  return {
    raw: {
      response: parsedBody,
      payment: {
        amount: microToUsdc(effectiveOption.amount) ?? "0",
        chain: networkToChain(effectiveOption.network) ?? "BASE",
        scheme: effectiveOption.extra?.name ?? effectiveOption.scheme,
        seller: effectiveOption.payTo,
        receipt: paymentResponseHeader
      }
    }
  } satisfies CirclePayResult;
}

function assertServiceUrl(url: string) {
  if (!isValidServiceUrl(url)) {
    throw new Error("Invalid Circle service URL");
  }
}

function cleanText(value: string) {
  return value
    .replaceAll("Ã¢Â€Â”", "-")
    .replaceAll("\u00e2\u0080\u0094", "-")
    .replaceAll("Ã¢â‚¬â€", "-")
    .replaceAll("Ã‚Â·", "-")
    .replaceAll("Ã¢â‚¬Â¦", "...")
    .replaceAll("Ã¢â€ â€™", "->");
}
