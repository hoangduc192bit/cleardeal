import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

describe("ClearDealClearingHouse", function () {
  async function deployFixture() {
    const [alice, bob, carol, verifierOne, verifierTwo, verifierThree, arbitrator, outsider] = await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const clearing = await ethers.deployContract("ClearDealClearingHouse", [await usdc.getAddress()]);
    const now = await time.latest();
    const evidenceDeadline = now + 7 * 24 * 60 * 60;
    const fundingDeadline = now + 14 * 24 * 60 * 60;
    const participants = [alice.address, bob.address, carol.address];
    const verifiers = [verifierOne.address, verifierTwo.address, verifierThree.address];
    const obligations = [
      { payer: alice.address, provider: bob.address, amount: ethers.parseUnits("100", 6), bondAmount: ethers.parseUnits("10", 6), specHash: ethers.id("A-to-B") },
      { payer: bob.address, provider: carol.address, amount: ethers.parseUnits("90", 6), bondAmount: ethers.parseUnits("9", 6), specHash: ethers.id("B-to-C") },
      { payer: carol.address, provider: alice.address, amount: ethers.parseUnits("80", 6), bondAmount: ethers.parseUnits("8", 6), specHash: ethers.id("C-to-A") },
    ];
    await clearing.connect(alice).createCycle(
      { arbitrator: arbitrator.address, metadataHash: ethers.id("cycle-one"), evidenceDeadline, fundingDeadline, verifierThreshold: 2 },
      participants,
      verifiers,
      obligations,
    );
    for (const account of [alice, bob, carol]) await usdc.mint(account.address, ethers.parseUnits("1000", 6));
    return { alice, bob, carol, verifierOne, verifierTwo, verifierThree, arbitrator, outsider, usdc, clearing, obligations, evidenceDeadline, fundingDeadline };
  }

  async function postAndSubmitAll(fixture: Awaited<ReturnType<typeof deployFixture>>) {
    const { alice, bob, carol, usdc, clearing, obligations } = fixture;
    const providers = [bob, carol, alice];
    for (let index = 0; index < obligations.length; index += 1) {
      await usdc.connect(providers[index]).approve(await clearing.getAddress(), obligations[index].bondAmount);
      await clearing.connect(providers[index]).postBond(0, index);
      await clearing.connect(providers[index]).submitEvidence(0, index, ethers.id(`evidence-${index}`));
    }
  }

  async function approveAll(fixture: Awaited<ReturnType<typeof deployFixture>>) {
    for (let index = 0; index < fixture.obligations.length; index += 1) {
      await fixture.clearing.connect(fixture.verifierOne).castVote(0, index, true);
      await fixture.clearing.connect(fixture.verifierTwo).castVote(0, index, true);
    }
  }

  it("indexes every economic and verification role", async function () {
    const { alice, verifierOne, arbitrator, clearing } = await deployFixture();
    expect(await clearing.roleCycleCount(alice.address)).to.equal(1n);
    expect(await clearing.roleCycleCount(verifierOne.address)).to.equal(1n);
    expect(await clearing.roleCycleCount(arbitrator.address)).to.equal(1n);
    expect(await clearing.getCycleIds(verifierOne.address, 0, 20)).to.deep.equal([0n]);
  });

  it("nets a 270 USDC obligation cycle down to 20 USDC", async function () {
    const fixture = await deployFixture();
    await postAndSubmitAll(fixture);
    await approveAll(fixture);
    await expect(fixture.clearing.closeCycle(0))
      .to.emit(fixture.clearing, "CycleCleared")
      .withArgs(0, ethers.parseUnits("270", 6), ethers.parseUnits("20", 6), ethers.parseUnits("250", 6));

    expect(await fixture.clearing.netPositions(0, fixture.alice.address)).to.equal(-ethers.parseUnits("20", 6));
    expect(await fixture.clearing.netPositions(0, fixture.bob.address)).to.equal(ethers.parseUnits("10", 6));
    expect(await fixture.clearing.netPositions(0, fixture.carol.address)).to.equal(ethers.parseUnits("10", 6));

    await fixture.usdc.connect(fixture.alice).approve(await fixture.clearing.getAddress(), ethers.parseUnits("20", 6));
    await fixture.clearing.connect(fixture.alice).fundNetPosition(0);
    await expect(fixture.clearing.settleCycle(0)).to.emit(fixture.clearing, "CycleSettled");
    expect((await fixture.clearing.cycles(0)).status).to.equal(2);
    expect(await fixture.usdc.balanceOf(await fixture.clearing.getAddress())).to.equal(0);
    expect((await fixture.clearing.riskPassports(fixture.bob.address)).passedObligations).to.equal(1n);
  });

  it("slashes a rejected provider bond to the payer", async function () {
    const fixture = await deployFixture();
    const { bob, verifierOne, verifierTwo, usdc, clearing, obligations, alice } = fixture;
    await usdc.connect(bob).approve(await clearing.getAddress(), obligations[0].bondAmount);
    await clearing.connect(bob).postBond(0, 0);
    await clearing.connect(bob).submitEvidence(0, 0, ethers.id("bad-evidence"));
    await clearing.connect(verifierOne).castVote(0, 0, false);
    await clearing.connect(verifierTwo).castVote(0, 0, false);
    await time.increaseTo(fixture.evidenceDeadline + 1);
    const before = await usdc.balanceOf(alice.address);
    await clearing.closeCycle(0);
    expect(await usdc.balanceOf(alice.address)).to.equal(before + obligations[0].bondAmount);
    const passport = await clearing.riskPassports(bob.address);
    expect(passport.failedObligations).to.equal(1n);
    expect(passport.slashedBond).to.equal(obligations[0].bondAmount);
  });

  it("prevents unauthorized and duplicate verification votes", async function () {
    const fixture = await deployFixture();
    const { bob, usdc, clearing, obligations, outsider, verifierOne } = fixture;
    await usdc.connect(bob).approve(await clearing.getAddress(), obligations[0].bondAmount);
    await clearing.connect(bob).postBond(0, 0);
    await clearing.connect(bob).submitEvidence(0, 0, ethers.id("evidence"));
    await expect(clearing.connect(outsider).castVote(0, 0, true)).to.be.revertedWithCustomError(clearing, "Unauthorized");
    await clearing.connect(verifierOne).castVote(0, 0, true);
    await expect(clearing.connect(verifierOne).castVote(0, 0, true)).to.be.revertedWithCustomError(clearing, "AlreadyVoted");
  });

  it("lets the independent arbitrator break a verification deadlock", async function () {
    const fixture = await deployFixture();
    const { bob, usdc, clearing, obligations, verifierOne, verifierTwo, arbitrator } = fixture;
    await usdc.connect(bob).approve(await clearing.getAddress(), obligations[0].bondAmount);
    await clearing.connect(bob).postBond(0, 0);
    await clearing.connect(bob).submitEvidence(0, 0, ethers.id("mixed-evidence"));
    await clearing.connect(verifierOne).castVote(0, 0, true);
    await clearing.connect(verifierTwo).castVote(0, 0, false);
    await expect(clearing.connect(arbitrator).resolveObligation(0, 0, true))
      .to.emit(clearing, "ObligationFinalized")
      .withArgs(0, 0, true, arbitrator.address);
  });

  it("refunds funded debtors and records unfunded debtor defaults", async function () {
    const fixture = await deployFixture();
    await postAndSubmitAll(fixture);
    await approveAll(fixture);
    await fixture.clearing.closeCycle(0);
    await time.increaseTo(fixture.fundingDeadline + 1);
    await expect(fixture.clearing.defaultCycle(0)).to.emit(fixture.clearing, "CycleDefaulted");
    expect((await fixture.clearing.riskPassports(fixture.alice.address)).defaultedCycles).to.equal(1n);
    expect((await fixture.clearing.cycles(0)).status).to.equal(3);
    expect(await fixture.usdc.balanceOf(await fixture.clearing.getAddress())).to.equal(0);
  });

  it("rejects participant verifiers and unknown obligation parties", async function () {
    const { alice, bob, carol, arbitrator, clearing, evidenceDeadline, fundingDeadline } = await deployFixture();
    const obligation = [{ payer: alice.address, provider: bob.address, amount: 1n, bondAmount: 1n, specHash: ethers.id("x") }];
    await expect(clearing.connect(alice).createCycle(
      { arbitrator: arbitrator.address, metadataHash: ethers.id("invalid"), evidenceDeadline, fundingDeadline, verifierThreshold: 1 },
      [alice.address, bob.address, carol.address],
      [bob.address],
      obligation,
    )).to.be.revertedWithCustomError(clearing, "InvalidAddress");
  });
});
