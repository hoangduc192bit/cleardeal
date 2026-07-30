import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Address, Hex } from "viem";

import type {
  ClearDealEncryptedEvidenceAttachmentPayload,
  ClearDealEvidenceAttachmentPayload,
} from "./cleardeal-evidence";

function configuredSecret() {
  return (
    process.env.CLEARDEAL_FILE_SECRET?.trim() ??
    process.env.CIRCLE_WALLET_SESSION_SECRET?.trim()
  );
}

export const isProtectedFileStoreConfigured = Boolean(
  configuredSecret() && (configuredSecret()?.length ?? 0) >= 32,
);

export interface ClearDealEncryptedPrivateValue {
  version: 1;
  ciphertextBase64: string;
  ivBase64: string;
  authTagBase64: string;
}

function keyFor(purpose: "storage" | "access") {
  const secret = configuredSecret();
  if (!secret || secret.length < 32) {
    throw new Error("protected_file_store_not_configured");
  }
  return createHash("sha256").update(`ClearDeal:${purpose}:${secret}`).digest();
}

export function encryptEvidenceAttachment(
  payload: ClearDealEvidenceAttachmentPayload,
): ClearDealEncryptedEvidenceAttachmentPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor("storage"), iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(payload.dataBase64, "base64")),
    cipher.final(),
  ]);
  return {
    version: 1,
    sha256: payload.sha256,
    ciphertextBase64: ciphertext.toString("base64"),
    ivBase64: iv.toString("base64"),
    authTagBase64: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptEvidenceAttachment(
  payload:
    | ClearDealEvidenceAttachmentPayload
    | ClearDealEncryptedEvidenceAttachmentPayload,
) {
  if ("dataBase64" in payload) {
    return Buffer.from(payload.dataBase64, "base64");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor("storage"),
    Buffer.from(payload.ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTagBase64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertextBase64, "base64")),
    decipher.final(),
  ]);
}

export function encryptPrivateJson(
  value: unknown,
): ClearDealEncryptedPrivateValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor("storage"), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    ciphertextBase64: ciphertext.toString("base64"),
    ivBase64: iv.toString("base64"),
    authTagBase64: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptPrivateJson<T>(
  value: ClearDealEncryptedPrivateValue,
): T {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor("storage"),
    Buffer.from(value.ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.authTagBase64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertextBase64, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

export type ClearDealFileAccess = "review" | "paid";

export interface ClearDealFileAccessToken {
  version: 1;
  evidenceHash: Hex;
  viewer: Address;
  access: ClearDealFileAccess;
  expiresAt: number;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function createFileAccessToken(
  payload: Omit<ClearDealFileAccessToken, "version">,
) {
  const encoded = base64Url(JSON.stringify({ version: 1, ...payload }));
  const signature = createHmac("sha256", keyFor("access"))
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyFileAccessToken(
  token: string,
  now = Date.now(),
): ClearDealFileAccessToken | null {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;
  const expectedSignature = createHmac("sha256", keyFor("access"))
    .update(encoded)
    .digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (
    supplied.length !== expectedSignature.length ||
    !timingSafeEqual(supplied, expectedSignature)
  ) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<ClearDealFileAccessToken>;
    if (
      parsed.version !== 1 ||
      typeof parsed.evidenceHash !== "string" ||
      !/^0x[a-fA-F0-9]{64}$/.test(parsed.evidenceHash) ||
      typeof parsed.viewer !== "string" ||
      !/^0x[a-fA-F0-9]{40}$/.test(parsed.viewer) ||
      (parsed.access !== "review" && parsed.access !== "paid") ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      (parsed.expiresAt as number) <= now
    ) return null;
    return parsed as ClearDealFileAccessToken;
  } catch {
    return null;
  }
}
