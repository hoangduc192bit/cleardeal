import {
  createPublicClient,
  http,
  isHex,
  size,
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
  return publicClient.verifyMessage(input).catch(() => false);
}
