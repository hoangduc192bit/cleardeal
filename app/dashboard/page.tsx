import { Suspense } from "react";

import { ProjectDashboardClient } from "@/app/dashboard/project-dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="cd-page-shell flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-[13px] text-stone-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500" />
            Loading your projects…
          </div>
        </main>
      }
    >
      <ProjectDashboardClient />
    </Suspense>
  );
}
