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
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-blue-600" />
        <p className="mt-4 text-[16px] font-bold text-slate-950">
          Preparing your ClearDeal wallet
        </p>
        <p className="mt-2 text-[12px] leading-5 text-slate-500">
          Circle is opening your existing Arc wallet or creating it for this
          Google account.
        </p>
      </div>
    </div>
  );
}
