import { NextResponse } from "next/server";
import { isAddress, type Address, type Hex } from "viem";

import {
  buildStoreDealMetadataMessage,
  hashDealMetadata,
  isFreshClearDealAuthorization,
  normalizeDealMetadata,
  type StoreDealMetadataAuthorization,
} from "@/lib/cleardeal-metadata";
import {
  consumeMetadataAuthorization,
  getStoredDealMetadata,
  isDurableKvConfigured,
  releaseMetadataAuthorization,
  storeDealMetadata,
} from "@/lib/cleardeal-metadata-store";
import { rateLimit } from "@/lib/rate-limit";
import { isSupportedWalletSignature, verifyWalletMessage } from "@/lib/wallet-signature";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const metadataHash = new URL(request.url).searchParams.get("hash");
  if (!metadataHash || !HASH_PATTERN.test(metadataHash)) {
    return NextResponse.json({ error: "invalid_metadata_hash" }, { status: 400 });
  }
  if (!isDurableKvConfigured) {
    return NextResponse.json({ error: "metadata_store_not_configured" }, { status: 503 });
  }
  const metadata = await getStoredDealMetadata(metadataHash as Hex);
  if (!metadata) return NextResponse.json({ error: "metadata_not_found" }, { status: 404 });
  return NextResponse.json({ metadata }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}

export async function POST(request: Request) {
  if (!isDurableKvConfigured) {
    return NextResponse.json({ error: "metadata_store_not_configured" }, { status: 503 });
  }
  const limited = await rateLimit(request, { key: "cleardeal:metadata", limit: 10, windowSeconds: 60 });
  if (limited) return limited;

  let body: {
    ownerAddress?: string;
    metadataHash?: string;
    metadata?: unknown;
    requestId?: string;
    issuedAt?: number;
    signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const metadata = normalizeDealMetadata(body.metadata);
  if (
    !body.ownerAddress ||
    !isAddress(body.ownerAddress) ||
    !body.metadataHash ||
    !HASH_PATTERN.test(body.metadataHash) ||
    !metadata ||
    !body.requestId ||
    !REQUEST_ID_PATTERN.test(body.requestId) ||
    !body.issuedAt ||
    !isFreshClearDealAuthorization(body.issuedAt) ||
    !isSupportedWalletSignature(body.signature)
  ) {
    return NextResponse.json({ error: "invalid_metadata_authorization" }, { status: 400 });
  }

  const metadataHash = body.metadataHash as Hex;
  if (hashDealMetadata(metadata).toLowerCase() !== metadataHash.toLowerCase()) {
    return NextResponse.json({ error: "metadata_hash_mismatch" }, { status: 400 });
  }
  const authorization: StoreDealMetadataAuthorization = {
    ownerAddress: body.ownerAddress as Address,
    metadataHash,
    requestId: body.requestId,
    issuedAt: body.issuedAt,
  };
  const signatureValid = await verifyWalletMessage({
    address: authorization.ownerAddress,
    message: buildStoreDealMetadataMessage(authorization),
    signature: body.signature as Hex,
  }).catch(() => false);
  if (!signatureValid) return NextResponse.json({ error: "invalid_wallet_signature" }, { status: 401 });
  if (!(await consumeMetadataAuthorization(authorization.requestId))) {
    return NextResponse.json({ error: "authorization_already_used" }, { status: 409 });
  }

  try {
    await storeDealMetadata(metadataHash, metadata);
    return NextResponse.json({ stored: true, metadataHash });
  } catch {
    await releaseMetadataAuthorization(authorization.requestId).catch(() => undefined);
    return NextResponse.json({ error: "metadata_store_failed" }, { status: 502 });
  }
}
