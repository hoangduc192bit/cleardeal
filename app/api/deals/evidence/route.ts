import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress, type Address, type Hex } from "viem";

import { arcTestnet } from "@/config/chain";
import { clearDealEscrowAbi, clearDealEscrowAddress } from "@/lib/cleardeal-contract";
import {
  buildStoreClearDealEvidenceMessage,
  CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES,
  hashClearDealEvidence,
  isFreshClearDealEvidenceAuthorization,
  normalizeClearDealEvidence,
  type ClearDealEvidenceAttachmentPayload,
  type StoreClearDealEvidenceAuthorization,
} from "@/lib/cleardeal-evidence";
import {
  getDealEvidenceViewedAt,
  getStoredDealEvidence,
  isDurableKvConfigured,
  storeDealEvidence,
} from "@/lib/cleardeal-evidence-store";
import {
  encryptEvidenceAttachment,
  isProtectedFileStoreConfigured,
} from "@/lib/cleardeal-protected-files";
import { consumeMetadataAuthorization, releaseMetadataAuthorization } from "@/lib/cleardeal-metadata-store";
import { rateLimit } from "@/lib/rate-limit";
import { isSupportedWalletSignature, verifyWalletMessage } from "@/lib/wallet-signature";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_REQUEST_BYTES = 3_800_000;

export const dynamic = "force-dynamic";

function normalizeAttachmentPayloads(
  evidence: NonNullable<ReturnType<typeof normalizeClearDealEvidence>>,
  value: unknown,
) {
  const descriptors = evidence.attachments ?? [];
  if (!descriptors.length) {
    return value === undefined || (Array.isArray(value) && value.length === 0)
      ? []
      : null;
  }
  if (!Array.isArray(value) || value.length !== descriptors.length) return null;
  const payloads: ClearDealEvidenceAttachmentPayload[] = [];
  let totalBytes = 0;
  for (let index = 0; index < descriptors.length; index += 1) {
    const raw = value[index];
    if (!raw || typeof raw !== "object") return null;
    const input = raw as Partial<ClearDealEvidenceAttachmentPayload>;
    if (
      typeof input.sha256 !== "string" ||
      typeof input.dataBase64 !== "string" ||
      !BASE64_PATTERN.test(input.dataBase64)
    ) return null;
    const bytes = Buffer.from(input.dataBase64, "base64");
    const descriptor = descriptors[index];
    const digest = `0x${createHash("sha256").update(bytes).digest("hex")}`.toLowerCase();
    if (
      bytes.length !== descriptor.size ||
      digest !== descriptor.sha256.toLowerCase() ||
      input.sha256.toLowerCase() !== descriptor.sha256.toLowerCase()
    ) return null;
    totalBytes += bytes.length;
    payloads.push({ sha256: descriptor.sha256, dataBase64: input.dataBase64 });
  }
  return totalBytes <= CLEARDEAL_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES
    ? payloads
    : null;
}

