import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

export const CIRCLE_GOOGLE_COOKIE = "cleardeal_google_wallet";
export const CIRCLE_GOOGLE_SESSION_SECONDS = 30 * 24 * 60 * 60;
export const CIRCLE_GOOGLE_USER_TOKEN_SECONDS = 55 * 60;
export const CIRCLE_GOOGLE_FLOW_COOKIE = "cleardeal_google_wallet_flow";
export const CIRCLE_GOOGLE_FLOW_SECONDS = 5 * 60;

export type CircleGoogleSession = {
  userToken: string;
  encryptionKey: string;
  refreshToken?: string;
  deviceId?: string;
  email?: string;
  name?: string;
  tokenExpiresAt?: number;
  expiresAt: number;
};

export type CircleGoogleFlow = {
  deviceId: string;
  deviceToken: string;
  deviceEncryptionKey: string;
  returnTo: string;
  startedAt: number;
  expiresAt: number;
};

function sessionKey() {
  const secret =
    process.env.CIRCLE_WALLET_SESSION_SECRET?.trim() ||
    process.env.CIRCLE_API_KEY?.trim();

  if (!secret) {
    throw new Error("circle_wallet_session_not_configured");
  }

  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secret),
      Buffer.from("cleardeal-circle-wallet"),
      Buffer.from("google-user-controlled-session-v1"),
      32,
    ),
  );
}

function sealPayload(payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

function openPayload<T>(value?: string) {
  if (!value) return undefined;

  try {
    const payload = Buffer.from(value, "base64url");
    if (payload.length < 29) return undefined;

    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const ciphertext = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return undefined;
  }
}

export function sealCircleGoogleSession(session: CircleGoogleSession) {
  return sealPayload(session);
}

export function openCircleGoogleSession(value?: string) {
  const session = openPayload<CircleGoogleSession>(value);
  if (!session) return undefined;

  try {
    if (
      !session.userToken ||
      !session.encryptionKey ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now()
    ) {
      return undefined;
    }

    return session;
  } catch {
    return undefined;
  }
}

export function sealCircleGoogleFlow(flow: CircleGoogleFlow) {
  return sealPayload(flow);
}

export function openCircleGoogleFlow(value?: string) {
  const flow = openPayload<CircleGoogleFlow>(value);
  if (!flow) return undefined;

  try {
    if (
      !flow.deviceToken ||
      !flow.deviceEncryptionKey ||
      !flow.returnTo ||
      !Number.isFinite(flow.startedAt) ||
      !Number.isFinite(flow.expiresAt) ||
      flow.expiresAt <= Date.now()
    ) {
      return undefined;
    }

    return flow;
  } catch {
    return undefined;
  }
}
