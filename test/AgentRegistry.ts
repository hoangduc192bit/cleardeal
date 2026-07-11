import { expect } from "chai";
import hre from "hardhat";

const ethers = (hre as unknown as { ethers: typeof import("ethers") }).ethers;

describe("AgentRegistry", function () {
  it("registers providers permissionlessly and paginates results", async function () {
    const [, provider] = await ethers.getSigners();
    const registry = await ethers.deployContract("AgentRegistry");

    await expect(registry.connect(provider).registerAgent("Pulse", "price", "Live prices", 100))
      .to.emit(registry, "AgentRegistered")
      .withArgs(0, provider.address, "Pulse");

    const agents = await registry.getAgents(0, 10);
    expect(agents).to.have.length(1);
    expect(agents[0].wallet).to.equal(provider.address);
  });

  it("restricts moderation to the owner", async function () {
    const [, provider] = await ethers.getSigners();
    const registry = await ethers.deployContract("AgentRegistry");
    await registry.connect(provider).registerAgent("Pulse", "price", "Live prices", 100);

    await expect(registry.connect(provider).deactivateAgent(0))
      .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    await registry.deactivateAgent(0);
    expect((await registry.getAgent(0)).isActive).to.equal(false);
  });
});
