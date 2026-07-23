import { Suspense } from "react";

import { TreasuryDashboardClient } from "@/app/dashboard/treasury-dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbf7eb]">
          <div className="flex items-center gap-3 text-[13px] text-stone-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500" />
            Loading company spend workspace…
          </div>
        </main>
      }
    >
      <TreasuryDashboardClient />
    </Suspense>
  );
}
