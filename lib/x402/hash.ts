import { createHash } from "node:crypto";

export function hashX402Data(data: unknown) {
  return `0x${createHash("sha256").update(JSON.stringify(data)).digest("hex")}`;
}
