import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

describe("StreamPayment", function () {
  async function deployFixture() {
    const [owner, subscriber, provider] = await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const stream = await ethers.deployContract("StreamPayment", [await usdc.getAddress()]);
    const deposit = ethers.parseUnits("10", 6);
    const rate = ethers.parseUnits("1", 6);

    await usdc.mint(subscriber.address, deposit);
    await usdc.connect(subscriber).approve(await stream.getAddress(), deposit);

    return { owner, subscriber, provider, usdc, stream, deposit, rate };
  }

  it("escrows, settles elapsed usage, and refunds the remainder", async function () {
    const { subscriber, provider, usdc, stream, deposit, rate } = await deployFixture();
    await stream.connect(subscriber).startStream(provider.address, rate, deposit);
    const subscription = await stream.subscriptions(
      ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [subscriber.address, provider.address],
      )),
    );

    await time.setNextBlockTimestamp(subscription.startTime + 3n);
    await expect(stream.connect(subscriber).stopStream(provider.address))
      .to.emit(stream, "StreamStopped")
      .withArgs(subscriber.address, provider.address, rate * 3n, deposit - rate * 3n);

    expect(await usdc.balanceOf(provider.address)).to.equal(rate * 3n);
    expect(await usdc.balanceOf(subscriber.address)).to.equal(deposit - rate * 3n);
  });

  it("caps provider settlement at the deposited amount", async function () {
    const { subscriber, provider, usdc, stream, deposit, rate } = await deployFixture();
    await stream.connect(subscriber).startStream(provider.address, rate, deposit);
    await time.increase(20);
    await stream.connect(subscriber).stopStream(provider.address);

    expect(await usdc.balanceOf(provider.address)).to.equal(deposit);
    expect(await usdc.balanceOf(subscriber.address)).to.equal(0);
  });

  it("prevents duplicate active streams and protects USDC escrow from rescue", async function () {
    const { subscriber, provider, stream, deposit, rate, usdc } = await deployFixture();
    await stream.connect(subscriber).startStream(provider.address, rate, deposit);

    await expect(stream.connect(subscriber).startStream(provider.address, rate, deposit))
      .to.be.revertedWithCustomError(stream, "AlreadySubscribed");
    await expect(stream.rescueTokens(await usdc.getAddress(), 1))
      .to.be.revertedWith("Cannot rescue payment token");
  });
});
