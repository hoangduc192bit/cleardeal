"use client";

import { useState } from "react";
import { Droplets, ExternalLink, LoaderCircle } from "lucide-react";

type FaucetState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; faucetUrl?: string };

export function ArcFaucetButton({
  address,
  compact = false,
}: {
  address: string;
  compact?: boolean;
}) {
  const [requesting, setRequesting] = useState(false);
  const [state, setState] = useState<FaucetState>({ status: "idle" });

  async function requestTestUsdc() {
    setRequesting(true);
    setState({ status: "idle" });
    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        faucetUrl?: string;
      };
      if (!response.ok) {
        throw Object.assign(
          new Error(data.message || "Circle Faucet request failed."),
          { faucetUrl: data.faucetUrl },
        );
      }
      setState({
        status: "success",
        message:
          data.message ||
          "Circle accepted the request. Test USDC will arrive shortly.",
      });
    } catch (cause) {
      setState({
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Circle Faucet request failed.",
        faucetUrl:
          typeof cause === "object" &&
          cause !== null &&
          "faucetUrl" in cause &&
          typeof cause.faucetUrl === "string"
            ? cause.faucetUrl
            : "https://faucet.circle.com",
      });
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className={compact ? "relative" : ""}>
      <button
        className={
          compact
            ? "inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-3.5 text-[12px] font-semibold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-60"
            : "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        }
        disabled={requesting}
        onClick={requestTestUsdc}
        type="button"
      >
        {requesting ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Droplets className="h-3.5 w-3.5" />
        )}
        {requesting ? "Requesting…" : "Get test USDC"}
      </button>

      {state.status !== "idle" ? (
        <div
          className={`${compact ? "absolute right-0 top-[calc(100%+8px)] z-[80] w-72 shadow-xl" : "mt-2"} rounded-xl border p-3 text-[11px] leading-5 ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {state.message}
          {state.status === "error" && state.faucetUrl ? (
            <a
              className="mt-1 flex items-center gap-1 font-bold underline"
              href={state.faucetUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open Circle Faucet
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
