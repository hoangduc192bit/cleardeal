import { Suspense } from "react";

import { DashboardClient } from "@/app/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
          <div className="flex items-center gap-3 text-[14px] text-slate-400">
            <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-[#0084FF] animate-spin" />
            Loading dashboard…
          </div>
        </main>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
