"use client";

import {
  adminAnalyticsAccessSchema,
  adminAnalyticsExportSchema,
  adminAnalyticsQuerySchema,
  analyticsRangeQuery,
  analyticsWindowDaysValues,
  utcToday,
  type AnalyticsReportKey,
  type AnalyticsWindowDays,
} from "@purposemint/contracts";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { downloadCsv } from "@/lib/export-csv";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../dashboard.module.css";
import { analyticsPages, useAnalyticsRange } from "./analytics-shared";
import analyticsStyles from "./analytics.module.css";
import { HeaderSelect } from "./header-select";

const DAY_MS = 24 * 60 * 60 * 1000;

type WindowChoice = `${AnalyticsWindowDays}` | "custom";

const windowOptions: { value: WindowChoice; label: string }[] = [
  ...analyticsWindowDaysValues.map((days) => ({
    value: String(days) as `${AnalyticsWindowDays}`,
    label: `Last ${days} days`,
  })),
  { value: "custom", label: "Custom range" },
];

/**
 * Page header shared by every analytics page: the date range dropdown,
 * custom dates, and the CSV export. Reports are switched in the sidebar.
 */
export function AnalyticsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { range, query, phrase, error: rangeError } = useAnalyticsRange();
  const page =
    analyticsPages[pathname] ?? analyticsPages["/dashboard/analytics"]!;
  const custom = range.from !== null && range.to !== null;
  // The same probe the sidebar uses; exports need reports.full.
  const access = useAdminQuery(
    "/admin/analytics/access",
    adminAnalyticsAccessSchema,
  );

  // The range lives in the URL so it survives a refresh and carries across pages.
  function showRange(nextQuery: string) {
    router.replace(`${pathname}?${nextQuery}`, { scroll: false });
  }

  function selectWindow(choice: WindowChoice) {
    if (choice !== "custom") {
      showRange(`days=${choice}`);
      return;
    }
    // Start from the days the current window covers, ending today.
    showRange(
      analyticsRangeQuery({
        kind: "custom",
        days: range.days,
        from: utcToday(new Date(Date.now() - (range.days - 1) * DAY_MS)),
        to: utcToday(),
      }),
    );
  }

  return (
    <div className={`${styles["dashboard-page"]} ${analyticsStyles.analytics}`}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Reports</p>
          <h1>{page.title}</h1>
          <p>{page.description(phrase)}</p>
        </div>
        <div className={analyticsStyles.headerActions}>
          <div className={styles["filter-field"]}>
            <span id="analytics-window-label">Date range</span>
            <HeaderSelect<WindowChoice>
              value={custom ? "custom" : (String(range.days) as WindowChoice)}
              options={windowOptions}
              onChange={selectWindow}
              labelId="analytics-window-label"
            />
          </div>
          {custom ? (
            <CustomRange
              key={query}
              from={range.from!}
              to={range.to!}
              onApply={showRange}
            />
          ) : null}
          {access.data?.canExport ? (
            <ExportButton
              key={`${page.report}-${query}`}
              report={page.report}
              query={query}
            />
          ) : null}
          {rangeError ? (
            <div className={analyticsStyles.exportError} role="alert">
              {rangeError} Showing the last 90 days instead.
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Start and end dates for a custom range. A valid pair goes straight into
 * the URL; an invalid one stays in the inputs with the reason shown.
 */
function CustomRange({
  from,
  to,
  onApply,
}: {
  from: string;
  to: string;
  onApply: (query: string) => void;
}) {
  const [draft, setDraft] = useState({ from, to });
  const [error, setError] = useState<string | null>(null);
  const today = utcToday();

  function change(next: { from: string; to: string }) {
    setDraft(next);
    const parsed = adminAnalyticsQuerySchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Choose a valid range.");
      return;
    }
    setError(null);
    onApply(analyticsRangeQuery(parsed.data));
  }

  return (
    <>
      {/* From and To wrap together, so the range never splits across rows. */}
      <div className={analyticsStyles.customRange}>
        <label className={styles["filter-field"]}>
          <span>From</span>
          <input
            type="date"
            className={analyticsStyles.dateInput}
            value={draft.from}
            max={draft.to || today}
            required
            onChange={(event) => change({ ...draft, from: event.target.value })}
          />
        </label>
        <label className={styles["filter-field"]}>
          <span>To</span>
          <input
            type="date"
            className={analyticsStyles.dateInput}
            value={draft.to}
            min={draft.from}
            max={today}
            required
            onChange={(event) => change({ ...draft, to: event.target.value })}
          />
        </label>
      </div>
      {error ? (
        <div className={analyticsStyles.exportError} role="alert">
          {error}
        </div>
      ) : null}
    </>
  );
}

function ExportButton({
  report,
  query,
}: {
  report: AnalyticsReportKey;
  /** The page's range, e.g. `days=90` or `from=…&to=…`. */
  query: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const file = await apiRequest(
        `/admin/analytics/exports/${report}?${query}`,
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
        className={analyticsStyles.exportButton}
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
          <>
            <DownloadIcon />
            Export CSV
          </>
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

function DownloadIcon() {
  return (
    <svg
      className={analyticsStyles.exportIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}
