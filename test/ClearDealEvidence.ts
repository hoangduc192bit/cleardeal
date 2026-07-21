import { expect } from "chai";

import {
  buildStoreClearDealEvidenceMessage,
  hashClearDealEvidence,
  isFreshClearDealEvidenceAuthorization,
  normalizeClearDealEvidence,
  serializeClearDealEvidence,
  type ClearDealEvidence,
} from "../lib/cleardeal-evidence.ts";

describe("ClearDeal evidence", function () {
  const evidence: ClearDealEvidence = {
    version: 1,
    kind: "milestone_submission",
    dealId: "42",
    milestoneId: "1",
    reference: "ipfs://bafy-deliverable",
    submittedAt: 1_780_000_000_000,
  };

  it("normalizes and hashes a context-bound evidence record", function () {
    expect(normalizeClearDealEvidence({ ...evidence, reference: `  ${evidence.reference}  ` })).to.deep.equal(evidence);
    expect(hashClearDealEvidence(evidence)).to.match(/^0x[0-9a-f]{64}$/);
    expect(serializeClearDealEvidence(evidence)).to.equal(JSON.stringify({ ...evidence }));
    expect(hashClearDealEvidence({ ...evidence, dealId: "43" })).not.to.equal(hashClearDealEvidence(evidence));
  });

  it("rejects invalid role context and oversized public references", function () {
    expect(normalizeClearDealEvidence({ ...evidence, milestoneId: undefined })).to.equal(null);
    expect(normalizeClearDealEvidence({ ...evidence, kind: "dispute", milestoneId: "1" })).to.equal(null);
    expect(normalizeClearDealEvidence({ ...evidence, reference: "x".repeat(1_001) })).to.equal(null);
    expect(normalizeClearDealEvidence({ ...evidence, dealId: "-1" })).to.equal(null);
  });

  it("binds evidence authorization to signer, hash, request, and time", function () {
    const message = buildStoreClearDealEvidenceMessage({
      signerAddress: "0x0000000000000000000000000000000000000042",
      evidenceHash: hashClearDealEvidence(evidence),
      dealId: evidence.dealId,
      kind: evidence.kind,
      milestoneId: evidence.milestoneId,
      requestId: "123e4567-e89b-12d3-a456-426614174000",
      issuedAt: evidence.submittedAt,
    });
    expect(message).to.include("store-public-deal-evidence");
    expect(message).to.include("0x0000000000000000000000000000000000000042");
    expect(message).to.include(hashClearDealEvidence(evidence));
    expect(message).to.include("Deal ID: 42");
    expect(message).to.include("Milestone ID: 1");
  });

  it("expires stale evidence authorizations", function () {
    expect(isFreshClearDealEvidenceAuthorization(1_000_000, 1_000_000)).to.equal(true);
    expect(isFreshClearDealEvidenceAuthorization(1_000_000, 1_000_000 + 5 * 60 * 1_000 + 1)).to.equal(false);
  });
});
