import { createConnector } from "wagmi";
import {
  getAddress,
  numberToHex,
  type Address,
  type EIP1193RequestFn,
} from "viem";

import { arcTestnet } from "@/config/chain";

type CirclePasskeyMode = "login" | "register";

type CircleEip1193Provider = {
  request: EIP1193RequestFn;
};

type CirclePasskeyConnectorOptions = {
  clientKey: string;
  clientUrl: string;
  mode: CirclePasskeyMode;
};

function registrationUsername() {
  const storageKey = "cleardeal.circle-passkey-user";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const username = `cleardeal-${window.crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, username);
  return username;
}

export function circlePasskeyConnector({
  clientKey,
  clientUrl,
  mode,
}: CirclePasskeyConnectorOptions) {
  return createConnector((config) => {
    let provider: CircleEip1193Provider | undefined;
    let connected = false;

    async function createProvider() {
      const circle = await import("@circle-fin/modular-wallets-core");
      const { createPublicClient } = await import("viem");
      const { createBundlerClient, toWebAuthnAccount } = await import(
        "viem/account-abstraction"
      );

      const baseUrl = clientUrl.replace(/\/$/, "");
      const modularTransport = circle.toModularTransport(
        `${baseUrl}/arcTestnet`,
        clientKey,
      );
      const passkeyTransport = circle.toPasskeyTransport(baseUrl, clientKey);
      const publicClient = createPublicClient({
        chain: arcTestnet,
        // Circle currently bundles an older compatible viem minor. Keep the
        // unavoidable type-version boundary isolated to SDK construction.
        transport: modularTransport as never,
      });
      const credential = await circle.toWebAuthnCredential({
        mode:
          mode === "register"
            ? circle.WebAuthnMode.Register
            : circle.WebAuthnMode.Login,
        transport: passkeyTransport,
        ...(mode === "register"
          ? { username: registrationUsername() }
          : {}),
      });
      const account = await circle.toCircleSmartAccount({
        client: publicClient as never,
        name: "ClearDeal account",
        owner: toWebAuthnAccount({
          credential: credential as never,
          rpId: credential.rpId,
        }) as never,
      });
      const bundlerClient = createBundlerClient({
        account: account as never,
        chain: arcTestnet,
        client: publicClient,
        paymaster: true,
        transport: modularTransport as never,
      });
      const circleProvider = new circle.EIP1193Provider(
        bundlerClient as never,
        publicClient as never,
      );
      const circleAccountAddress = await account.getAddress();

      // modular-wallets-core@1.0.14 loses the provider's `this` binding inside
      // asEIP1193Provider(), which makes requests fail while reading
      // `bundlerClient`. Keep the class method bound and unwrap its JSON-RPC
      // response here instead.
      return {
        request: async (args) => {
          const request = args as {
            method: string;
            params?: readonly unknown[];
          };
          let circleRequest = request;

          // Circle 1.0.14 compares signing addresses case-sensitively. Wagmi
          // supplies a checksummed address, while the smart account may retain
          // the same address in lowercase. Verify them canonically, then pass
          // Circle its original representation.
          if (request.method === "personal_sign" && request.params) {
            const [challenge, requestedAddress] = request.params;
            if (
              typeof requestedAddress !== "string" ||
              getAddress(requestedAddress) !== getAddress(circleAccountAddress)
            ) {
              throw new Error("Invalid Circle passkey account.");
            }
            circleRequest = {
              ...request,
              params: [challenge, circleAccountAddress],
            };
          } else if (
            request.method === "eth_signTypedData_v4" &&
            request.params
          ) {
            const [requestedAddress, typedData] = request.params;
            if (
              typeof requestedAddress !== "string" ||
              getAddress(requestedAddress) !== getAddress(circleAccountAddress)
            ) {
              throw new Error("Invalid Circle passkey account.");
            }
            circleRequest = {
              ...request,
              params: [circleAccountAddress, typedData],
            };
          }

          const response = await circleProvider.request(circleRequest as never);
          return response.result as never;
        },
      } as CircleEip1193Provider;
    }

    async function getProvider() {
      provider ??= await createProvider();
      return provider;
    }

    return {
      id: mode === "register" ? "circle-passkey-create" : "circle-passkey-login",
      name:
        mode === "register"
          ? "Create passkey account"
          : "Use existing passkey",
      type: "circle-passkey",
      async connect<withCapabilities extends boolean = false>(
        { chainId, withCapabilities }: {
          chainId?: number;
          isReconnecting?: boolean;
          withCapabilities?: withCapabilities | boolean;
        } = {},
      ) {
        if (chainId && chainId !== arcTestnet.id) {
          throw new Error("Circle passkey accounts are available on Arc Testnet only.");
        }
        const activeProvider = await getProvider();
        const accounts = (await activeProvider.request({
          method: "eth_requestAccounts",
        })) as Address[];
        const normalizedAccounts = accounts.map((account) => getAddress(account));
        connected = true;
        return {
          accounts: (withCapabilities
              ? normalizedAccounts.map((address) => ({
                  address,
                  capabilities: {},
                }))
              : normalizedAccounts) as unknown as withCapabilities extends true
                ? readonly { address: Address; capabilities: Record<string, unknown> }[]
                : readonly Address[],
          chainId: arcTestnet.id,
        };
      },
      async disconnect() {
        connected = false;
        provider = undefined;
      },
      async getAccounts() {
        if (!connected || !provider) return [];
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as Address[];
        return accounts.map((account) => getAddress(account));
      },
      async getChainId() {
        return arcTestnet.id;
      },
      async getProvider() {
        return getProvider();
      },
      async isAuthorized() {
        // Never trigger a WebAuthn prompt during hydration or background reconnect.
        return connected && Boolean(provider);
      },
      async switchChain({ chainId }) {
        const chain = config.chains.find((item) => item.id === chainId);
        if (!chain || chainId !== arcTestnet.id) {
          throw new Error("ClearDeal passkey accounts support Arc Testnet only.");
        }
        config.emitter.emit("change", { chainId });
        return chain;
      },
      onAccountsChanged(accounts) {
        config.emitter.emit("change", {
          accounts: accounts.map((account) => getAddress(account)),
        });
      },
      onChainChanged(chainId) {
        config.emitter.emit("change", { chainId: Number(chainId) });
      },
      onDisconnect() {
        connected = false;
        provider = undefined;
        config.emitter.emit("disconnect");
      },
      icon: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#2563eb"/><path d="M8 11.5a4 4 0 1 1 7.8 1.2L18 15v2h-2v2h-3v-3.2l-1.5-1.5A4 4 0 0 1 8 11.5Zm4-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" fill="white"/></svg>`,
      )}`,
      rdns: "com.circle.cleardeal.passkey",
    };
  });
}