export async function GET(request: Request) {
  const evidenceHash = new URL(request.url).searchParams.get("hash");
  if (!evidenceHash || !HASH_PATTERN.test(evidenceHash)) {
    return NextResponse.json({ error: "invalid_evidence_hash" }, { status: 400 });
  }
  if (!isDurableKvConfigured) {
    return NextResponse.json({ error: "evidence_store_not_configured" }, { status: 503 });
  }
  const evidence = await getStoredDealEvidence(evidenceHash as Hex);
  if (!evidence) return NextResponse.json({ error: "evidence_not_found" }, { status: 404 });
  const clientViewedAt = await getDealEvidenceViewedAt(evidenceHash as Hex);
  return NextResponse.json(
    {
      evidence: {
        ...evidence,
        ...(clientViewedAt ? { clientViewedAt } : {}),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isDurableKvConfigured) {
    return NextResponse.json({ error: "evidence_store_not_configured" }, { status: 503 });
  }
  if (!clearDealEscrowAddress) {
    return NextResponse.json({ error: "escrow_contract_not_configured" }, { status: 503 });
  }
  const limited = await rateLimit(request, { key: "cleardeal:evidence", limit: 20, windowSeconds: 60 });
  if (limited) return limited;
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "evidence_payload_too_large" }, { status: 413 });
  }

  let body: {
    signerAddress?: string;
    evidenceHash?: string;
    evidence?: unknown;
    requestId?: string;
    issuedAt?: number;
    signature?: string;
    attachmentPayloads?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const evidence = normalizeClearDealEvidence(body.evidence);
  const attachmentPayloads = evidence
    ? normalizeAttachmentPayloads(evidence, body.attachmentPayloads)
    : null;
  if (
    attachmentPayloads?.length &&
    !isProtectedFileStoreConfigured
  ) {
    return NextResponse.json(
      { error: "protected_file_store_not_configured" },
      { status: 503 },
    );
  }
  if (
    !body.signerAddress ||
    !isAddress(body.signerAddress) ||
    !body.evidenceHash ||
    !HASH_PATTERN.test(body.evidenceHash) ||
    !evidence ||
    !attachmentPayloads ||
    !isFreshClearDealEvidenceAuthorization(evidence.submittedAt) ||
    !body.requestId ||
    !REQUEST_ID_PATTERN.test(body.requestId) ||
    !body.issuedAt ||
    !isFreshClearDealEvidenceAuthorization(body.issuedAt) ||
    !isSupportedWalletSignature(body.signature)
  ) {
    return NextResponse.json({ error: "invalid_evidence_authorization" }, { status: 400 });
  }

  const evidenceHash = body.evidenceHash as Hex;
  if (hashClearDealEvidence(evidence).toLowerCase() !== evidenceHash.toLowerCase()) {
    return NextResponse.json({ error: "evidence_hash_mismatch" }, { status: 400 });
  }
  const authorization: StoreClearDealEvidenceAuthorization = {
    signerAddress: body.signerAddress as Address,
    evidenceHash,
    dealId: evidence.dealId,
    kind: evidence.kind,
    milestoneId: evidence.milestoneId,
    requestId: body.requestId,
    issuedAt: body.issuedAt,
  };
  const signatureValid = await verifyWalletMessage({
    address: authorization.signerAddress,
    message: buildStoreClearDealEvidenceMessage(authorization),
    signature: body.signature as Hex,
  }).catch(() => false);
  if (!signatureValid) return NextResponse.json({ error: "invalid_wallet_signature" }, { status: 401 });

  const roleCheck = await validateEvidenceRole(authorization.signerAddress, evidence).catch(() => "rpc_error" as const);
  if (roleCheck === "not_found") return NextResponse.json({ error: "deal_not_found" }, { status: 404 });
  if (roleCheck === "unauthorized") return NextResponse.json({ error: "unauthorized_evidence_signer" }, { status: 403 });
  if (roleCheck === "invalid_state") return NextResponse.json({ error: "invalid_deal_state" }, { status: 409 });
  if (roleCheck === "rpc_error") return NextResponse.json({ error: "arc_rpc_unavailable" }, { status: 502 });

  if (!(await consumeMetadataAuthorization(authorization.requestId))) {
    return NextResponse.json({ error: "authorization_already_used" }, { status: 409 });
  }
  try {
    const stored = await storeDealEvidence(evidenceHash, {
      evidence,
      signerAddress: authorization.signerAddress,
      signature: body.signature as Hex,
      storedAt: Date.now(),
      ...(attachmentPayloads.length
        ? {
            attachmentPayloads: attachmentPayloads.map(
              encryptEvidenceAttachment,
            ),
          }
        : {}),
    });
    if (!stored) return NextResponse.json({ error: "evidence_already_exists" }, { status: 409 });
    return NextResponse.json({ stored: true, evidenceHash });
  } catch {
    await releaseMetadataAuthorization(authorization.requestId).catch(() => undefined);
    return NextResponse.json({ error: "evidence_store_failed" }, { status: 502 });
  }
}

async function validateEvidenceRole(signerAddress: Address, evidence: NonNullable<ReturnType<typeof normalizeClearDealEvidence>>) {
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(arcTestnet.rpcUrls.default.http[0]) });
  const dealId = BigInt(evidence.dealId);
  const deal = await publicClient.readContract({
    address: clearDealEscrowAddress as Address,
    abi: clearDealEscrowAbi,
    functionName: "deals",
    args: [dealId],
  });
  const [buyer, seller, arbitrator, , , , , , , , milestoneCount, , status] = deal;
  if (buyer === "0x0000000000000000000000000000000000000000") return "not_found" as const;
  const signer = signerAddress.toLowerCase();

  const milestoneKinds = [
    "milestone_submission",
    "change_request",
    "milestone_dispute",
    "milestone_resolution",
  ];
  if (milestoneKinds.includes(evidence.kind)) {
    const milestoneId = BigInt(evidence.milestoneId as string);
    if (milestoneId >= milestoneCount || status !== 1) return "invalid_state" as const;
    const milestone = await publicClient.readContract({
      address: clearDealEscrowAddress as Address,
      abi: clearDealEscrowAbi,
      functionName: "milestones",
      args: [dealId, milestoneId],
    });
    const milestoneStatus = milestone[7];
    if (evidence.kind === "milestone_submission") {
      if (signer !== seller.toLowerCase()) return "unauthorized" as const;
      return milestoneStatus === 0 ? "ok" as const : "invalid_state" as const;
    }
    if (evidence.kind === "change_request") {
      if (signer !== buyer.toLowerCase()) return "unauthorized" as const;
      return milestoneStatus === 1 ? "ok" as const : "invalid_state" as const;
    }
    if (evidence.kind === "milestone_dispute") {
      if (signer !== buyer.toLowerCase() && signer !== seller.toLowerCase()) return "unauthorized" as const;
      return milestoneStatus === 1 ? "ok" as const : "invalid_state" as const;
    }
    if (signer !== arbitrator.toLowerCase()) return "unauthorized" as const;
    return milestoneStatus === 4 ? "ok" as const : "invalid_state" as const;
  }
  if (evidence.kind === "dispute") {
    if (signer !== buyer.toLowerCase() && signer !== seller.toLowerCase()) return "unauthorized" as const;
    return status === 1 ? "ok" as const : "invalid_state" as const;
  }
  if (signer !== arbitrator.toLowerCase()) return "unauthorized" as const;
  return "invalid_state" as const;
}
