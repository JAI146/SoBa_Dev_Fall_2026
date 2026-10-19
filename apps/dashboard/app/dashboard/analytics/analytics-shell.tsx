"use client";

import {
  adminAnalyticsAccessSchema,
  adminAnalyticsExportSchema,
  type AnalyticsReportKey,
  type AnalyticsWindowDays,
} from "@purposemint/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { downloadCsv } from "@/lib/export-csv";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../dashboard.module.css";
import { analyticsPages, useAnalyticsDays } from "./analytics-shared";
import analyticsStyles from "./analytics.module.css";
import { WindowSelect } from "./window-select";

/** Page header, window selector and CSV export shared by every analytics page. */
export function AnalyticsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const days = useAnalyticsDays();
  const page =
    analyticsPages[pathname] ?? analyticsPages["/dashboard/analytics"]!;
  // The same probe the sidebar uses; exports need reports.full.
  const access = useAdminQuery(
    "/admin/analytics/access",
    adminAnalyticsAccessSchema,
  );

  function selectWindow(value: AnalyticsWindowDays) {
    // The window lives in the URL so it survives a refresh and carries across pages.
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", String(value));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={`${styles["dashboard-page"]} ${analyticsStyles.analytics}`}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Reports</p>
          <h1>{page.title}</h1>
          <p>{page.description(days)}</p>
        </div>
        <div className={analyticsStyles.headerActions}>
          <div className={styles["filter-field"]}>
            <span id="analytics-window-label">Window</span>
            <WindowSelect
              value={days}
              onChange={selectWindow}
              labelId="analytics-window-label"
            />
          </div>
          {access.data?.canExport ? (
            <ExportButton
              key={`${page.report}-${days}`}
              report={page.report}
              days={days}
            />
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function ExportButton({
  report,
  days,
}: {
  report: AnalyticsReportKey;
  days: AnalyticsWindowDays;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const file = await apiRequest(
        `/admin/analytics/exports/${report}?days=${days}`,
        { method: "GET" },
        getToken(),
        adminAnalyticsExportSchema,
      );
      downloadCsv(
        file.filename,
        file.headers,
        file.rows.map((row) =>
          row.map((cell) => (cell === null ? "" : String(cell))),
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 403
          ? "You don't have permission to export reports. Ask an admin for full reporting access."
          : cause instanceof Error
            ? `The export failed: ${cause.message}`
            : "The export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={analyticsStyles.exportAction}>
      <button
        type="button"
        className={styles["btn-toolbar-primary"]}
        onClick={() => void exportCsv()}
        disabled={exporting}
        aria-busy={exporting}
      >
        {exporting ? (
          <>
            <span className={analyticsStyles.buttonSpinner} aria-hidden />
            Exporting…
          </>
        ) : (
          "Export CSV"
        )}
      </button>
      {error ? (
        // A div, so the header's paragraph styles do not mute the error.
        <div className={analyticsStyles.exportError} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
