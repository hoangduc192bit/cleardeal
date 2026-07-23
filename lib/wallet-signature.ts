import {
  createPublicClient,
  http,
  isHex,
  size,
  stringToHex,
  type Address,
  type Hex,
  type SignableMessage,
} from "viem";

import { arcTestnet } from "@/config/chain";

const MIN_SIGNATURE_BYTES = 64;
const MAX_SIGNATURE_BYTES = 8_192;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(arcTestnet.rpcUrls.default.http[0]),
});

export function isSupportedWalletSignature(value: unknown): value is Hex {
  if (typeof value !== "string" || !isHex(value, { strict: true })) return false;
  const byteLength = size(value);
  return byteLength >= MIN_SIGNATURE_BYTES && byteLength <= MAX_SIGNATURE_BYTES;
}

export async function verifyWalletMessage(input: {
  address: Address;
  message: SignableMessage;
  signature: Hex;
}) {
  if (await publicClient.verifyMessage(input).catch(() => false)) {
    return true;
  }

  // Compatibility for Circle Modular Wallets 1.0.14 EIP-1193 clients that
  // signed the hex-encoded `personal_sign` challenge as literal UTF-8 text.
  // The candidate is deterministically derived from the same authorization
  // message, so the wallet still signs every server-validated field.
  if (typeof input.message === "string") {
    return publicClient
      .verifyMessage({
        ...input,
        message: stringToHex(input.message),
      })
      .catch(() => false);
  }

  return false;
}
