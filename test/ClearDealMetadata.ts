import { expect } from "chai";

import {
  buildStoreDealMetadataMessage,
  hashDealMetadata,
  isFreshClearDealAuthorization,
  normalizeDealMetadata,
  serializeDealMetadata,
  type ClearDealMetadata,
} from "../lib/cleardeal-metadata.ts";

describe("ClearDeal metadata", function () {
  const metadata: ClearDealMetadata = {
    version: 1,
    client: "Acme Commerce",
    title: "Commerce website",
    milestones: [
      { title: "Design", dueDate: "2026-08-01" },
      { title: "Build", dueDate: "2026-08-15" },
    ],
  };

  it("normalizes and hashes canonical metadata deterministically", function () {
    const normalized = normalizeDealMetadata({
      ...metadata,
      client: "  Acme Commerce  ",
      title: " Commerce website ",
    });
    expect(normalized).to.deep.equal(metadata);
    expect(serializeDealMetadata(normalized!)).to.equal(serializeDealMetadata(metadata));
    expect(hashDealMetadata(normalized!)).to.equal(hashDealMetadata(metadata));
  });

  it("rejects malformed or oversized public metadata", function () {
    expect(normalizeDealMetadata({ ...metadata, milestones: [] })).to.equal(null);
    expect(normalizeDealMetadata({ ...metadata, title: "x".repeat(121) })).to.equal(null);
    expect(normalizeDealMetadata({ ...metadata, milestones: [{ title: "Design", dueDate: "tomorrow" }] })).to.equal(null);
  });

  it("binds the signature message to owner, hash, request, and time", function () {
    const message = buildStoreDealMetadataMessage({
      ownerAddress: "0x1111111111111111111111111111111111111111",
      metadataHash: hashDealMetadata(metadata),
      requestId: "11111111-1111-4111-8111-111111111111",
      issuedAt: 1_000,
    });
    expect(message).to.include("Action: store-deal-metadata");
    expect(message).to.include("Network: Arc Testnet (5042002)");
    expect(message).to.include("Signing stores public deal metadata. It does not transfer USDC.");
  });

  it("expires old authorizations", function () {
    expect(isFreshClearDealAuthorization(1_000, 1_000)).to.equal(true);
    expect(isFreshClearDealAuthorization(1_000, 1_000 + 5 * 60 * 1_000 + 1)).to.equal(false);
  });
});
