import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;
const USDC = 1_000_000n;

describe("ClearDealClearingHouse boundary guards", function () {
  async function baseInputs() {
    const [
      alice,
      bob,
      carol,
      verifierOne,
      verifierTwo,
      verifierThree,
      arbitrator,
      outsider,
    ] = await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const clearing = await ethers.deployContract("ClearDealClearingHouse", [
      await usdc.getAddress(),
    ]);
    const now = await time.latest();
    const params = {
      arbitrator: arbitrator.address,
      metadataHash: ethers.id("boundary-cycle"),
      evidenceDeadline: now + 7 * 24 * 60 * 60,
      fundingDeadline: now + 14 * 24 * 60 * 60,
      verifierThreshold: 2,
    };
    const participants = [alice.address, bob.address, carol.address];
    const verifiers = [
      verifierOne.address,
      verifierTwo.address,
      verifierThree.address,
    ];
    const obligations = [
      {
        payer: alice.address,
        provider: bob.address,
        amount: 100n * USDC,
        bondAmount: 10n * USDC,
        specHash: ethers.id("boundary-obligation"),
      },
    ];

    return {
      alice,
      bob,
      carol,
      verifierOne,
      verifierTwo,
      verifierThree,
      arbitrator,
      outsider,
      usdc,
      clearing,
      params,
      participants,
      verifiers,
      obligations,
    };
  }

  it("rejects invalid constructor, array, role, deadline, amount, and hash inputs", async function () {
    const fixture = await baseInputs();
    const {
      alice,
      bob,
      carol,
      arbitrator,
      outsider,
      clearing,
      params,
      participants,
      verifiers,
      obligations,
    } = fixture;
    const factory = await ethers.getContractFactory("ClearDealClearingHouse");
    await expect(
      factory.deploy(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(factory, "InvalidAddress");

    const create = (
      nextParams = params,
      nextParticipants = participants,
      nextVerifiers = verifiers,
      nextObligations = obligations
    ) =>
      clearing
        .connect(alice)
        .createCycle(
          nextParams,
          nextParticipants,
          nextVerifiers,
          nextObligations
        );

    await expect(
      create(params, [alice.address], verifiers, obligations)
    ).to.be.revertedWithCustomError(clearing, "InvalidArrayLength");
    await expect(
      create(
        params,
        Array.from({ length: 21 }, () => ethers.Wallet.createRandom().address),
        verifiers,
        obligations
      )
    ).to.be.revertedWithCustomError(clearing, "InvalidArrayLength");
    await expect(
      create(params, participants, [], obligations)
    ).to.be.revertedWithCustomError(clearing, "InvalidArrayLength");
    await expect(
      create(
        params,
        participants,
        Array.from({ length: 11 }, () => ethers.Wallet.createRandom().address),
        obligations
      )
    ).to.be.revertedWithCustomError(clearing, "InvalidArrayLength");
    await expect(
      create(params, participants, verifiers, [])
    ).to.be.revertedWithCustomError(clearing, "InvalidArrayLength");
    await expect(
      create(
        params,
        participants,
        verifiers,
        Array.from({ length: 21 }, () => obligations[0])
      )
    ).to.be.revertedWithCustomError(clearing, "InvalidArrayLength");

    await expect(
      create({ ...params, arbitrator: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create({ ...params, metadataHash: ethers.ZeroHash })
    ).to.be.revertedWithCustomError(clearing, "InvalidHash");
    await expect(
      create({ ...params, evidenceDeadline: (await time.latest()) - 1 })
    ).to.be.revertedWithCustomError(clearing, "InvalidDeadline");
    await expect(
      create({ ...params, fundingDeadline: params.evidenceDeadline })
    ).to.be.revertedWithCustomError(clearing, "InvalidDeadline");
    await expect(
      create({ ...params, verifierThreshold: 0 })
    ).to.be.revertedWithCustomError(clearing, "InvalidAmount");
    await expect(
      create({ ...params, verifierThreshold: 4 })
    ).to.be.revertedWithCustomError(clearing, "InvalidAmount");

    await expect(
      create(
        params,
        [alice.address, ethers.ZeroAddress],
        verifiers,
        obligations
      )
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create(
        params,
        [alice.address, arbitrator.address],
        verifiers,
        obligations
      )
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create(
        params,
        [alice.address, bob.address, bob.address],
        verifiers,
        obligations
      )
    ).to.be.revertedWithCustomError(clearing, "DuplicateAddress");
    await expect(
      create(params, [bob.address, carol.address], verifiers, [
        {
          ...obligations[0],
          payer: bob.address,
          provider: carol.address,
        },
      ])
    ).to.be.revertedWithCustomError(clearing, "Unauthorized");

    const singleVerifierParams = { ...params, verifierThreshold: 1 };
    await expect(
      create(
        singleVerifierParams,
        participants,
        [ethers.ZeroAddress],
        obligations
      )
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create(
        singleVerifierParams,
        participants,
        [arbitrator.address],
        obligations
      )
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create(singleVerifierParams, participants, [bob.address], obligations)
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create(params, participants, [verifiers[0], verifiers[0]], obligations)
    ).to.be.revertedWithCustomError(clearing, "DuplicateAddress");

    await expect(
      create(params, participants, verifiers, [
        { ...obligations[0], provider: alice.address },
      ])
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create(params, participants, verifiers, [
        { ...obligations[0], payer: outsider.address },
      ])
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create(params, participants, verifiers, [
        { ...obligations[0], provider: outsider.address },
      ])
    ).to.be.revertedWithCustomError(clearing, "InvalidAddress");
    await expect(
      create(params, participants, verifiers, [
        { ...obligations[0], amount: 0n },
      ])
    ).to.be.revertedWithCustomError(clearing, "InvalidAmount");
    await expect(
      create(params, participants, verifiers, [
        { ...obligations[0], bondAmount: 0n },
      ])
    ).to.be.revertedWithCustomError(clearing, "InvalidAmount");
    await expect(
      create(params, participants, verifiers, [
        { ...obligations[0], specHash: ethers.ZeroHash },
      ])
    ).to.be.revertedWithCustomError(clearing, "InvalidHash");
  });

  it("enforces runtime permissions, one-way states, funding completeness, and deadlines", async function () {
    const fixture = await baseInputs();
    const {
      alice,
      bob,
      verifierOne,
      verifierTwo,
      arbitrator,
      outsider,
      usdc,
      clearing,
      params,
      participants,
      verifiers,
      obligations,
    } = fixture;
    const clearingAddress = await clearing.getAddress();

    await clearing
      .connect(alice)
      .createCycle(params, participants, verifiers, obligations);
    expect(await clearing.getCycleIds(alice.address, 0, 1)).to.deep.equal([0n]);
    expect(await clearing.getCycleIds(alice.address, 1, 1)).to.deep.equal([]);
    expect(await clearing.getCycleIds(alice.address, 0, 0)).to.deep.equal([]);
    expect(await clearing.getParticipants(0)).to.deep.equal(participants);
    expect(await clearing.getVerifiers(0)).to.deep.equal(verifiers);

    await usdc.mint(alice.address, 1_000n * USDC);
    await usdc.mint(bob.address, 1_000n * USDC);
    await expect(
      clearing.connect(outsider).postBond(0, 0)
    ).to.be.revertedWithCustomError(clearing, "Unauthorized");
    await expect(
      clearing.connect(bob).submitEvidence(0, 0, ethers.id("too-early"))
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await expect(
      clearing.connect(verifierOne).castVote(0, 0, true)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await expect(
      clearing.connect(arbitrator).resolveObligation(0, 0, true)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await expect(
      clearing.connect(bob).postBond(0, 1)
    ).to.be.revertedWithCustomError(clearing, "InvalidArrayLength");

    await usdc.connect(bob).approve(clearingAddress, obligations[0].bondAmount);
    await clearing.connect(bob).postBond(0, 0);
    await expect(
      clearing.connect(bob).postBond(0, 0)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await expect(
      clearing.connect(outsider).submitEvidence(0, 0, ethers.id("unauthorized"))
    ).to.be.revertedWithCustomError(clearing, "Unauthorized");
    await expect(
      clearing.connect(bob).submitEvidence(0, 0, ethers.ZeroHash)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await clearing
      .connect(bob)
      .submitEvidence(0, 0, ethers.id("valid-evidence"));
    await expect(
      clearing.connect(bob).postBond(0, 0)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await expect(
      clearing.connect(outsider).resolveObligation(0, 0, true)
    ).to.be.revertedWithCustomError(clearing, "Unauthorized");

    await clearing.connect(verifierOne).castVote(0, 0, true);
    await clearing.connect(verifierTwo).castVote(0, 0, true);
    await expect(
      clearing.connect(arbitrator).resolveObligation(0, 0, true)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await clearing.closeCycle(0);
    await expect(clearing.closeCycle(0)).to.be.revertedWithCustomError(
      clearing,
      "InvalidState"
    );
    await expect(
      clearing.connect(bob).fundNetPosition(0)
    ).to.be.revertedWithCustomError(clearing, "NothingToFund");
    await expect(clearing.settleCycle(0)).to.be.revertedWithCustomError(
      clearing,
      "FundingIncomplete"
    );
    await expect(clearing.defaultCycle(0)).to.be.revertedWithCustomError(
      clearing,
      "InvalidDeadline"
    );

    await usdc.connect(alice).approve(clearingAddress, obligations[0].amount);
    await clearing.connect(alice).fundNetPosition(0);
    await expect(
      clearing.connect(alice).fundNetPosition(0)
    ).to.be.revertedWithCustomError(clearing, "NothingToFund");
    await time.increaseTo(params.fundingDeadline + 1);
    await expect(clearing.defaultCycle(0)).to.be.revertedWithCustomError(
      clearing,
      "InvalidState"
    );
    await clearing.settleCycle(0);

    const nextNow = await time.latest();
    const nextEvidenceDeadline = nextNow + 7 * 24 * 60 * 60;
    const nextFundingDeadline = nextNow + 14 * 24 * 60 * 60;
    const timeoutObligations = Array.from({ length: 3 }, (_, index) => ({
      payer: alice.address,
      provider: bob.address,
      amount: BigInt(index + 1) * USDC,
      bondAmount: USDC,
      specHash: ethers.id(`timeout-${index}`),
    }));
    await clearing.connect(alice).createCycle(
      {
        arbitrator: arbitrator.address,
        metadataHash: ethers.id("runtime-timeout"),
        evidenceDeadline: nextEvidenceDeadline,
        fundingDeadline: nextFundingDeadline,
        verifierThreshold: 2,
      },
      participants,
      verifiers,
      timeoutObligations
    );
    await usdc.connect(bob).approve(clearingAddress, 2n * USDC);
    await clearing.connect(bob).postBond(1, 1);
    await clearing.connect(bob).postBond(1, 2);
    await clearing
      .connect(bob)
      .submitEvidence(1, 2, ethers.id("submitted-before-timeout"));
    await time.increaseTo(nextEvidenceDeadline + 1);

    await expect(
      clearing.connect(bob).postBond(1, 0)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await expect(
      clearing.connect(bob).submitEvidence(1, 1, ethers.id("late-evidence"))
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await expect(
      clearing.connect(verifierOne).castVote(1, 2, true)
    ).to.be.revertedWithCustomError(clearing, "InvalidState");
    await clearing.closeCycle(1);
    expect((await clearing.cycles(1)).status).to.equal(2);
    expect(await usdc.balanceOf(clearingAddress)).to.equal(0n);
    expect(
      (await clearing.riskPassports(bob.address)).failedObligations
    ).to.equal(3n);
  });
});
