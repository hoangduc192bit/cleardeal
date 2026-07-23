import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress, type Address, type Hex } from "viem";

import { arcTestnet } from "@/config/chain";
import {
  buildStoreExpenseEvidenceMessage,
  EXPENSE_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES,
  hashExpenseEvidence,
  isFreshExpenseEvidenceAuthorization,
  normalizeExpenseEvidence,
  type ExpenseEvidenceAttachmentPayload,
  type StoreExpenseEvidenceAuthorization,
} from "@/lib/expense-evidence";
import {
  consumeExpenseEvidenceAuthorization,
  getStoredExpenseEvidence,
  isDurableKvConfigured,
  releaseExpenseEvidenceAuthorization,
  storeExpenseEvidence,
} from "@/lib/expense-evidence-store";
import {
  clearDealTreasuryAbi,
  clearDealTreasuryAddress,
} from "@/lib/treasury-contract";
import { createRpcReadQueue } from "@/lib/arc-rpc";
import { rateLimit } from "@/lib/rate-limit";
import {
  isSupportedWalletSignature,
  verifyWalletMessage,
} from "@/lib/wallet-signature";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_REQUEST_BYTES = 3_000_000;
export const dynamic = "force-dynamic";

function normalizeAttachmentPayloads(
  evidence: NonNullable<ReturnType<typeof normalizeExpenseEvidence>>,
  value: unknown,
) {
  const descriptors = evidence.attachments ?? [];
  if (!descriptors.length) {
    return value === undefined ||
      (Array.isArray(value) && value.length === 0)
      ? []
      : null;
  }
  if (!Array.isArray(value) || value.length !== descriptors.length) {
    return null;
  }
  const payloads: ExpenseEvidenceAttachmentPayload[] = [];
  let totalBytes = 0;
  for (let index = 0; index < descriptors.length; index += 1) {
    const raw = value[index];
    if (!raw || typeof raw !== "object") return null;
    const input = raw as Partial<ExpenseEvidenceAttachmentPayload>;
    if (
      typeof input.sha256 !== "string" ||
      typeof input.dataBase64 !== "string" ||
      !BASE64_PATTERN.test(input.dataBase64)
    ) {
      return null;
    }
    const bytes = Buffer.from(input.dataBase64, "base64");
    const descriptor = descriptors[index];
    const digest =
      `0x${createHash("sha256").update(bytes).digest("hex")}`.toLowerCase();
    if (
      bytes.length !== descriptor.size ||
      digest !== descriptor.sha256.toLowerCase() ||
      input.sha256.toLowerCase() !== descriptor.sha256.toLowerCase()
    ) {
      return null;
    }
    totalBytes += bytes.length;
    payloads.push({
      sha256: descriptor.sha256,
      dataBase64: input.dataBase64,
    });
  }
  return totalBytes <= EXPENSE_EVIDENCE_MAX_TOTAL_ATTACHMENT_BYTES
    ? payloads
    : null;
}

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("hash");
  if (!hash || !HASH_PATTERN.test(hash)) {
    return NextResponse.json(
      { error: "invalid_evidence_hash" },
      { status: 400 },
    );
  }
  if (!isDurableKvConfigured) {
    return NextResponse.json(
      { error: "evidence_store_not_configured" },
      { status: 503 },
    );
  }
  const stored = await getStoredExpenseEvidence(hash as Hex);
  if (!stored) {
    return NextResponse.json(
      { error: "evidence_not_found" },
      { status: 404 },
    );
  }
  return NextResponse.json(stored, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

export async function POST(request: Request) {
  const contract = clearDealTreasuryAddress;
  if (!contract) {
    return NextResponse.json(
      { error: "treasury_contract_not_configured" },
      { status: 503 },
    );
  }
  if (!isDurableKvConfigured) {
    return NextResponse.json(
      { error: "evidence_store_not_configured" },
      { status: 503 },
    );
  }
  const limited = await rateLimit(request, {
    key: "cleardeal:expense:evidence",
    limit: 20,
    windowSeconds: 60,
  });
  if (limited) return limited;
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    return NextResponse.json(
      { error: "evidence_payload_too_large" },
      { status: 413 },
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }
  const evidence = normalizeExpenseEvidence(body.evidence);
  const attachmentPayloads = evidence
    ? normalizeAttachmentPayloads(evidence, body.attachmentPayloads)
    : null;
  if (
    typeof body.requesterAddress !== "string" ||
    !isAddress(body.requesterAddress) ||
    typeof body.evidenceHash !== "string" ||
    !HASH_PATTERN.test(body.evidenceHash) ||
    !evidence ||
    !attachmentPayloads ||
    typeof body.requestId !== "string" ||
    !REQUEST_ID_PATTERN.test(body.requestId) ||
    typeof body.issuedAt !== "number" ||
    !isFreshExpenseEvidenceAuthorization(body.issuedAt) ||
    !isSupportedWalletSignature(body.signature)
  ) {
    return NextResponse.json(
      { error: "invalid_evidence_authorization" },
      { status: 400 },
    );
  }
  const evidenceHash = body.evidenceHash as Hex;
  if (
    hashExpenseEvidence(evidence).toLowerCase() !==
    evidenceHash.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "evidence_hash_mismatch" },
      { status: 400 },
    );
  }
  const authorization: StoreExpenseEvidenceAuthorization = {
    requesterAddress: body.requesterAddress as Address,
    evidenceHash,
    requestId: body.requestId as string,
    issuedAt: body.issuedAt as number,
  };
  const signatureValid = await verifyWalletMessage({
    address: authorization.requesterAddress,
    message: buildStoreExpenseEvidenceMessage(authorization),
    signature: body.signature as Hex,
  }).catch(() => false);
  if (!signatureValid) {
    return NextResponse.json(
      { error: "invalid_wallet_signature" },
      { status: 401 },
    );
  }

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });
  const rpcRead = createRpcReadQueue();
  try {
    const expense = await rpcRead(() =>
      publicClient.readContract({
        address: contract,
        abi: clearDealTreasuryAbi,
        functionName: "expenses",
        args: [BigInt(evidence.expenseId)],
      }),
    );
    if (
      Number(expense[10]) !== 1 ||
      expense[0].toLowerCase() !==
        authorization.requesterAddress.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "evidence_role_or_state_mismatch" },
        { status: 409 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "treasury_state_unavailable" },
      { status: 502 },
    );
  }

  if (
    !(await consumeExpenseEvidenceAuthorization(
      authorization.requestId,
    ))
  ) {
    return NextResponse.json(
      { error: "authorization_already_used" },
      { status: 409 },
    );
  }
  try {
    await storeExpenseEvidence(evidenceHash, {
      evidence,
      requesterAddress: authorization.requesterAddress,
      signature: body.signature as Hex,
      storedAt: new Date().toISOString(),
      ...(attachmentPayloads.length ? { attachmentPayloads } : {}),
    });
    return NextResponse.json({ stored: true, evidenceHash });
  } catch (cause) {
    await releaseExpenseEvidenceAuthorization(
      authorization.requestId,
    ).catch(() => undefined);
    return NextResponse.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "evidence_store_failed",
      },
      { status: 409 },
    );
  }
}
