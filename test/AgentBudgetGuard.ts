import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

describe("AgentBudgetGuard", function () {
  async function deployFixture() {
    const [owner, agent, provider] = await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const guard = await ethers.deployContract("AgentBudgetGuard", [await usdc.getAddress()]);
    const fiveUsdc = ethers.parseUnits("5", 6);

    await usdc.mint(agent.address, ethers.parseUnits("20", 6));
    await usdc.connect(agent).approve(await guard.getAddress(), ethers.MaxUint256);
    await guard.setPolicy(agent.address, fiveUsdc, true);

    return { owner, agent, provider, usdc, guard, fiveUsdc };
  }

  it("enforces the daily limit and transfers USDC to the provider", async function () {
    const { agent, provider, usdc, guard, fiveUsdc } = await deployFixture();
    const paymentId = ethers.id("payment-1");

    await expect(guard.connect(agent).spend(provider.address, fiveUsdc, paymentId))
      .to.emit(guard, "AgentPayment")
      .withArgs(agent.address, provider.address, fiveUsdc, fiveUsdc, fiveUsdc, paymentId);

    expect(await usdc.balanceOf(provider.address)).to.equal(fiveUsdc);
    await expect(
      guard.connect(agent).spend(provider.address, 1, ethers.id("payment-2")),
    ).to.be.revertedWithCustomError(guard, "DailyLimitExceeded");
  });

  it("rejects replayed payment identifiers", async function () {
    const { agent, provider, guard } = await deployFixture();
    const paymentId = ethers.id("same-payment");

    await guard.connect(agent).spend(provider.address, 1, paymentId);
    await expect(guard.connect(agent).spend(provider.address, 1, paymentId))
      .to.be.revertedWithCustomError(guard, "PaymentAlreadyUsed");
  });

  it("resets spent budget after one day", async function () {
    const { agent, provider, guard, fiveUsdc } = await deployFixture();

    await guard.connect(agent).spend(provider.address, fiveUsdc, ethers.id("day-1"));
    await time.increase(24 * 60 * 60);

    expect(await guard.remainingToday(agent.address)).to.equal(fiveUsdc);
    await expect(guard.connect(agent).spend(provider.address, fiveUsdc, ethers.id("day-2")))
      .to.emit(guard, "AgentPayment");
  });

  it("blocks inactive policies and spending while paused", async function () {
    const { agent, provider, guard, fiveUsdc } = await deployFixture();

    await guard.setPolicy(agent.address, fiveUsdc, false);
    await expect(guard.connect(agent).spend(provider.address, 1, ethers.id("inactive")))
      .to.be.revertedWithCustomError(guard, "PolicyInactive");

    await guard.setPolicy(agent.address, fiveUsdc, true);
    await guard.pause();
    await expect(guard.connect(agent).spend(provider.address, 1, ethers.id("paused")))
      .to.be.revertedWithCustomError(guard, "EnforcedPause");
  });
});
