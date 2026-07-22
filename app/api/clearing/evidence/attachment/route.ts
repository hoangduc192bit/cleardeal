import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { Hex } from "viem";

import { getStoredClearingEvidence, isDurableKvConfigured } from "@/lib/clearing-evidence-store";

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const INDEX_PATTERN = /^(0|[1-9]\d*)$/;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDurableKvConfigured) return NextResponse.json({ error: "evidence_store_not_configured" }, { status: 503 });
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  const indexValue = url.searchParams.get("index");
  if (!hash || !HASH_PATTERN.test(hash) || !indexValue || !INDEX_PATTERN.test(indexValue)) {
    return NextResponse.json({ error: "invalid_attachment_request" }, { status: 400 });
  }

  const stored = await getStoredClearingEvidence(hash as Hex);
  const index = Number(indexValue);
  const descriptor = stored?.evidence.attachments?.[index];
  const payload = stored?.attachmentPayloads?.[index];
  if (!descriptor || !payload) return NextResponse.json({ error: "attachment_not_found" }, { status: 404 });

  const bytes = Buffer.from(payload.dataBase64, "base64");
  const digest = `0x${createHash("sha256").update(bytes).digest("hex")}`;
  if (bytes.length !== descriptor.size || digest.toLowerCase() !== descriptor.sha256.toLowerCase() || payload.sha256.toLowerCase() !== descriptor.sha256.toLowerCase()) {
    return NextResponse.json({ error: "attachment_integrity_failed" }, { status: 409 });
  }

  const safeName = descriptor.name.replace(/[^a-zA-Z0-9._ -]/g, "_");
  const inlineImage =
    url.searchParams.get("view") === "1" &&
    (descriptor.contentType === "image/jpeg" || descriptor.contentType === "image/png");
  return new Response(bytes, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${inlineImage ? "inline" : "attachment"}; filename="${safeName}"`,
      "Content-Length": String(bytes.length),
      "Content-Type": descriptor.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
