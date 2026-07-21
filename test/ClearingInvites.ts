import { expect } from "chai";

import { buildClearingInvitePath, parseCycleId, parseInviteRole, parseInviteWallet } from "../lib/clearing-invites.ts";

describe("ClearDeal clearing invitations", function () {
  const wallet = "0x1111111111111111111111111111111111111111";

  it("builds a role-bound cycle deep link", function () {
    const path = buildClearingInvitePath(42n, "verifier", wallet);
    expect(path).to.include("cycle=42");
    expect(path).to.include("role=verifier");
    expect(path).to.include(`wallet=${wallet}`);
  });

  it("rejects malformed deep-link parameters", function () {
    expect(parseCycleId("42")).to.equal(42n);
    expect(parseCycleId("-1")).to.equal(undefined);
    expect(parseCycleId("1.5")).to.equal(undefined);
    expect(parseInviteRole("provider")).to.equal(undefined);
    expect(parseInviteWallet("not-a-wallet")).to.equal(undefined);
  });

  it("accepts every supported invitation role", function () {
    expect(parseInviteRole("participant")).to.equal("participant");
    expect(parseInviteRole("verifier")).to.equal("verifier");
    expect(parseInviteRole("arbitrator")).to.equal("arbitrator");
  });
});
