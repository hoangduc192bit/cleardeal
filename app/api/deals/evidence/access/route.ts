import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";

import { arcTestnet } from "@/config/chain";
import {
  clearDealEscrowAbi,
  clearDealEscrowAddress,
} from "@/lib/cleardeal-contract";
import {
  buildAccessClearDealEvidenceMessage,
  isFreshClearDealEvidenceAuthorization,
  type AccessClearDealEvidenceAuthorization,
} from "@/lib/cleardeal-evidence";
import {
  getDealEvidenceViewedAt,
  getStoredDealEvidence,
  isDurableKvConfigured,
  markDealEvidenceViewed,
} from "@/lib/cleardeal-evidence-store";
import {
  createFileAccessToken,
  isProtectedFileStoreConfigured,
} from "@/lib/cleardeal-protected-files";
import {
  consumeMetadataAuthorization,
  releaseMetadataAuthorization,
} from "@/lib/cleardeal-metadata-store";
import { rateLimit } from "@/lib/rate-limit";
import {
  isSupportedWalletSignature,
  verifyWalletMessage,
} from "@/lib/wallet-signature";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const ACCESS_TTL_MS = 10 * 60 * 1_000;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isDurableKvConfigured || !isProtectedFileStoreConfigured) {
    return NextResponse.json(
      { error: "protected_file_store_not_configured" },
      { status: 503 },
    );
  }
  const limited = await rateLimit(request, {
    key: "cleardeal:evidence-access",
    limit: 20,
    windowSeconds: 60,
  });
  if (limited) return limited;

  let body: {
    signerAddress?: string;
    evidenceHash?: string;
    requestId?: string;
    issuedAt?: number;
    signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }
  if (
    !body.signerAddress ||
    !isAddress(body.signerAddress) ||
    !body.evidenceHash ||
    !HASH_PATTERN.test(body.evidenceHash) ||
    !body.requestId ||
    !REQUEST_ID_PATTERN.test(body.requestId) ||
    !body.issuedAt ||
    !isFreshClearDealEvidenceAuthorization(body.issuedAt) ||
    !isSupportedWalletSignature(body.signature)
  ) {
    return NextResponse.json(
      { error: "invalid_access_authorization" },
      { status: 400 },
    );
  }

  const authorization: AccessClearDealEvidenceAuthorization = {
    signerAddress: body.signerAddress as Address,
    evidenceHash: body.evidenceHash as Hex,
    requestId: body.requestId,
    issuedAt: body.issuedAt,
  };
  const signatureValid = await verifyWalletMessage({
    address: authorization.signerAddress,
    message: buildAccessClearDealEvidenceMessage(authorization),
    signature: body.signature as Hex,
  }).catch(() => false);
  if (!signatureValid) {
    return NextResponse.json(
      { error: "invalid_wallet_signature" },
      { status: 401 },
    );
  }

  const stored = await getStoredDealEvidence(authorization.evidenceHash);
  if (
    !stored ||
    stored.evidence.kind !== "milestone_submission" ||
    stored.evidence.milestoneId === undefined
  ) {
    return NextResponse.json({ error: "delivery_not_found" }, { status: 404 });
  }

  const access = await resolveAccess(
    authorization.signerAddress,
    BigInt(stored.evidence.dealId),
    BigInt(stored.evidence.milestoneId),
  ).catch(() => null);
  if (!access) {
    return NextResponse.json({ error: "arc_rpc_unavailable" }, { status: 502 });
  }
  if (access.role === "viewer") {
    return NextResponse.json(
      { error: "delivery_access_denied" },
      { status: 403 },
    );
  }

  if (!(await consumeMetadataAuthorization(authorization.requestId))) {
    return NextResponse.json(
      { error: "authorization_already_used" },
      { status: 409 },
    );
  }
  try {
    if (access.role === "client") {
      await markDealEvidenceViewed(authorization.evidenceHash);
    }
    const clientViewedAt = await getDealEvidenceViewedAt(
      authorization.evidenceHash,
    );
    const expiresAt = Date.now() + ACCESS_TTL_MS;
    const response = NextResponse.json(
      {
        opened: true,
        access: access.paid ? "paid" : "review",
        role: access.role,
        expiresAt,
        clientViewedAt,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    response.cookies.set(
      "cleardeal_file_access",
      createFileAccessToken({
        evidenceHash: authorization.evidenceHash,
        viewer: authorization.signerAddress,
        access: access.paid ? "paid" : "review",
        expiresAt,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/deals/evidence/attachment",
        maxAge: Math.floor(ACCESS_TTL_MS / 1_000),
      },
    );
    return response;
  } catch {
    await releaseMetadataAuthorization(authorization.requestId).catch(
      () => undefined,
    );
    return NextResponse.json(
      { error: "delivery_access_failed" },
      { status: 502 },
    );
  }
}

async function resolveAccess(
  signer: Address,
  dealId: bigint,
  milestoneId: bigint,
) {
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });
  const [deal, milestone] = await Promise.all([
    publicClient.readContract({
      address: clearDealEscrowAddress,
      abi: clearDealEscrowAbi,
      functionName: "deals",
      args: [dealId],
    }),
    publicClient.readContract({
      address: clearDealEscrowAddress,
      abi: clearDealEscrowAbi,
      functionName: "milestones",
      args: [dealId, milestoneId],
    }),
  ]);
  const [buyer, seller, arbitrator] = deal;
  const signerLower = signer.toLowerCase();
  const role =
    signerLower === buyer.toLowerCase()
      ? "client"
      : signerLower === seller.toLowerCase()
        ? "team"
        : signerLower === arbitrator.toLowerCase()
          ? "dispute_helper"
          : "viewer";
  return {
    role,
    paid: milestone[7] === 2 || milestone[7] === 5,
  } as const;
}
