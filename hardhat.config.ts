import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";

import type { HardhatUserConfig } from "hardhat/config";

const accounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    arcTestnet: {
      url: "https://rpc.testnet.arc.network",
      accounts,
      chainId: 5_042_002,
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: "placeholder", // Arc Testnet may not require real API key
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 5_042_002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app",
        },
      },
    ],
  },
  sourcify: {
    enabled: false, // Arc Testnet not on Sourcify
  },
};

export default config;
