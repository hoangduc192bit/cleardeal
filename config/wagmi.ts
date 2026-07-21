import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

import { arcTestnet } from "@/config/chain";

const arcRpcUrl = arcTestnet.rpcUrls.default.http[0];

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
export const isWalletConnectConfigured = Boolean(walletConnectProjectId);

function createWagmiConfig() {
  const connectors = [
    injected(),
    ...(walletConnectProjectId ? [walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: {
        name: "ClearDeal",
        description: "Clearing and assurance for autonomous commerce on Arc Testnet",
        url: process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://cleardeal-app.vercel.app",
        icons: [`${process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://cleardeal-app.vercel.app"}/logo-192.png`],
      },
    })] : []),
  ];

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
