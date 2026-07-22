import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

import { arcTestnet } from "@/config/chain";
import { circlePasskeyConnector } from "@/config/circle-passkey-connector";

const arcRpcUrl = arcTestnet.rpcUrls.default.http[0];

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
export const isWalletConnectConfigured = Boolean(walletConnectProjectId);
const circleModularClientKey = process.env.NEXT_PUBLIC_CIRCLE_MODULAR_CLIENT_KEY?.trim();
const circleModularClientUrl = process.env.NEXT_PUBLIC_CIRCLE_MODULAR_CLIENT_URL?.trim();
export const isCirclePasskeyConfigured = Boolean(
  circleModularClientKey && circleModularClientUrl,
);

function createWagmiConfig() {
  const connectors = [
    ...(circleModularClientKey && circleModularClientUrl
      ? [
          circlePasskeyConnector({
            clientKey: circleModularClientKey,
            clientUrl: circleModularClientUrl,
            mode: "register",
          }),
          circlePasskeyConnector({
            clientKey: circleModularClientKey,
            clientUrl: circleModularClientUrl,
            mode: "login",
          }),
        ]
      : []),
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
