import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

describe("ClearDealEscrow", function () {
  async function deployFixture() {
    const [buyer, seller, arbitrator, attacker] = await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const escrow = await ethers.deployContract("ClearDealEscrow", [await usdc.getAddress()]);
    const amounts = [ethers.parseUnits("1000", 6), ethers.parseUnits("2500", 6)];
    const total = amounts[0] + amounts[1];
    const deadline = (await time.latest()) + 30 * 24 * 60 * 60;
    await usdc.mint(buyer.address, total);
    await usdc.connect(buyer).approve(await escrow.getAddress(), total);
    await escrow.connect(buyer).createDeal(
      seller.address,
      arbitrator.address,
      ethers.id("agreement-v1"),
      deadline,
      [seller.address, seller.address],
      amounts,
      [deadline - 1000, deadline - 500],
    );
    return { buyer, seller, arbitrator, attacker, usdc, escrow, amounts, total, deadline };
  }

  it("funds the full agreement and releases only a submitted milestone", async function () {
    const { buyer, seller, usdc, escrow, amounts, total } = await deployFixture();
    await expect(escrow.connect(buyer).fundDeal(0)).to.emit(escrow, "DealFunded").withArgs(0, total);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(total);

    await expect(escrow.connect(seller).submitMilestone(0, 0, ethers.id("deliverable-1")))
      .to.emit(escrow, "MilestoneSubmitted");
    await expect(escrow.connect(buyer).releaseMilestone(0, 0))
      .to.emit(escrow, "MilestoneReleased")
      .withArgs(0, 0, seller.address, amounts[0]);

    expect(await usdc.balanceOf(seller.address)).to.equal(amounts[0]);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(amounts[1]);
  });

  it("indexes a deal for buyer, seller, and arbitrator", async function () {
    const { buyer, seller, arbitrator, escrow } = await deployFixture();
    expect(await escrow.participantDealCount(buyer.address)).to.equal(1n);
    expect(await escrow.getDealIds(buyer.address, 0, 50)).to.deep.equal([0n]);
    expect(await escrow.getDealIds(seller.address, 0, 50)).to.deep.equal([0n]);
    expect(await escrow.getDealIds(arbitrator.address, 0, 50)).to.deep.equal([0n]);
    expect(await escrow.getDealIds(buyer.address, 1, 50)).to.deep.equal([]);
  });

  it("rejects conflicted roles and invalid milestone deadlines", async function () {
    const { buyer, seller, arbitrator, escrow, amounts, deadline } = await deployFixture();
    await expect(
      escrow.connect(buyer).createDeal(
        buyer.address,
        arbitrator.address,
        ethers.id("conflicted"),
        deadline,
        [seller.address],
        [amounts[0]],
        [deadline - 1],
      ),
    ).to.be.revertedWithCustomError(escrow, "InvalidAddress");
    await expect(
      escrow.connect(buyer).createDeal(
        seller.address,
        arbitrator.address,
        ethers.id("late-milestone"),
        deadline,
        [seller.address],
        [amounts[0]],
        [deadline + 1],
      ),
    ).to.be.revertedWithCustomError(escrow, "InvalidDeadline");
    await expect(
      escrow.connect(buyer).createDeal(
        seller.address,
        arbitrator.address,
        ethers.ZeroHash,
        deadline,
        [seller.address],
        [amounts[0]],
        [deadline - 1],
      ),
    ).to.be.revertedWithCustomError(escrow, "InvalidMetadata");
  });

  it("prevents unauthorized release and release before submission", async function () {
    const { buyer, attacker, escrow } = await deployFixture();
    await escrow.connect(buyer).fundDeal(0);
    await expect(escrow.connect(attacker).releaseMilestone(0, 0)).to.be.revertedWithCustomError(escrow, "Unauthorized");
    await expect(escrow.connect(buyer).releaseMilestone(0, 0)).to.be.revertedWithCustomError(escrow, "InvalidState");
  });

  it("supports a seller-approved refund of unreleased USDC", async function () {
    const { buyer, seller, usdc, escrow, total } = await deployFixture();
    await escrow.connect(buyer).fundDeal(0);
    await escrow.connect(buyer).requestRefund(0);
    await expect(escrow.connect(seller).approveRefund(0)).to.emit(escrow, "DealRefunded").withArgs(0, total);
    expect(await usdc.balanceOf(buyer.address)).to.equal(total);
    expect((await escrow.deals(0)).status).to.equal(3);
  });

  it("lets the buyer recover remaining funds after the deadline", async function () {
    const { buyer, usdc, escrow, total, deadline } = await deployFixture();
    await escrow.connect(buyer).fundDeal(0);
    await time.increaseTo(deadline + 1);
    await escrow.connect(buyer).claimExpiredRefund(0);
    expect(await usdc.balanceOf(buyer.address)).to.equal(total);
  });

  it("allows only the arbitrator to resolve a dispute", async function () {
    const { buyer, seller, arbitrator, attacker, usdc, escrow, total } = await deployFixture();
    await escrow.connect(buyer).fundDeal(0);
    await escrow.connect(seller).openDispute(0, ethers.id("scope disagreement"));
    await expect(escrow.connect(attacker).resolveDispute(0, 1, ethers.id("resolution"))).to.be.revertedWithCustomError(escrow, "Unauthorized");

    const award = ethers.parseUnits("1200", 6);
    await expect(escrow.connect(arbitrator).resolveDispute(0, award, ethers.id("resolution")))
      .to.emit(escrow, "DisputeResolved")
      .withArgs(0, award, total - award, ethers.id("resolution"));
    expect(await usdc.balanceOf(seller.address)).to.equal(award);
    expect(await usdc.balanceOf(buyer.address)).to.equal(total - award);
  });
});
