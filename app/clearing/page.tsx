import { Suspense } from "react";

import { DashboardClient } from "@/app/dashboard/dashboard-client";

export default function ClearingPage() {
  return (
    <Suspense
      fallback={
        <main className="cd-page-shell flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-[13px] text-[var(--cd-muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cd-line)] border-t-[var(--cd-gold)]" />
            Loading clearing proof…
          </div>
        </main>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
