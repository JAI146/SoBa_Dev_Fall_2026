"use client";

import {
  adminRetentionResponseSchema,
  retentionWeekValues,
} from "@purposemint/contracts";
import { type CSSProperties } from "react";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../../dashboard.module.css";
import {
  AnalyticsPageState,
  useAnalyticsDays,
  weekFullLabel,
  weekLabel,
} from "../analytics-shared";
import analyticsStyles from "../analytics.module.css";

export default function RetentionAnalyticsPage() {
  const days = useAnalyticsDays();
  const query = useAdminQuery(
    `/admin/analytics/retention?days=${days}`,
    adminRetentionResponseSchema,
  );
  const data = query.data;

  // Keep the previous window on screen while a new one loads.
  if (query.error || !data) {
    return (
      <AnalyticsPageState
        error={query.error}
        label="Loading retention…"
        onRetry={() => void query.reload()}
      />
    );
  }
  const { windowDays } = data;
  const retention = data;
  const windowPhrase = `in the last ${windowDays} days`;
  // Week 1 retention across cohorts whose first week has fully ended.
  const weekOneCells = retention.cohorts.flatMap((cohort) =>
    cohort.cells
      .filter((cell) => cell.week === 1 && cell.available)
      .map((cell) => ({ size: cohort.size, active: cell.active ?? 0 })),
  );
  const weekOneSize = weekOneCells.reduce((sum, cell) => sum + cell.size, 0);
  const weekOneActive = weekOneCells.reduce(
    (sum, cell) => sum + cell.active,
    0,
  );

  return (
    <main
      className={query.loading ? analyticsStyles.refreshing : undefined}
      aria-busy={query.loading}
    >
      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Retention metrics"
      >
        <DashboardStatCard
          label="Active · last 7 days"
          value={
            <>
              {retention.overall.activeLast7DaysRate}%
              <small className={analyticsStyles.statHint}>
                {retention.overall.activeLast7Days} of{" "}
                {retention.overall.totalCustomers} customers
              </small>
            </>
          }
          icon="habits"
          accent
        />
        <DashboardStatCard
          label="Active · last 30 days"
          value={
            <>
              {retention.overall.activeLast30DaysRate}%
              <small className={analyticsStyles.statHint}>
                {retention.overall.activeLast30Days} of{" "}
                {retention.overall.totalCustomers} customers
              </small>
            </>
          }
          icon="habits"
        />
        <DashboardStatCard
          label="Week 1 retention"
          value={
            <>
              {weekOneSize === 0
                ? "—"
                : // One decimal, like the per-cohort rates from the API.
                  `${Number(((weekOneActive / weekOneSize) * 100).toFixed(1))}%`}
              <small className={analyticsStyles.statHint}>
                {weekOneSize === 0
                  ? "No cohort has finished its first week yet"
                  : `${weekOneActive} of ${weekOneSize} customers in finished cohorts`}
              </small>
            </>
          }
          icon="users"
        />
        <DashboardStatCard
          label="Cohorts"
          value={
            <>
              {retention.cohorts.length}
              <small className={analyticsStyles.statHint}>
                {retention.cohorts.reduce(
                  (sum, cohort) => sum + cohort.size,
                  0,
                )}{" "}
                customers signed up {windowPhrase}
              </small>
            </>
          }
          icon="accounts"
        />
      </section>

      <section className={styles["overview-grid"]}>
        <article className={`${styles.panel} ${styles["panel--wide"]}`}>
          <div
            className={`${styles["panel-heading"]} ${analyticsStyles.wrapHeading}`}
          >
            <div>
              <h2>Weekly cohorts</h2>
              <p>
                Share of each signup week active 1 to 4 weeks after signing up
              </p>
            </div>
            <div className={analyticsStyles.scaleLegend} aria-hidden>
              <span>0%</span>
              <span className={analyticsStyles.scaleBar} />
              <span>100%</span>
              <span className={analyticsStyles.scalePending} />
              <span>Not yet</span>
            </div>
          </div>
          {retention.cohorts.length === 0 ? (
            <p className={styles["panel-empty"]}>
              No customers signed up {windowPhrase}.
            </p>
          ) : (
            <div
              className={analyticsStyles.cohortGrid}
              role="table"
              aria-label="Retention by weekly signup cohort"
            >
              <div role="row" className={analyticsStyles.cohortRow}>
                <span
                  role="columnheader"
                  className={analyticsStyles.cohortHead}
                >
                  Signup week
                </span>
                {retentionWeekValues.map((week) => (
                  <span
                    key={week}
                    role="columnheader"
                    className={analyticsStyles.cohortHead}
                  >
                    Week {week}
                  </span>
                ))}
              </div>
              {retention.cohorts.map((cohort) => {
                const start = new Date(`${cohort.weekStart}T00:00:00Z`);
                const customers = `${cohort.size} ${cohort.size === 1 ? "customer" : "customers"}`;
                return (
                  <div
                    key={cohort.weekStart}
                    role="row"
                    className={analyticsStyles.cohortRow}
                  >
                    <span
                      role="rowheader"
                      className={analyticsStyles.cohortLabel}
                    >
                      {weekLabel.format(start)}
                      <small>{customers}</small>
                    </span>
                    {cohort.cells.map((cell) => {
                      const heading = `Week of ${weekFullLabel.format(start)} · ${customers}`;
                      const detail =
                        cell.available && cell.rate !== null
                          ? `Week ${cell.week}: ${cell.active} of ${cohort.size} active (${cell.rate}%)`
                          : `Week ${cell.week}: not yet. This week hasn't ended for everyone in the cohort.`;
                      return (
                        <span
                          key={cell.week}
                          role="cell"
                          tabIndex={0}
                          aria-label={`${heading}. ${detail}`}
                          className={[
                            analyticsStyles.cohortCell,
                            cell.rate === null
                              ? analyticsStyles.cohortCellPending
                              : cell.rate >= 55
                                ? analyticsStyles.cohortCellStrong
                                : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={
                            {
                              "--cell-strength": `${cell.rate ?? 0}%`,
                            } as CSSProperties
                          }
                        >
                          {cell.rate === null ? "Not yet" : `${cell.rate}%`}
                          <span
                            className={analyticsStyles.cellTip}
                            data-align={cell.week > 1 ? "end" : "start"}
                            aria-hidden
                          >
                            <strong>{heading}</strong>
                            {detail}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          <p className={analyticsStyles.note}>
            Activity means a habit completion, savings entry, reflection or
            sign-in session on that day. Demo customers have no login history,
            so their activity comes from habits, savings and reflections. Week 1
            is days 7 to 13 after signup; a week shows as not yet until it has
            ended for every customer in the cohort.
          </p>
        </article>
      </section>
    </main>
  );
}
