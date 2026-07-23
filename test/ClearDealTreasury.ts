import { expect } from "chai";
import hre from "hardhat";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

describe("ClearDealTreasury", function () {
  async function deployFixture() {
    const [requester, manager, finance, vendor, outsider] =
      await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const treasury = await ethers.deployContract("ClearDealTreasury", [
      await usdc.getAddress(),
    ]);
    const budget = ethers.parseUnits("5000", 6);
    const payout = ethers.parseUnits("4700", 6);
    const metadataHash = ethers.id("CD-MKT-001-metadata");
    const memoId = ethers.id("CD-MKT-001");
    await treasury
      .connect(requester)
      .createExpense(
        manager.address,
        finance.address,
        vendor.address,
        budget,
        metadataHash,
        memoId,
      );
    await usdc.mint(finance.address, ethers.parseUnits("10000", 6));
    return {
      requester,
      manager,
      finance,
      vendor,
      outsider,
      usdc,
      treasury,
      budget,
      payout,
      metadataHash,
      memoId,
    };
  }

  it("runs request, approval, evidence, and vendor payment end to end", async function () {
    const fixture = await deployFixture();
    const { requester, manager, finance, vendor, usdc, treasury, payout, memoId } =
      fixture;

    await expect(treasury.connect(manager).managerDecision(0, true))
      .to.emit(treasury, "ManagerDecision")
      .withArgs(0, manager.address, true);
    await expect(
      treasury
        .connect(requester)
        .submitEvidence(0, ethers.id("invoice-and-delivery"), payout),
    )
      .to.emit(treasury, "ExpenseEvidenceSubmitted")
      .withArgs(0, requester.address, ethers.id("invoice-and-delivery"), payout);

    await usdc.connect(finance).approve(await treasury.getAddress(), payout);
    await expect(treasury.connect(finance).payExpense(0))
      .to.emit(treasury, "ExpensePaid")
      .withArgs(0, finance.address, vendor.address, payout, memoId);

    expect(await usdc.balanceOf(vendor.address)).to.equal(payout);
    expect((await treasury.expenses(0)).status).to.equal(3);
  });

  it("indexes each company role without duplicating a manager-finance wallet", async function () {
    const { requester, manager, finance, vendor, treasury } =
      await deployFixture();
    expect(await treasury.roleExpenseCount(requester.address)).to.equal(1);
    expect(await treasury.roleExpenseCount(manager.address)).to.equal(1);
    expect(await treasury.roleExpenseCount(finance.address)).to.equal(1);
    expect(await treasury.roleExpenseCount(vendor.address)).to.equal(1);

    await treasury
      .connect(requester)
      .createExpense(
        manager.address,
        manager.address,
        vendor.address,
        1,
        ethers.id("second"),
        ethers.id("CD-MKT-002"),
      );
    expect(await treasury.roleExpenseCount(manager.address)).to.equal(2);
  });

  it("blocks evidence above the approved budget", async function () {
    const { requester, manager, treasury, budget } = await deployFixture();
    await treasury.connect(manager).managerDecision(0, true);
    await expect(
      treasury
        .connect(requester)
        .submitEvidence(0, ethers.id("invoice"), budget + 1n),
    ).to.be.revertedWithCustomError(treasury, "InvalidAmount");
  });

  it("blocks unauthorized approvals and payments", async function () {
    const { requester, manager, outsider, treasury, payout } =
      await deployFixture();
    await expect(
      treasury.connect(outsider).managerDecision(0, true),
    ).to.be.revertedWithCustomError(treasury, "Unauthorized");
    await treasury.connect(manager).managerDecision(0, true);
    await treasury
      .connect(requester)
      .submitEvidence(0, ethers.id("invoice"), payout);
    await expect(
      treasury.connect(outsider).payExpense(0),
    ).to.be.revertedWithCustomError(treasury, "Unauthorized");
  });

  it("lets the manager or finance reject before money moves", async function () {
    const first = await deployFixture();
    await expect(first.treasury.connect(first.manager).managerDecision(0, false))
      .to.emit(first.treasury, "ExpenseRejected")
      .withArgs(0, first.manager.address);
    expect((await first.treasury.expenses(0)).status).to.equal(4);

    const second = await deployFixture();
    await second.treasury.connect(second.manager).managerDecision(0, true);
    await second.treasury
      .connect(second.requester)
      .submitEvidence(0, ethers.id("invoice"), second.payout);
    await expect(second.treasury.connect(second.finance).rejectByFinance(0))
      .to.emit(second.treasury, "ExpenseRejected")
      .withArgs(0, second.finance.address);
    expect((await second.treasury.expenses(0)).status).to.equal(4);
  });

  it("lets only the requester cancel before manager approval", async function () {
    const first = await deployFixture();
    await expect(first.treasury.connect(first.outsider).cancelExpense(0))
      .to.be.revertedWithCustomError(first.treasury, "Unauthorized");
    await expect(first.treasury.connect(first.requester).cancelExpense(0))
      .to.emit(first.treasury, "ExpenseCancelled")
      .withArgs(0, first.requester.address);
    expect((await first.treasury.expenses(0)).status).to.equal(5);

    const second = await deployFixture();
    await second.treasury.connect(second.manager).managerDecision(0, true);
    await expect(
      second.treasury.connect(second.requester).cancelExpense(0),
    ).to.be.revertedWithCustomError(second.treasury, "InvalidState");
  });
});
