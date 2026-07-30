import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sharp from "sharp";
import type { Hex } from "viem";

import { attachmentAccess } from "@/lib/cleardeal-evidence";
import {
  getStoredDealEvidence,
  isDurableKvConfigured,
} from "@/lib/cleardeal-evidence-store";
import {
  decryptEvidenceAttachment,
  isProtectedFileStoreConfigured,
  verifyFileAccessToken,
} from "@/lib/cleardeal-protected-files";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const INDEX_PATTERN = /^(0|[1-9]\d*)$/;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDurableKvConfigured || !isProtectedFileStoreConfigured) {
    return NextResponse.json(
      { error: "protected_file_store_not_configured" },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  const indexValue = url.searchParams.get("index");
  const accessToken = (await cookies()).get("cleardeal_file_access")?.value;
  if (
    !hash ||
    !HASH_PATTERN.test(hash) ||
    !indexValue ||
    !INDEX_PATTERN.test(indexValue) ||
    !accessToken
  ) {
    return NextResponse.json(
      { error: "invalid_attachment_request" },
      { status: 400 },
    );
  }

  const access = verifyFileAccessToken(accessToken);
  if (
    !access ||
    access.evidenceHash.toLowerCase() !== hash.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "invalid_or_expired_file_access" },
      { status: 401 },
    );
  }

  const stored = await getStoredDealEvidence(hash as Hex);
  const index = Number(indexValue);
  const descriptor = stored?.evidence.attachments?.[index];
  const payload = stored?.attachmentPayloads?.[index];
  if (!descriptor || !payload) {
    return NextResponse.json(
      { error: "attachment_not_found" },
      { status: 404 },
    );
  }
  if (attachmentAccess(descriptor) === "paid" && access.access !== "paid") {
    return NextResponse.json(
      { error: "clean_file_locked_until_payment" },
      { status: 403 },
    );
  }

  let bytes: Buffer;
  try {
    bytes = decryptEvidenceAttachment(payload);
  } catch {
    return NextResponse.json(
      { error: "attachment_decryption_failed" },
      { status: 409 },
    );
  }
  const digest = `0x${createHash("sha256").update(bytes).digest("hex")}`;
  if (
    bytes.length !== descriptor.size ||
    digest.toLowerCase() !== descriptor.sha256.toLowerCase() ||
    payload.sha256.toLowerCase() !== descriptor.sha256.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "attachment_integrity_failed" },
      { status: 409 },
    );
  }

  const shouldWatermark =
    attachmentAccess(descriptor) === "review" &&
    descriptor.protection === "server_watermark" &&
    (descriptor.contentType === "image/jpeg" ||
      descriptor.contentType === "image/png");
  if (shouldWatermark) {
    try {
      const image = sharp(bytes, { failOn: "error" });
      const metadata = await image.metadata();
      const width = Math.max(320, metadata.width ?? 1_200);
      const label = `CLEARDEAL REVIEW • ${access.viewer.slice(0, 8)}…${access.viewer.slice(-6)} • ${stored.evidence.dealId}/${stored.evidence.milestoneId}`;
      const svg = Buffer.from(
        `<svg width="${width}" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgba(16,12,8,.70)"/><text x="50%" y="68" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(16, Math.round(width / 45))}" font-weight="700" fill="#ffffff">${label}</text></svg>`,
      );
      bytes = await image
        .composite([{ input: svg, gravity: "south" }])
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      return NextResponse.json(
        { error: "preview_watermark_failed" },
        { status: 422 },
      );
    }
  }

  const safeName = descriptor.name.replace(/[^a-zA-Z0-9._ -]/g, "_");
  const inline =
    url.searchParams.get("view") === "1" &&
    (descriptor.contentType === "image/jpeg" ||
      descriptor.contentType === "image/png" ||
      descriptor.contentType === "video/mp4" ||
      descriptor.contentType === "video/webm" ||
      descriptor.contentType === "application/pdf");
  const responseContentType = shouldWatermark
    ? "image/jpeg"
    : descriptor.contentType;
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${
        inline ? "inline" : "attachment"
      }; filename="${safeName}"`,
      "Content-Length": String(bytes.length),
      "Content-Type": responseContentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
