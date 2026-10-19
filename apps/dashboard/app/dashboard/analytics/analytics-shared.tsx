"use client";

import {
  DEFAULT_ANALYTICS_WINDOW_DAYS,
  adminAnalyticsQuerySchema,
  analyticsRangeQuery,
  type AdminUserAnalyticsResponse,
  type AnalyticsRange,
  type AnalyticsReportKey,
} from "@purposemint/contracts";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import styles from "../dashboard.module.css";
import analyticsStyles from "./analytics.module.css";

const DEFAULT_RANGE: AnalyticsRange = {
  kind: "preset",
  days: DEFAULT_ANALYTICS_WINDOW_DAYS,
  from: null,
  to: null,
};

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const utcDay = (value: string) => new Date(`${value}T00:00:00Z`);

export type AnalyticsRangeState = {
  range: AnalyticsRange;
  /** The query string pages and exports send, e.g. `days=90`. */
  query: string;
  /** Short form for card labels: "90 days" or "Sep 1 – Sep 30". */
  label: string;
  /** Sentence form: "in the last 90 days" or "from Sep 1 to Sep 30, 2026". */
  phrase: string;
  /** Why the range in the URL was rejected; the default is shown instead. */
  error: string | null;
};

/**
 * The reporting range in the URL (`?days=` or `?from=&to=`), checked with the
 * same schema the API uses. Old `?days=` links keep working.
 */
export function useAnalyticsRange(): AnalyticsRangeState {
  const params = useSearchParams();
  const parsed = adminAnalyticsQuerySchema.safeParse({
    days: params.get("days") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });
  const range = parsed.success ? parsed.data : DEFAULT_RANGE;
  const custom = range.from && range.to ? [range.from, range.to] : null;
  return {
    range,
    query: analyticsRangeQuery(range),
    label: custom
      ? `${shortDate.format(utcDay(custom[0]!))} – ${shortDate.format(utcDay(custom[1]!))}`
      : `${range.days} days`,
    phrase: custom
      ? `from ${shortDate.format(utcDay(custom[0]!))} to ${longDate.format(utcDay(custom[1]!))}`
      : `in the last ${range.days} days`,
    error: parsed.success
      ? null
      : (parsed.error.issues[0]?.message ?? "That range is not valid."),
  };
}

/** Header copy for each analytics route, keyed by pathname. */
export const analyticsPages: Record<
  string,
  {
    title: string;
    /** Takes the range phrase, e.g. "in the last 90 days". */
    description: (phrase: string) => string;
    /** The CSV export that matches this page. */
    report: AnalyticsReportKey;
  }
> = {
  "/dashboard/analytics": {
    report: "users",
    title: "User analytics",
    description: (phrase) =>
      `Acquisition, activation and drop off for customers who signed up ${phrase}.`,
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
    description: (phrase) =>
      `Conversions, cancellations and billing records ${phrase}; past due subscriptions as they stand today.`,
  },
  "/dashboard/analytics/retention": {
    report: "retention",
    title: "Retention",
    description: (phrase) =>
      `Weekly signup cohorts ${phrase}, and the share of all customers active recently.`,
  },
};

/** Every analytics report, in menu order, for the sidebar report list. */
export const analyticsReportOptions = Object.entries(analyticsPages).map(
  ([path, page]) => ({ value: path, label: page.title }),
);

// Every chart tooltip reads left to right: heading, series rows and values.
export const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--chart-tooltip-border)",
  background: "var(--chart-tooltip-bg)",
  color: "var(--chart-tooltip-text)",
  fontSize: 12,
  textAlign: "left" as const,
};
// Recharts colors tooltip text with the series fill unless told otherwise.
export const tooltipTextStyle = {
  color: "var(--chart-tooltip-text)",
  textAlign: "left" as const,
};
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

type AxisTickProps = {
  x?: string | number;
  y?: string | number;
  payload?: { value?: string | number };
};

const categoryTicks = new Map<number, (props: AxisTickProps) => ReactNode>();

/** Average glyph width of the 12px axis font, for deciding where to wrap. */
const AXIS_CHAR_WIDTH = 6.4;

/** Splits a label into lines that fit `maxWidth` at the axis font size. */
function wrapLabel(label: string, maxWidth: number): string[] {
  const maxChars = Math.max(8, Math.floor(maxWidth / AXIS_CHAR_WIDTH));
  const lines: string[] = [];
  for (const word of label.split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= maxChars) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines;
}

/**
 * Left-aligned labels for the category axis of a horizontal bar chart, so
 * they start at the panel's left edge instead of hugging the bars. `width`
 * is the YAxis width; long labels wrap inside it.
 */
export function categoryTick(width: number) {
  let tick = categoryTicks.get(width);
  if (!tick) {
    tick = function CategoryTick({ x = 0, y = 0, payload }: AxisTickProps) {
      const left = Number(x) - width + 8;
      const lines = wrapLabel(String(payload?.value ?? ""), width - 16);
      return (
        <text
          x={left}
          y={Number(y)}
          textAnchor="start"
          dominantBaseline="middle"
          className="recharts-cartesian-axis-tick-value"
        >
          {lines.map((line, index) => (
            <tspan
              key={index}
              x={left}
              // Centre the block of lines on the bar.
              dy={index === 0 ? `${-(lines.length - 1) * 0.55}em` : "1.1em"}
            >
              {line}
            </tspan>
          ))}
        </text>
      );
    };
    categoryTicks.set(width, tick);
  }
  return tick;
}
