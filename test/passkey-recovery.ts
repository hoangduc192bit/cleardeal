import { expect } from "chai";

import {
  isValidRecoveryPhrase,
  normalizeRecoveryPhrase,
  recoveryConfirmationMatches,
} from "../lib/passkey-recovery-phrase.ts";

describe("ClearDeal passkey recovery phrases", function () {
  const phrase =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

  it("normalizes and validates a standard 12-word phrase", function () {
    expect(
      normalizeRecoveryPhrase(`  ABANDON   abandon\n${phrase.split(" ").slice(2).join(" ")}  `),
    ).to.equal(phrase);
    expect(isValidRecoveryPhrase(phrase)).to.equal(true);
  });

  it("rejects malformed and reordered phrases", function () {
    expect(isValidRecoveryPhrase("abandon abandon about")).to.equal(false);
    expect(
      isValidRecoveryPhrase(
        "about abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
      ),
    ).to.equal(false);
  });

  it("requires the selected confirmation words in their exact positions", function () {
    expect(
      recoveryConfirmationMatches(phrase, ["abandon", "abandon", "abandon"]),
    ).to.equal(true);
    expect(
      recoveryConfirmationMatches(phrase, ["abandon", "about", "abandon"]),
    ).to.equal(false);
  });
});
