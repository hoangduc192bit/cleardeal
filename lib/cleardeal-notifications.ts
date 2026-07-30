import type { Hex } from "viem";

import {
  decryptPrivateJson,
  encryptPrivateJson,
  type ClearDealEncryptedPrivateValue,
} from "@/lib/cleardeal-protected-files";
import {
  normalizeNotificationContacts,
  type ClearDealNotificationContacts,
} from "@/lib/cleardeal-notification-contacts";
import { redisCommand } from "@/lib/kv-rest";

const CONTACTS_PREFIX = "cleardeal:notification-contacts:";

export async function storeNotificationContacts(
  metadataHash: Hex,
  contacts: ClearDealNotificationContacts,
) {
  if (!contacts.clientEmail && !contacts.teamEmail) return;
  const result = await redisCommand<string>([
    "SET",
    `${CONTACTS_PREFIX}${metadataHash.toLowerCase()}`,
    JSON.stringify(encryptPrivateJson(contacts)),
  ]);
  if (result !== "OK") throw new Error("notification_contacts_store_failed");
}

export async function getNotificationContacts(metadataHash: Hex) {
  const value = await redisCommand<string>([
    "GET",
    `${CONTACTS_PREFIX}${metadataHash.toLowerCase()}`,
  ]);
  if (!value) return {};
  try {
    return normalizeNotificationContacts(
      decryptPrivateJson<ClearDealNotificationContacts>(
        JSON.parse(value) as ClearDealEncryptedPrivateValue,
      ),
    ) ?? {};
  } catch {
    return {};
  }
}

export async function deleteNotificationContacts(metadataHash: Hex) {
  await redisCommand<number>([
    "DEL",
    `${CONTACTS_PREFIX}${metadataHash.toLowerCase()}`,
  ]);
}
