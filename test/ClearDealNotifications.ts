import { expect } from "chai";

import {
  EMPTY_NOTIFICATION_CONTACTS_HASH,
  hashNotificationContacts,
  normalizeNotificationContacts,
} from "../lib/cleardeal-notification-contacts.ts";

describe("ClearDeal notification contacts", function () {
  it("normalizes private contact addresses and binds them to a hash", function () {
    const contacts = normalizeNotificationContacts({
      clientEmail: " CLIENT@Example.com ",
      teamEmail: "team@studio.vn",
    });
    expect(contacts).to.deep.equal({
      clientEmail: "client@example.com",
      teamEmail: "team@studio.vn",
    });
    expect(hashNotificationContacts(contacts ?? {})).to.match(/^0x[0-9a-f]{64}$/);
    expect(hashNotificationContacts(contacts ?? {})).not.to.equal(
      EMPTY_NOTIFICATION_CONTACTS_HASH,
    );
  });

  it("rejects malformed emails and uses a zero hash when notifications are off", function () {
    expect(normalizeNotificationContacts({ clientEmail: "not-an-email" })).to.equal(null);
    expect(hashNotificationContacts({})).to.equal(EMPTY_NOTIFICATION_CONTACTS_HASH);
  });
});
