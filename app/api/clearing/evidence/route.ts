import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress, type Address, type Hex } from "viem";

import { arcTestnet } from "@/config/chain";
import { clearingHouseAbi, clearingHouseAddress } from "@/lib/clearing-contract";
import {
  buildStoreClearingEvidenceMessage,
  CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES,
  hashClearingEvidence,
  isFreshClearingEvidenceAuthorization,
  normalizeClearingEvidence,
  type ClearingEvidenceAttachmentPayload,
  type StoreClearingEvidenceAuthorization,
} from "@/lib/clearing-evidence";
import {
  consumeClearingEvidenceAuthorization,
  getStoredClearingEvidence,
  isDurableKvConfigured,
  releaseClearingEvidenceAuthorization,
  storeClearingEvidence,
} from "@/lib/clearing-evidence-store";
import { createRpcReadQueue } from "@/lib/arc-rpc";
import { rateLimit } from "@/lib/rate-limit";
import { isSupportedWalletSignature, verifyWalletMessage } from "@/lib/wallet-signature";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_REQUEST_BYTES = 3_000_000;
export const dynamic = "force-dynamic";

function normalizeAttachmentPayloads(evidence: NonNullable<ReturnType<typeof normalizeClearingEvidence>>, value: unknown) {
  const descriptors = evidence.attachments ?? [];
  if (!descriptors.length) return value === undefined || (Array.isArray(value) && value.length === 0) ? [] : null;
  if (!Array.isArray(value) || value.length !== descriptors.length) return null;
  const payloads: ClearingEvidenceAttachmentPayload[] = [];
  let totalBytes = 0;
  for (let index = 0; index < descriptors.length; index += 1) {
    const raw = value[index];
    if (!raw || typeof raw !== "object") return null;
    const input = raw as Partial<ClearingEvidenceAttachmentPayload>;
    if (typeof input.sha256 !== "string" || typeof input.dataBase64 !== "string" || !BASE64_PATTERN.test(input.dataBase64)) return null;
    const bytes = Buffer.from(input.dataBase64, "base64");
    const descriptor = descriptors[index];
    const digest = `0x${createHash("sha256").update(bytes).digest("hex")}`.toLowerCase();
    if (bytes.length !== descriptor.size || digest !== descriptor.sha256.toLowerCase() || input.sha256.toLowerCase() !== descriptor.sha256.toLowerCase()) return null;
    totalBytes += bytes.length;
    payloads.push({ sha256: descriptor.sha256, dataBase64: input.dataBase64 });
  }
  return totalBytes <= CLEARING_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES ? payloads : null;
}

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("hash");
  if (!hash || !HASH_PATTERN.test(hash)) return NextResponse.json({ error: "invalid_evidence_hash" }, { status: 400 });
  if (request.headers.get("accept")?.includes("text/html")) return NextResponse.redirect(new URL(`/evidence/${hash}`, request.url));
  if (!isDurableKvConfigured) return NextResponse.json({ error: "evidence_store_not_configured" }, { status: 503 });
  const stored = await getStoredClearingEvidence(hash as Hex);
  if (!stored) return NextResponse.json({ error: "evidence_not_found" }, { status: 404 });
  return NextResponse.json(stored, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}

export async function POST(request: Request) {
  const contract = clearingHouseAddress;
  if (!contract) return NextResponse.json({ error: "clearing_contract_not_configured" }, { status: 503 });
  if (!isDurableKvConfigured) return NextResponse.json({ error: "evidence_store_not_configured" }, { status: 503 });
  const limited = await rateLimit(request, { key: "cleardeal:clearing:evidence", limit: 20, windowSeconds: 60 });
  if (limited) return limited;
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) return NextResponse.json({ error: "evidence_payload_too_large" }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json_body" }, { status: 400 }); }
  const evidence = normalizeClearingEvidence(body.evidence);
  const attachmentPayloads = evidence ? normalizeAttachmentPayloads(evidence, body.attachmentPayloads) : null;
  if (
    typeof body.providerAddress !== "string" || !isAddress(body.providerAddress) ||
    typeof body.evidenceHash !== "string" || !HASH_PATTERN.test(body.evidenceHash) ||
    !evidence || !attachmentPayloads || typeof body.requestId !== "string" || !REQUEST_ID_PATTERN.test(body.requestId) ||
    typeof body.issuedAt !== "number" || !isFreshClearingEvidenceAuthorization(body.issuedAt) ||
    !isSupportedWalletSignature(body.signature)
  ) return NextResponse.json({ error: "invalid_evidence_authorization" }, { status: 400 });
  const evidenceHash = body.evidenceHash as Hex;
  if (hashClearingEvidence(evidence).toLowerCase() !== evidenceHash.toLowerCase()) {
    return NextResponse.json({ error: "evidence_hash_mismatch" }, { status: 400 });
  }
  const authorization: StoreClearingEvidenceAuthorization = {
    providerAddress: body.providerAddress as Address,
    evidenceHash,
    requestId: body.requestId as string,
    issuedAt: body.issuedAt as number,
  };
  const signatureValid = await verifyWalletMessage({ address: authorization.providerAddress, message: buildStoreClearingEvidenceMessage(authorization), signature: body.signature as Hex });
  if (!signatureValid) return NextResponse.json({ error: "invalid_wallet_signature" }, { status: 401 });

  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(arcTestnet.rpcUrls.default.http[0]) });
  const rpcRead = createRpcReadQueue();
  try {
    const cycle = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "cycles", args: [BigInt(evidence.cycleId)] }));
    const obligation = await rpcRead(() => publicClient.readContract({ address: contract, abi: clearingHouseAbi, functionName: "obligations", args: [BigInt(evidence.cycleId), BigInt(evidence.obligationId)] }));
    if (Number(cycle[11]) !== 0 || Number(obligation[9]) !== 1 || obligation[1].toLowerCase() !== authorization.providerAddress.toLowerCase()) {
      return NextResponse.json({ error: "evidence_role_or_state_mismatch" }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "clearing_state_unavailable" }, { status: 502 });
  }

  if (!(await consumeClearingEvidenceAuthorization(authorization.requestId))) return NextResponse.json({ error: "authorization_already_used" }, { status: 409 });
  try {
    await storeClearingEvidence(evidenceHash, {
      evidence,
      providerAddress: authorization.providerAddress,
      signature: body.signature as Hex,
      storedAt: new Date().toISOString(),
      ...(attachmentPayloads.length ? { attachmentPayloads } : {}),
    });
    return NextResponse.json({ stored: true, evidenceHash });
  } catch (cause) {
    await releaseClearingEvidenceAuthorization(authorization.requestId).catch(() => undefined);
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "evidence_store_failed" }, { status: 409 });
  }
}
