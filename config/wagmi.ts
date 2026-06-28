import { createConfig, http, injected } from "wagmi";

import { arcTestnet } from "@/config/chain";

const arcRpcUrl = arcTestnet.rpcUrls.default.http[0];

export const isWalletConnectConfigured = false;

function createWagmiConfig() {
  const connectors = [injected()];

  return createConfig({
    chains: [arcTestnet],
    connectors,
    transports: {
      [arcTestnet.id]: http(arcRpcUrl),
    },
    ssr: true,
  });
}

export const wagmiConfig = createWagmiConfig();
