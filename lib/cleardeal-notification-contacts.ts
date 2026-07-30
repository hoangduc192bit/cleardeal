import { keccak256, toBytes, type Hex } from "viem";

export interface ClearDealNotificationContacts {
  clientEmail?: string;
  teamEmail?: string;
}

export const EMPTY_NOTIFICATION_CONTACTS_HASH =
  `0x${"0".repeat(64)}` as Hex;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNotificationContacts(
  value: unknown,
): ClearDealNotificationContacts | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object") return null;
  const input = value as Partial<ClearDealNotificationContacts>;
  const clientEmail =
    typeof input.clientEmail === "string"
      ? input.clientEmail.trim().toLowerCase()
      : "";
  const teamEmail =
    typeof input.teamEmail === "string"
      ? input.teamEmail.trim().toLowerCase()
      : "";
  if (
    (clientEmail && (!EMAIL_PATTERN.test(clientEmail) || clientEmail.length > 254)) ||
    (teamEmail && (!EMAIL_PATTERN.test(teamEmail) || teamEmail.length > 254))
  ) return null;
  return {
    ...(clientEmail ? { clientEmail } : {}),
    ...(teamEmail ? { teamEmail } : {}),
  };
}

export function serializeNotificationContacts(
  contacts: ClearDealNotificationContacts,
) {
  return JSON.stringify({
    clientEmail: contacts.clientEmail ?? null,
    teamEmail: contacts.teamEmail ?? null,
  });
}

export function hashNotificationContacts(
  contacts: ClearDealNotificationContacts,
) {
  if (!contacts.clientEmail && !contacts.teamEmail) {
    return EMPTY_NOTIFICATION_CONTACTS_HASH;
  }
  return keccak256(toBytes(serializeNotificationContacts(contacts)));
}
