"use client";

import {
  analyticsWindowDaysValues,
  type AdminUserAnalyticsResponse,
  type AnalyticsReportKey,
  type AnalyticsWindowDays,
} from "@purposemint/contracts";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import styles from "../dashboard.module.css";
import analyticsStyles from "./analytics.module.css";

export const DEFAULT_WINDOW_DAYS: AnalyticsWindowDays = 90;

/** Reads the reporting window from `?days=`, falling back to the default. */
export function parseWindowDays(value: string | null): AnalyticsWindowDays {
  const days = Number(value);
  return (analyticsWindowDaysValues as readonly number[]).includes(days)
    ? (days as AnalyticsWindowDays)
    : DEFAULT_WINDOW_DAYS;
}

/** The window selected in the URL, shared by every analytics page. */
export function useAnalyticsDays(): AnalyticsWindowDays {
  return parseWindowDays(useSearchParams().get("days"));
}

/** Header copy for each analytics route, keyed by pathname. */
export const analyticsPages: Record<
  string,
  {
    title: string;
    description: (days: number) => string;
    /** The CSV export that matches this page. */
    report: AnalyticsReportKey;
  }
> = {
  "/dashboard/analytics": {
    report: "users",
    title: "User analytics",
    description: (days) =>
      `Acquisition, activation and drop off for customers who signed up in the last ${days} days.`,
  },
  "/dashboard/analytics/wellness": {
    report: "wellness",
    title: "Financial wellness",
    description: () =>
      "Savings in the window, goals and levels as they stand today, and habit check-ins over the last 7 and 30 days.",
  },
  "/dashboard/analytics/pathways": {
    report: "pathways",
    title: "Pathways and plans",
    description: () =>
      "Applications and partner choices started in the window; eligibility and paid plans as they stand today.",
  },
  "/dashboard/analytics/subscriptions": {
    report: "subscriptions",
    title: "Subscriptions",
    description: (days) =>
      `Conversions, cancellations and billing records in the last ${days} days; past due subscriptions as they stand today.`,
  },
  "/dashboard/analytics/retention": {
    report: "retention",
    title: "Retention",
    description: (days) =>
      `Weekly signup cohorts in the last ${days} days, and the share of all customers active recently.`,
  },
};

export const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--chart-tooltip-border)",
  background: "var(--chart-tooltip-bg)",
  color: "var(--chart-tooltip-text)",
  fontSize: 12,
};
// Recharts colors tooltip text with the series fill unless told otherwise.
export const tooltipTextStyle = { color: "var(--chart-tooltip-text)" };
export const tooltipLabelStyle = { ...tooltipTextStyle, fontWeight: 700 };
export const tooltipCursor = { fill: "var(--chart-cursor)" };
// Line and area charts draw a vertical cursor line instead of a band.
export const tooltipLineCursor = { stroke: "var(--chart-cursor-line)" };

// Weekly habits expect fractional check-ins (30 days is 4.3 weeks).
export const checkIns = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

// Week starts arrive as UTC calendar days; format them in UTC so they never shift.
export const weekLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
export const weekFullLabel = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Loading and error states for a page inside the analytics layout. The
 * wrapper keeps the shared components from filling the whole viewport.
 */
export function AnalyticsPageState({
  error,
  label,
  onRetry,
}: {
  error: string | null;
  label: string;
  onRetry: () => void;
}) {
  return (
    <div className={analyticsStyles.pageState}>
      {error ? (
        <DashboardError message={error} onRetry={onRetry} />
      ) : (
        <DashboardLoading label={label} />
      )}
    </div>
  );
}

export function CountList({
  badge,
  emptyMessage,
  footer,
  items,
  subtitle,
  title,
  total,
}: {
  badge?: ReactNode;
  /** Shown instead of the bars when every count is zero. */
  emptyMessage?: string;
  footer?: string;
  items: AdminUserAnalyticsResponse["acquisition"]["byStatus"];
  subtitle: string;
  title: string;
  /** Scale bars against this total instead of the largest item. */
  total?: number;
}) {
  const maximum = Math.max(1, total ?? 0, ...items.map((item) => item.count));
  return (
    <article className={styles.panel}>
      <div className={styles["panel-heading"]}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {badge}
      </div>
      {emptyMessage && items.every((item) => item.count === 0) ? (
        <p className={styles["panel-empty"]}>{emptyMessage}</p>
      ) : (
        <div className={styles["progress-list"]}>
          {items.map((item) => (
            <div key={item.key} className={styles["progress-item"]}>
              <div>
                <span>{item.label}</span>
                <strong>{item.count.toLocaleString()}</strong>
              </div>
              <div className={styles["progress-track"]}>
                <span style={{ width: `${(item.count / maximum) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {footer ? <p className={analyticsStyles.note}>{footer}</p> : null}
    </article>
  );
}

export function pathwayTitle(
  pathways: { key: string; label: string }[],
  key: string,
) {
  return pathways.find((pathway) => pathway.key === key)?.label ?? key;
}

export function percent(part: number, whole: number) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}
