"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { resumeCircleGoogleLogin } from "@/lib/circle-google-client";

export function GoogleWalletCallback() {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let active = true;
    void resumeCircleGoogleLogin()
      .then((resumed) => {
        if (active) setProcessing(resumed);
      })
      .catch(() => {
        if (active) setProcessing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!processing) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-20 flex justify-center">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,.2)]">
        <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-blue-600" />
        <div>
          <p className="text-[13px] font-bold text-slate-950">
            Preparing your ClearDeal wallet
          </p>
          <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
            Complete the Circle approval window if it appears.
          </p>
        </div>
      </div>
    </div>
  );
}
