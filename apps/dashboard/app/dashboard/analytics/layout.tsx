import { Suspense } from "react";
import { DashboardLoading } from "@/components/dashboard/dashboard-data-state";
import { AnalyticsShell } from "./analytics-shell";

// The shell reads ?days= from the URL, which needs a Suspense boundary.
export default function AnalyticsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<DashboardLoading label="Loading analytics…" />}>
      <AnalyticsShell>{children}</AnalyticsShell>
    </Suspense>
  );
}
