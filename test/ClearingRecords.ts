import { expect } from "chai";
import {
  buildStoreClearingMetadataMessage,
  hashClearingMetadata,
  isFreshClearingAuthorization,
  normalizeClearingMetadata,
  serializeClearingMetadata,
  type ClearingMetadata,
} from "../lib/clearing-metadata.ts";
import {
  buildStoreClearingEvidenceMessage,
  hashClearingEvidence,
  isFreshClearingEvidenceAuthorization,
  normalizeClearingEvidence,
  type ClearingEvidence,
} from "../lib/clearing-evidence.ts";

describe("ClearDeal clearing records", function () {
  const metadata: ClearingMetadata = {
    version: 1,
    name: "Agent launch cycle",
    description: "Three-agent clearing graph",
    participants: [
      { address: "0x1111111111111111111111111111111111111111", label: "Agent A" },
      { address: "0x2222222222222222222222222222222222222222", label: "Agent B" },
    ],
    verifiers: [{ address: "0x3333333333333333333333333333333333333333", label: "Verifier" }],
    obligations: [{ payer: "0x1111111111111111111111111111111111111111", provider: "0x2222222222222222222222222222222222222222", title: "Verified report", acceptance: "Valid JSON schema" }],
  };

  it("normalizes and hashes canonical clearing terms", function () {
    const normalized = normalizeClearingMetadata({ ...metadata, name: " Agent launch cycle " });
    expect(normalized).to.deep.equal(metadata);
    expect(serializeClearingMetadata(normalized!)).to.equal(serializeClearingMetadata(metadata));
    expect(hashClearingMetadata(metadata)).to.match(/^0x[0-9a-f]{64}$/);
  });

  it("rejects malformed clearing roles and obligations", function () {
    expect(normalizeClearingMetadata({ ...metadata, participants: [] })).to.equal(null);
    expect(normalizeClearingMetadata({ ...metadata, verifiers: [{ address: "bad", label: "Verifier" }] })).to.equal(null);
    expect(normalizeClearingMetadata({ ...metadata, obligations: [{ ...metadata.obligations[0], acceptance: "" }] })).to.equal(null);
  });

  it("binds public metadata storage to the creator wallet", function () {
    const message = buildStoreClearingMetadataMessage({ ownerAddress: metadata.participants[0].address, metadataHash: hashClearingMetadata(metadata), requestId: "123e4567-e89b-12d3-a456-426614174000", issuedAt: 10_000 });
    expect(message).to.include("store-clearing-cycle-metadata");
    expect(message).to.include(metadata.participants[0].address);
    expect(isFreshClearingAuthorization(10_000, 10_000)).to.equal(true);
    expect(isFreshClearingAuthorization(10_000, 310_001)).to.equal(false);
  });

  it("hashes evidence in cycle and obligation context", function () {
    const evidence: ClearingEvidence = { version: 1, cycleId: "9", obligationId: "2", reference: "https://example.com/proof", submittedAt: "2026-07-19T12:00:00.000Z" };
    expect(normalizeClearingEvidence({ ...evidence, reference: ` ${evidence.reference} ` })).to.deep.equal(evidence);
    expect(hashClearingEvidence({ ...evidence, obligationId: "3" })).not.to.equal(hashClearingEvidence(evidence));
    const message = buildStoreClearingEvidenceMessage({ providerAddress: metadata.participants[1].address, evidenceHash: hashClearingEvidence(evidence), requestId: "123e4567-e89b-12d3-a456-426614174000", issuedAt: 10_000 });
    expect(message).to.include("store-clearing-evidence");
    expect(message).to.include(hashClearingEvidence(evidence));
    expect(isFreshClearingEvidenceAuthorization(10_000, 310_001)).to.equal(false);
  });

  it("binds safe evidence attachments into the signed evidence hash", function () {
    const evidence: ClearingEvidence = {
      version: 1,
      cycleId: "9",
      obligationId: "2",
      reference: "Delivery receipt attached.",
      submittedAt: "2026-07-19T12:00:00.000Z",
      attachments: [{
        name: "receipt.pdf",
        contentType: "application/pdf",
        size: 128,
        sha256: `0x${"1".repeat(64)}`,
      }],
    };
    expect(normalizeClearingEvidence(evidence)).to.deep.equal(evidence);
    expect(hashClearingEvidence(evidence)).to.match(/^0x[0-9a-f]{64}$/);
    expect(hashClearingEvidence({ ...evidence, attachments: undefined })).not.to.equal(hashClearingEvidence(evidence));
    expect(normalizeClearingEvidence({
      ...evidence,
      attachments: [{ ...evidence.attachments[0], size: 0 }],
    })).to.equal(null);
  });
});
