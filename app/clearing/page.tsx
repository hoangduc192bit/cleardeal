import { Suspense } from "react";

import { DashboardClient } from "@/app/dashboard/dashboard-client";

export default function ClearingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#05090d]">
          <div className="flex items-center gap-3 text-[13px] text-white/40">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-blue-500" />
            Loading clearing proof…
          </div>
        </main>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
