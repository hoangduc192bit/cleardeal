import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;
const USDC = 1_000_000n;

describe("ClearDealClearingHouse security invariants", function () {
  this.timeout(120_000);

  it("conserves USDC and clears every deterministic ring without residual custody", async function () {
    for (let seed = 1; seed <= 8; seed += 1) {
      const signers = await ethers.getSigners();
      const participantCount = 2 + (seed % 4);
      const participants = signers.slice(0, participantCount);
      const verifiers = signers.slice(6, 9);
      const arbitrator = signers[9];
      const usdc = await ethers.deployContract("MockUSDC");
      const clearing = await ethers.deployContract("ClearDealClearingHouse", [
        await usdc.getAddress(),
      ]);
      const clearingAddress = await clearing.getAddress();
      const now = await time.latest();
      const evidenceDeadline = now + 7 * 24 * 60 * 60;
      const fundingDeadline = now + 14 * 24 * 60 * 60;
      const obligations = participants.map((payer, index) => ({
        payer: payer.address,
        provider: participants[(index + 1) % participantCount].address,
        amount: BigInt(seed * 37 + index * 17 + 1) * USDC,
        bondAmount: BigInt(((seed + index) % 9) + 1) * USDC,
        specHash: ethers.id(`ring-${seed}-${index}`),
      }));

      await clearing.connect(participants[0]).createCycle(
        {
          arbitrator: arbitrator.address,
          metadataHash: ethers.id(`cycle-${seed}`),
          evidenceDeadline,
          fundingDeadline,
          verifierThreshold: 2,
        },
        participants.map((participant) => participant.address),
        verifiers.map((verifier) => verifier.address),
        obligations
      );

      const initialBalance = 100_000n * USDC;
      for (const participant of participants) {
        await usdc.mint(participant.address, initialBalance);
      }

      let totalBonds = 0n;
      let gross = 0n;
      for (let index = 0; index < obligations.length; index += 1) {
        const obligation = obligations[index];
        const provider = participants[(index + 1) % participantCount];
        totalBonds += obligation.bondAmount;
        gross += obligation.amount;
        await usdc
          .connect(provider)
          .approve(clearingAddress, obligation.bondAmount);
        await clearing.connect(provider).postBond(0, index);
        await clearing
          .connect(provider)
          .submitEvidence(0, index, ethers.id(`evidence-${seed}-${index}`));
        await clearing.connect(verifiers[0]).castVote(0, index, true);
        await clearing.connect(verifiers[1]).castVote(0, index, true);
      }

      await clearing.closeCycle(0);
      const positions = await Promise.all(
        participants.map((participant) =>
          clearing.netPositions(0, participant.address)
        )
      );
      const positionSum = positions.reduce(
        (sum, position) => sum + position,
        0n
      );
      const totalNetDebit = positions.reduce(
        (sum, position) => sum + (position < 0n ? -position : 0n),
        0n
      );
      const cycle = await clearing.cycles(0);

      expect(positionSum, `seed ${seed}: net positions`).to.equal(0n);
      expect(cycle.clearedGross, `seed ${seed}: cleared gross`).to.equal(gross);
      expect(cycle.totalNetDebit, `seed ${seed}: total net debit`).to.equal(
        totalNetDebit
      );
      expect(
        totalNetDebit <= gross,
        `seed ${seed}: net debit cannot exceed gross`
      ).to.equal(true);
      expect(
        await usdc.balanceOf(clearingAddress),
        `seed ${seed}: bonds before funding`
      ).to.equal(totalBonds);

      for (let index = 0; index < participants.length; index += 1) {
        if (positions[index] >= 0n) continue;
        const amount = -positions[index];
        await usdc
          .connect(participants[index])
          .approve(clearingAddress, amount);
        await clearing.connect(participants[index]).fundNetPosition(0);
      }

      expect(
        await usdc.balanceOf(clearingAddress),
        `seed ${seed}: funded custody`
      ).to.equal(totalBonds + totalNetDebit);
      await clearing.settleCycle(0);
      expect((await clearing.cycles(0)).status).to.equal(2);
      expect(
        await usdc.balanceOf(clearingAddress),
        `seed ${seed}: residual contract balance`
      ).to.equal(0n);

      const finalParticipantSupply = (
        await Promise.all(
          participants.map((participant) => usdc.balanceOf(participant.address))
        )
      ).reduce((sum, balance) => sum + balance, 0n);
      expect(
        finalParticipantSupply,
        `seed ${seed}: participant USDC conservation`
      ).to.equal(initialBalance * BigInt(participantCount));
      await expect(clearing.settleCycle(0)).to.be.revertedWithCustomError(
        clearing,
        "InvalidState"
      );
    }
  });

  it("refunds every funded debit and leaves no custody when another debtor defaults", async function () {
    const [alice, bob, provider, verifierOne, verifierTwo, arbitrator] =
      await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const clearing = await ethers.deployContract("ClearDealClearingHouse", [
      await usdc.getAddress(),
    ]);
    const clearingAddress = await clearing.getAddress();
    const now = await time.latest();
    const evidenceDeadline = now + 7 * 24 * 60 * 60;
    const fundingDeadline = now + 14 * 24 * 60 * 60;
    const obligations = [
      {
        payer: alice.address,
        provider: provider.address,
        amount: 100n * USDC,
        bondAmount: 10n * USDC,
        specHash: ethers.id("alice-provider"),
      },
      {
        payer: bob.address,
        provider: provider.address,
        amount: 50n * USDC,
        bondAmount: 5n * USDC,
        specHash: ethers.id("bob-provider"),
      },
    ];

    await clearing.connect(alice).createCycle(
      {
        arbitrator: arbitrator.address,
        metadataHash: ethers.id("partial-default"),
        evidenceDeadline,
        fundingDeadline,
        verifierThreshold: 2,
      },
      [alice.address, bob.address, provider.address],
      [verifierOne.address, verifierTwo.address],
      obligations
    );
    for (const participant of [alice, bob, provider]) {
      await usdc.mint(participant.address, 1_000n * USDC);
    }

    for (let index = 0; index < obligations.length; index += 1) {
      await usdc
        .connect(provider)
        .approve(clearingAddress, obligations[index].bondAmount);
      await clearing.connect(provider).postBond(0, index);
      await clearing
        .connect(provider)
        .submitEvidence(0, index, ethers.id(`default-evidence-${index}`));
      await clearing.connect(verifierOne).castVote(0, index, true);
      await clearing.connect(verifierTwo).castVote(0, index, true);
    }
    await clearing.closeCycle(0);

    const aliceBeforeFunding = await usdc.balanceOf(alice.address);
    await usdc.connect(alice).approve(clearingAddress, 100n * USDC);
    await clearing.connect(alice).fundNetPosition(0);
    expect(await usdc.balanceOf(alice.address)).to.equal(
      aliceBeforeFunding - 100n * USDC
    );

    await time.increaseTo(fundingDeadline + 1);
    await clearing.defaultCycle(0);

    expect(await usdc.balanceOf(alice.address)).to.equal(aliceBeforeFunding);
    expect(await usdc.balanceOf(clearingAddress)).to.equal(0n);
    expect(
      (await clearing.riskPassports(alice.address)).defaultedCycles
    ).to.equal(0n);
    expect(
      (await clearing.riskPassports(bob.address)).defaultedCycles
    ).to.equal(1n);
    expect((await clearing.cycles(0)).status).to.equal(3);
    await expect(
      clearing.connect(bob).fundNetPosition(0)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
  });

  it("cannot close unresolved work early and deterministically slashes it after timeout", async function () {
    const [payer, provider, verifier, arbitrator] = await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const clearing = await ethers.deployContract("ClearDealClearingHouse", [
      await usdc.getAddress(),
    ]);
    const clearingAddress = await clearing.getAddress();
    const now = await time.latest();
    const evidenceDeadline = now + 7 * 24 * 60 * 60;
    const fundingDeadline = now + 14 * 24 * 60 * 60;
    const bond = 10n * USDC;

    await clearing.connect(payer).createCycle(
      {
        arbitrator: arbitrator.address,
        metadataHash: ethers.id("timeout"),
        evidenceDeadline,
        fundingDeadline,
        verifierThreshold: 1,
      },
      [payer.address, provider.address],
      [verifier.address],
      [
        {
          payer: payer.address,
          provider: provider.address,
          amount: 100n * USDC,
          bondAmount: bond,
          specHash: ethers.id("timeout-obligation"),
        },
      ]
    );
    await usdc.mint(provider.address, bond);
    await usdc.connect(provider).approve(clearingAddress, bond);
    await clearing.connect(provider).postBond(0, 0);
    await clearing
      .connect(provider)
      .submitEvidence(0, 0, ethers.id("unreviewed-evidence"));

    await expect(clearing.closeCycle(0)).to.be.revertedWithCustomError(
      clearing,
      "InvalidDeadline"
    );
    await time.increaseTo(evidenceDeadline + 1);
    const payerBefore = await usdc.balanceOf(payer.address);
    await clearing.closeCycle(0);

    expect(await usdc.balanceOf(payer.address)).to.equal(payerBefore + bond);
    expect(await usdc.balanceOf(clearingAddress)).to.equal(0n);
    expect((await clearing.obligations(0, 0)).status).to.equal(4);
    expect((await clearing.cycles(0)).status).to.equal(2);
    expect(
      (await clearing.riskPassports(provider.address)).slashedBond
    ).to.equal(bond);
  });
});
