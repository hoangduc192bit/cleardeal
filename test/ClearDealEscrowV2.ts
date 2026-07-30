import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

describe("ClearDealEscrowV2", function () {
  const REVIEW_PERIOD = 72 * 60 * 60;
  const MAX_REVISIONS = 2;

  async function deployFixture() {
    const [buyer, seller, arbitrator, attacker] = await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const escrow = await ethers.deployContract("ClearDealEscrowV2", [await usdc.getAddress()]);
    const amounts = [ethers.parseUnits("1000", 6), ethers.parseUnits("2500", 6)];
    const total = amounts[0] + amounts[1];
    const deadline = (await time.latest()) + 30 * 24 * 60 * 60;
    await usdc.mint(buyer.address, total);
    await usdc.connect(buyer).approve(await escrow.getAddress(), total);
    await escrow.connect(buyer).createDeal(
      seller.address,
      arbitrator.address,
      ethers.id("agreement-v2"),
      deadline,
      REVIEW_PERIOD,
      MAX_REVISIONS,
      [seller.address, seller.address],
      amounts,
      [deadline - 1000, deadline - 500],
    );
    return { buyer, seller, arbitrator, attacker, usdc, escrow, amounts, total, deadline };
  }

  async function fundAndSubmit(
    fixture: Awaited<ReturnType<typeof deployFixture>>,
    milestoneId = 0,
  ) {
    await fixture.escrow.connect(fixture.buyer).fundDeal(0);
    await fixture.escrow.connect(fixture.seller).submitMilestone(
      0,
      milestoneId,
      ethers.id(`delivery-${milestoneId}`),
    );
  }

  it("stores the bounded review policy and indexes every decision maker", async function () {
    const { buyer, seller, arbitrator, escrow } = await deployFixture();
    const deal = await escrow.deals(0);
    expect(deal.reviewPeriod).to.equal(REVIEW_PERIOD);
    expect(deal.maxRevisions).to.equal(MAX_REVISIONS);
    expect(await escrow.getDealIds(buyer.address, 0, 50)).to.deep.equal([0n]);
    expect(await escrow.getDealIds(seller.address, 0, 50)).to.deep.equal([0n]);
    expect(await escrow.getDealIds(arbitrator.address, 0, 50)).to.deep.equal([0n]);
  });

  it("rejects unsafe review policies", async function () {
    const { buyer, seller, arbitrator, escrow, amounts, deadline } = await deployFixture();
    await expect(
      escrow.connect(buyer).createDeal(
        seller.address,
        arbitrator.address,
        ethers.id("short-review"),
        deadline,
        59 * 60,
        2,
        [seller.address],
        [amounts[0]],
        [deadline - 1],
      ),
    ).to.be.revertedWithCustomError(escrow, "InvalidReviewPolicy");
    await expect(
      escrow.connect(buyer).createDeal(
        seller.address,
        arbitrator.address,
        ethers.id("too-many-revisions"),
        deadline,
        REVIEW_PERIOD,
        11,
        [seller.address],
        [amounts[0]],
        [deadline - 1],
      ),
    ).to.be.revertedWithCustomError(escrow, "InvalidReviewPolicy");
  });

  it("starts a fresh review clock on every accepted submission", async function () {
    const fixture = await deployFixture();
    await fundAndSubmit(fixture);
    const first = await fixture.escrow.milestones(0, 0);
    expect(first.reviewDeadline - first.submittedAt).to.equal(REVIEW_PERIOD);

    await expect(
      fixture.escrow.connect(fixture.buyer).requestChanges(0, 0, ethers.id("fix-the-export")),
    ).to.emit(fixture.escrow, "ChangesRequested");
    const pending = await fixture.escrow.milestones(0, 0);
    expect(pending.status).to.equal(0);
    expect(pending.revisionCount).to.equal(1);
    expect(pending.deliverableHash).to.equal(ethers.ZeroHash);

    await time.increase(3600);
    await fixture.escrow.connect(fixture.seller).submitMilestone(0, 0, ethers.id("delivery-v2"));
    const resubmitted = await fixture.escrow.milestones(0, 0);
    expect(resubmitted.reviewDeadline).to.be.greaterThan(first.reviewDeadline);
    expect(resubmitted.revisionCount).to.equal(1);
  });

  it("enforces the revision limit", async function () {
    const fixture = await deployFixture();
    await fundAndSubmit(fixture);
    for (let revision = 0; revision < MAX_REVISIONS; revision += 1) {
      await fixture.escrow.connect(fixture.buyer).requestChanges(0, 0, ethers.id(`reason-${revision}`));
      await fixture.escrow.connect(fixture.seller).submitMilestone(0, 0, ethers.id(`delivery-${revision + 2}`));
    }
    await expect(
      fixture.escrow.connect(fixture.buyer).requestChanges(0, 0, ethers.id("one-more")),
    ).to.be.revertedWithCustomError(fixture.escrow, "RevisionLimitReached");
  });

  it("lets the buyer release immediately", async function () {
    const fixture = await deployFixture();
    await fundAndSubmit(fixture);
    await expect(fixture.escrow.connect(fixture.buyer).releaseMilestone(0, 0))
      .to.emit(fixture.escrow, "MilestoneReleased")
      .withArgs(0, 0, fixture.seller.address, fixture.amounts[0], false);
    expect(await fixture.usdc.balanceOf(fixture.seller.address)).to.equal(fixture.amounts[0]);
  });

  it("allows anyone to finalize after 72 hours, but not before", async function () {
    const fixture = await deployFixture();
    await fundAndSubmit(fixture);
    const milestone = await fixture.escrow.milestones(0, 0);
    await expect(
      fixture.escrow.connect(fixture.attacker).finalizeMilestone(0, 0),
    ).to.be.revertedWithCustomError(fixture.escrow, "ReviewPeriodActive");

    await time.increaseTo(Number(milestone.reviewDeadline));
    await expect(fixture.escrow.connect(fixture.attacker).finalizeMilestone(0, 0))
      .to.emit(fixture.escrow, "MilestoneReleased")
      .withArgs(0, 0, fixture.seller.address, fixture.amounts[0], true);
  });

  it("pauses automatic release when a milestone is disputed", async function () {
    const fixture = await deployFixture();
    await fundAndSubmit(fixture);
    await expect(
      fixture.escrow.connect(fixture.seller).openMilestoneDispute(0, 0, ethers.id("buyer-will-not-review")),
    ).to.emit(fixture.escrow, "MilestoneDisputed");
    const milestone = await fixture.escrow.milestones(0, 0);
    await time.increaseTo(Number(milestone.reviewDeadline) + 1);
    await expect(
      fixture.escrow.connect(fixture.seller).finalizeMilestone(0, 0),
    ).to.be.revertedWithCustomError(fixture.escrow, "InvalidState");
  });

  it("does not allow a late dispute to block an earned release", async function () {
    const fixture = await deployFixture();
    await fundAndSubmit(fixture);
    const milestone = await fixture.escrow.milestones(0, 0);
    await time.increaseTo(Number(milestone.reviewDeadline));
    await expect(
      fixture.escrow.connect(fixture.buyer).openMilestoneDispute(0, 0, ethers.id("too-late")),
    ).to.be.revertedWithCustomError(fixture.escrow, "InvalidDeadline");
  });

  it("lets only the helper split the disputed milestone", async function () {
    const fixture = await deployFixture();
    await fundAndSubmit(fixture);
    await fixture.escrow.connect(fixture.buyer).openMilestoneDispute(0, 0, ethers.id("quality"));
    const sellerAward = ethers.parseUnits("700", 6);
    await expect(
      fixture.escrow.connect(fixture.attacker).resolveMilestoneDispute(0, 0, sellerAward, ethers.id("decision")),
    ).to.be.revertedWithCustomError(fixture.escrow, "Unauthorized");
    await expect(
      fixture.escrow.connect(fixture.arbitrator).resolveMilestoneDispute(0, 0, sellerAward, ethers.id("decision")),
    )
      .to.emit(fixture.escrow, "MilestoneResolved")
      .withArgs(0, 0, sellerAward, fixture.amounts[0] - sellerAward, ethers.id("decision"));
    expect(await fixture.usdc.balanceOf(fixture.seller.address)).to.equal(sellerAward);
    expect(await fixture.usdc.balanceOf(fixture.buyer.address)).to.equal(fixture.amounts[0] - sellerAward);
  });

  it("never lets the overall deadline confiscate submitted work", async function () {
    const fixture = await deployFixture();
    await fundAndSubmit(fixture);
    await time.increaseTo(fixture.deadline + 1);
    await expect(fixture.escrow.connect(fixture.buyer).claimExpiredRefund(0))
      .to.emit(fixture.escrow, "DealRefunded")
      .withArgs(0, fixture.amounts[1]);
    expect((await fixture.escrow.milestones(0, 0)).status).to.equal(1);
    expect((await fixture.escrow.milestones(0, 1)).status).to.equal(3);
    expect(await fixture.usdc.balanceOf(await fixture.escrow.getAddress())).to.equal(fixture.amounts[0]);
  });

  it("accounts for every USDC after a mixed release, dispute, and refund", async function () {
    const fixture = await deployFixture();
    await fixture.escrow.connect(fixture.buyer).fundDeal(0);
    await fixture.escrow.connect(fixture.seller).submitMilestone(0, 0, ethers.id("delivery"));
    await fixture.escrow.connect(fixture.buyer).releaseMilestone(0, 0);
    await fixture.escrow.connect(fixture.buyer).requestRefund(0);
    await fixture.escrow.connect(fixture.seller).approveRefund(0);

    const deal = await fixture.escrow.deals(0);
    expect(deal.releasedAmount + deal.refundedAmount).to.equal(deal.totalAmount);
    expect(deal.status).to.equal(2);
    expect(await fixture.usdc.balanceOf(await fixture.escrow.getAddress())).to.equal(0);
  });
});
