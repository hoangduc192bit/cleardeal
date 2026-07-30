import { expect } from "chai";

import {
  createFileAccessToken,
  decryptEvidenceAttachment,
  encryptEvidenceAttachment,
  verifyFileAccessToken,
} from "../lib/cleardeal-protected-files.ts";

describe("ClearDeal protected files", function () {
  before(function () {
    process.env.CLEARDEAL_FILE_SECRET =
      "test-only-cleardeal-file-secret-with-more-than-32-characters";
  });

  it("encrypts attachment bytes at rest and verifies integrity after decrypting", function () {
    const source = Buffer.from("clean delivery contents");
    const encrypted = encryptEvidenceAttachment({
      sha256: `0x${"a".repeat(64)}`,
      dataBase64: source.toString("base64"),
    });
    expect(encrypted.ciphertextBase64).not.to.equal(source.toString("base64"));
    expect(decryptEvidenceAttachment(encrypted).equals(source)).to.equal(true);
  });

  it("issues short-lived evidence-bound access tokens", function () {
    const payload = {
      evidenceHash: `0x${"b".repeat(64)}` as const,
      viewer: "0x0000000000000000000000000000000000000042" as const,
      access: "review" as const,
      expiresAt: 2_000_000,
    };
    const token = createFileAccessToken(payload);
    expect(verifyFileAccessToken(token, 1_000_000)).to.deep.equal({
      version: 1,
      ...payload,
    });
    expect(verifyFileAccessToken(token, 2_000_001)).to.equal(null);
    expect(verifyFileAccessToken(`${token}x`, 1_000_000)).to.equal(null);
  });
});
