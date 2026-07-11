"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Wallet, Loader2 } from "lucide-react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import { arcTestnet } from "@/config/chain";
import { isWalletConnectConfigured } from "@/config/wagmi";

function shortAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function walletLabel(name: string) {
  if (name.toLowerCase().includes("walletconnect")) return "WalletConnect";
  if (name.toLowerCase().includes("injected")) return "Browser Wallet";
  return name;
}

interface GoogleUser {
  email: string;
  name: string;
  avatar: string;
  walletAddress: `0x${string}`;
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);
  
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [showGoogleLogin, setShowGoogleLogin] = useState(false);
  const [signingIn, setSigningIn] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("arcstream_google_user");
    if (saved) {
      try {
        setGoogleUser(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    const maybeEthereum = (window as Window & { ethereum?: unknown }).ethereum;
    setHasInjectedWallet(Boolean(maybeEthereum));
  }, []);

  const availableConnectors = useMemo(
    () =>
      connectors.filter((connector, index, list) => {
        const label = walletLabel(connector.name);
        return (
          list.findIndex((item) => walletLabel(item.name) === label) === index
        );
      }),
    [connectors],
  );

  const handleGoogleSignIn = (email: string, name: string) => {
    setSigningIn(email);
    setTimeout(() => {
      const user: GoogleUser = {
        email,
        name,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
        walletAddress: "0x17cb8319a2da388c1681dbf4bb19684cf8929e06",
      };
      localStorage.setItem("arcstream_google_user", JSON.stringify(user));
      setGoogleUser(user);
      setSigningIn(null);
      setShowGoogleLogin(false);
      setOpen(false);
      window.dispatchEvent(new Event("googleUserChanged"));
    }, 1000);
  };

  const handleSignOut = () => {
    localStorage.removeItem("arcstream_google_user");
    setGoogleUser(null);
    window.dispatchEvent(new Event("googleUserChanged"));
  };

  if (googleUser) {
    return (
      <div className="flex items-center gap-2">
        <button
          className="flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 px-3 text-[13px] font-semibold text-blue-700 transition-all hover:bg-blue-50 hover:border-blue-300"
          onClick={handleSignOut}
          title="Sign out of Google"
          type="button"
        >
          <img src={googleUser.avatar} className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200" alt="Avatar" />
          <div className="flex flex-col items-start leading-none text-left">
            <span className="text-[11px] font-bold text-neutral-800">{googleUser.name}</span>
            <span className="text-[9px] text-neutral-400 font-mono">{shortAddress(googleUser.walletAddress)}</span>
          </div>
        </button>
      </div>
    );
  }

  if (isConnected && address) {
    const wrongNetwork = chainId !== arcTestnet.id;

    return (
      <div className="flex items-center gap-2">
        {wrongNetwork && (
          <button
            className="h-9 rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-[13px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: arcTestnet.id })}
            type="button"
          >
            {isSwitching ? "Switching..." : "Switch to Arc"}
          </button>
        )}
        <button
          className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          onClick={() => disconnect()}
          type="button"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {shortAddress(address)}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex h-9 items-center gap-1.5 rounded-xl bg-[#0084FF] px-4 text-[13px] font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-[#006EE6] hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        disabled={isPending}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Wallet className="h-3.5 w-3.5" />
        {isPending ? "Connecting..." : "Connect Wallet"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl shadow-black/10">
          <div className="px-2 pb-3">
            <div className="text-[14px] font-bold text-neutral-900">
              Choose login method
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
              Select Google Social sign-in or connect your MetaMask Web3 wallet.
            </p>
          </div>

          <div className="space-y-1.5">
            <button
              className="flex min-h-11 w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3.5 text-left text-[13px] font-semibold text-neutral-800 transition-all hover:border-blue-100 hover:bg-blue-50 hover:text-[#0084FF] disabled:opacity-60 cursor-pointer"
              disabled={isPending}
              onClick={() => setShowGoogleLogin(true)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </span>
              <span className="text-[11px] text-neutral-400">Social</span>
            </button>

            {hasInjectedWallet &&
              availableConnectors.map((connector) => (
                <button
                  className="flex min-h-11 w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3.5 text-left text-[13px] font-semibold text-neutral-800 transition-all hover:border-blue-100 hover:bg-blue-50 hover:text-[#0084FF] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  disabled={isPending}
                  key={connector.uid}
                  onClick={() => {
                    setOpen(false);
                    connect({ connector });
                  }}
                  type="button"
                >
                  <span>{walletLabel(connector.name)}</span>
                  <span className="text-[11px] text-neutral-400">Connect</span>
                </button>
              ))}

            {!hasInjectedWallet && (
              <>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[12px] leading-relaxed text-blue-700">
                  No browser wallet detected. Open ArcStream in Chrome or Brave
                  with MetaMask installed.
                </div>
                <a
                  className="block rounded-xl border border-gray-100 bg-gray-50 p-3 text-[13px] font-semibold text-[#0084FF] transition-all hover:border-blue-100 hover:bg-blue-50"
                  href="https://metamask.io/download/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Install MetaMask
                </a>
              </>
            )}


          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-[12px] leading-relaxed text-red-600">
              {error.message}
            </p>
          )}
        </div>
      )}

      {showGoogleLogin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-[360px] rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 flex flex-col items-center">
            <svg className="w-10 h-10 mb-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.74 14.97.66 12 .66 7.7.66 3.99 3.13 2.18 6.72l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
              <path
                fill="#4285F4"
                d="M22.56 11.91c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 13.75c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V6.72H2.18C1.43 8.21 1 9.88 1 11.66s.43 3.45 1.18 4.94l3.66-2.85z"
              />
              <path
                fill="#34A853"
                d="M12 22.66c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84c1.81 3.59 5.52 6.06 12 6.06z"
              />
            </svg>
            <h3 className="text-[18px] font-black text-neutral-800 mb-1">Sign in with Google</h3>
            <p className="text-[12px] text-neutral-500 text-center mb-6">to continue to ArcStream</p>

            <div className="w-full space-y-2">
              <button
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-blue-50/50 hover:border-blue-100 transition-all text-left disabled:opacity-60 cursor-pointer"
                disabled={signingIn !== null}
                onClick={() => handleGoogleSignIn("hoangduc192bit@gmail.com", "ArcStream Demo")}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-[13px]">
                    AD
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-bold text-neutral-800">ArcStream Demo</span>
                    <span className="text-[11px] text-neutral-400">hoangduc192bit@gmail.com</span>
                  </div>
                </div>
                {signingIn === "hoangduc192bit@gmail.com" && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                )}
              </button>

              <button
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-blue-50/50 hover:border-blue-100 transition-all text-left disabled:opacity-60 cursor-pointer"
                disabled={signingIn !== null}
                onClick={() => handleGoogleSignIn("duc.hoang.test@gmail.com", "Duc Hoang Test")}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 text-[13px]">
                    DT
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-bold text-neutral-800">Duc Hoang Test</span>
                    <span className="text-[11px] text-neutral-400">duc.hoang.test@gmail.com</span>
                  </div>
                </div>
                {signingIn === "duc.hoang.test@gmail.com" && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                )}
              </button>
            </div>

            <button
              className="mt-6 text-[12px] font-bold text-neutral-400 hover:text-neutral-600 transition-all cursor-pointer"
              disabled={signingIn !== null}
              onClick={() => setShowGoogleLogin(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
