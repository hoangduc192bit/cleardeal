import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import hre from "hardhat";

const ethers = hre.ethers;

const EXPLORER_URL = "https://testnet.arcscan.app";

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress) {
    throw new Error("USDC_ADDRESS is required");
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const deployerBalance = await ethers.provider.getBalance(deployerAddress);
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
  if (!gasPrice) {
    throw new Error("Unable to determine Arc Testnet gas price");
  }

  const registryFactory = await ethers.getContractFactory("AgentRegistry");
  const streamPaymentFactory = await ethers.getContractFactory("StreamPayment");
  const registryRequest = await registryFactory.getDeployTransaction();
  const streamPaymentRequest = await streamPaymentFactory.getDeployTransaction(
    usdcAddress,
  );
  const estimatedGas =
    (await deployer.estimateGas(registryRequest)) +
    (await deployer.estimateGas(streamPaymentRequest));
  const requiredBalance = (estimatedGas * gasPrice * 120n) / 100n;

  if (deployerBalance < requiredBalance) {
    throw new Error(
      `Insufficient Arc Testnet USDC for gas. Required with safety margin: ${ethers.formatEther(requiredBalance)} USDC; balance: ${ethers.formatEther(deployerBalance)} USDC`,
    );
  }

  const registry = await registryFactory.deploy();
  await registry.waitForDeployment();
  const registryTx = registry.deploymentTransaction();
  if (!registryTx) {
    throw new Error("AgentRegistry deployment transaction unavailable");
  }

  const streamPayment = await streamPaymentFactory.deploy(usdcAddress);
  await streamPayment.waitForDeployment();
  const streamPaymentTx = streamPayment.deploymentTransaction();
  if (!streamPaymentTx) {
    throw new Error("StreamPayment deployment transaction unavailable");
  }

  const deployment = {
    network: "arcTestnet",
    chainId: 5_042_002,
    rpcUrl: "https://rpc.testnet.arc.network",
    explorerUrl: EXPLORER_URL,
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      AgentRegistry: {
        address: await registry.getAddress(),
        transactionHash: registryTx.hash,
        explorerLink: `${EXPLORER_URL}/tx/${registryTx.hash}`,
        constructorArgs: [],
      },
      StreamPayment: {
        address: await streamPayment.getAddress(),
        transactionHash: streamPaymentTx.hash,
        explorerLink: `${EXPLORER_URL}/tx/${streamPaymentTx.hash}`,
        constructorArgs: [usdcAddress],
      },
    },
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  await mkdir(deploymentsDir, { recursive: true });
  await writeFile(
    path.join(deploymentsDir, "arcTestnet.json"),
    `${JSON.stringify(deployment, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
