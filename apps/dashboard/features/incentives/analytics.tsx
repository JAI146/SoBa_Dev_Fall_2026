"use client";

/**
 * Shows incentive totals, goal allocation categories, and daily award activity.
 * Metric cards open the matching recipients using the current report filters.
 */
import { useAdminQuery } from "@/lib/use-admin-query";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./incentives.module.css";
import {
  incentiveAnalyticsSchema,
  incentiveCategories,
} from "@purposemint/contracts";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { label, money } from "./shared";
export function Analytics({
  params,
  onMetric,
}: {
  params: string;
  onMetric: (status: string) => void;
}) {
  const query = useAdminQuery(
    `/admin/incentives/analytics?${params}`,
    incentiveAnalyticsSchema,
  );
  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading bonus analytics…" />;
  const data = query.data;
  const cards = [
    {
      name: "Eligible users",
      value: data.eligibleUsers.toLocaleString(),
      status: "eligible",
    },
    {
      name: "Bonuses earned",
      value: `${data.earnedCount} · ${money(data.earnedCents)}`,
      status: "earned",
    },
    {
      name: "Distributed",
      value: money(data.distributedCents),
      status: "distributed",
    },
    {
      name: "Applied to goals",
      value: money(data.allocatedCents),
      status: "allocated",
    },
    {
      name: "Withdrawn",
      value: money(data.withdrawnCents),
      status: "withdrawn",
    },
    {
      name: "Remaining",
      value: money(data.remainingCents),
      status: "remaining",
    },
  ];
  const maximum = Math.max(1, ...data.categories.map((c) => c.amountCents));
  return (
    <div className={styles.stack}>
      <section className={styles.metrics} aria-label="Bonus metrics">
        {cards.map((c) => (
          <div key={c.name}>
            <button
              className={styles.metricButton}
              onClick={() => onMetric(c.status)}
              aria-label={`View recipients: ${c.name}`}
            >
              <DashboardStatCard label={c.name} value={c.value} />
            </button>
          </div>
        ))}
      </section>
      <section className={base.panel}>
        <h2>Current goal allocation</h2>
        {incentiveCategories.map((category) => {
          const amount =
            data.categories.find((c) => c.category === category)?.amountCents ??
            0;
          return (
            <div key={category}>
              <div className={styles.heading}>
                <span>{label(category)}</span>
                <strong>{money(amount)}</strong>
              </div>
              <div className={styles.bar}>
                <span style={{ width: `${(amount / maximum) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </section>
      <section className={base.panel}>
        <h2>Awards and distribution by day</h2>
        <div className={base["table-wrap"]}>
          <table className={base["data-table"]}>
            <thead>
              <tr>
                <th>Date (UTC)</th>
                <th>Earned</th>
                <th>Distributed</th>
              </tr>
            </thead>
            <tbody>
              {data.activity.map((a) => (
                <tr key={a.date}>
                  <td>{a.date}</td>
                  <td>{money(a.earnedCents)}</td>
                  <td>{money(a.distributedCents)}</td>
                </tr>
              ))}
              {!data.activity.length ? (
                <tr>
                  <td colSpan={3}>
                    No award or distribution activity recorded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
