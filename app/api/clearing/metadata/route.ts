import { NextResponse } from "next/server";
import { isAddress, type Address, type Hex } from "viem";

import {
  buildStoreClearingMetadataMessage,
  hashClearingMetadata,
  isFreshClearingAuthorization,
  normalizeClearingMetadata,
  type StoreClearingMetadataAuthorization,
} from "@/lib/clearing-metadata";
import {
  consumeClearingAuthorization,
  getStoredClearingMetadata,
  isDurableKvConfigured,
  releaseClearingAuthorization,
  storeClearingMetadata,
} from "@/lib/clearing-metadata-store";
import { rateLimit } from "@/lib/rate-limit";
import {
  isSupportedWalletSignature,
  verifyWalletMessage,
} from "@/lib/wallet-signature";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("hash");
  if (!hash || !HASH_PATTERN.test(hash)) return NextResponse.json({ error: "invalid_metadata_hash" }, { status: 400 });
  if (!isDurableKvConfigured) return NextResponse.json({ error: "metadata_store_not_configured" }, { status: 503 });
  const metadata = await getStoredClearingMetadata(hash as Hex);
  if (!metadata) return NextResponse.json({ error: "metadata_not_found" }, { status: 404 });
  return NextResponse.json({ metadata }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}

export async function POST(request: Request) {
  if (!isDurableKvConfigured) return NextResponse.json({ error: "metadata_store_not_configured" }, { status: 503 });
  const limited = await rateLimit(request, { key: "cleardeal:clearing:metadata", limit: 10, windowSeconds: 60 });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json_body" }, { status: 400 }); }
  const metadata = normalizeClearingMetadata(body.metadata);
  if (
    typeof body.ownerAddress !== "string" || !isAddress(body.ownerAddress) ||
    typeof body.metadataHash !== "string" || !HASH_PATTERN.test(body.metadataHash) ||
    !metadata || typeof body.requestId !== "string" || !REQUEST_ID_PATTERN.test(body.requestId) ||
    typeof body.issuedAt !== "number" || !isFreshClearingAuthorization(body.issuedAt) ||
    !isSupportedWalletSignature(body.signature)
  ) return NextResponse.json({ error: "invalid_metadata_authorization" }, { status: 400 });

  const metadataHash = body.metadataHash as Hex;
  if (hashClearingMetadata(metadata).toLowerCase() !== metadataHash.toLowerCase()) {
    return NextResponse.json({ error: "metadata_hash_mismatch" }, { status: 400 });
  }
  const authorization: StoreClearingMetadataAuthorization = {
    ownerAddress: body.ownerAddress as Address,
    metadataHash,
    requestId: body.requestId as string,
    issuedAt: body.issuedAt as number,
  };
  const signatureValid = await verifyWalletMessage({
    address: authorization.ownerAddress,
    message: buildStoreClearingMetadataMessage(authorization),
    signature: body.signature as Hex,
  }).catch(() => false);
  if (!signatureValid) return NextResponse.json({ error: "invalid_wallet_signature" }, { status: 401 });
  if (!(await consumeClearingAuthorization(authorization.requestId))) {
    return NextResponse.json({ error: "authorization_already_used" }, { status: 409 });
  }
  try {
    await storeClearingMetadata(metadataHash, metadata);
    return NextResponse.json({ stored: true, metadataHash });
  } catch {
    await releaseClearingAuthorization(authorization.requestId).catch(() => undefined);
    return NextResponse.json({ error: "metadata_store_failed" }, { status: 502 });
  }
}
