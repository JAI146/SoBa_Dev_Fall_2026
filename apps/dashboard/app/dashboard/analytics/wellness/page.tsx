"use client";

import { adminWellnessAnalyticsResponseSchema } from "@purposemint/contracts";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { formatMoney } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../../dashboard.module.css";
import {
  AnalyticsPageState,
  useAnalyticsDays,
  CountList,
  checkIns,
  compactMoney,
  tooltipCursor,
  tooltipLabelStyle,
  tooltipLineCursor,
  tooltipStyle,
  tooltipTextStyle,
  weekFullLabel,
  weekLabel,
} from "../analytics-shared";
import analyticsStyles from "../analytics.module.css";

export default function WellnessAnalyticsPage() {
  const days = useAnalyticsDays();
  const query = useAdminQuery(
    `/admin/analytics/wellness?days=${days}`,
    adminWellnessAnalyticsResponseSchema,
  );
  const data = query.data;

  const savingsWeekly = useMemo(
    () =>
      (data?.savings.weekly ?? []).map((week) => {
        const start = new Date(`${week.weekStart}T00:00:00Z`);
        return {
          ...week,
          label: weekLabel.format(start),
          fullLabel: `Week of ${weekFullLabel.format(start)}`,
        };
      }),
    [data],
  );
  const habitRates = useMemo(
    () =>
      (data?.habits.byFrequency ?? []).map((row) => ({
        ...row,
        rate7: row.last7Days.rate,
        rate30: row.last30Days.rate,
      })),
    [data],
  );

  // Keep the previous window on screen while a new one loads.
  if (query.error || !data) {
    return (
      <AnalyticsPageState
        error={query.error}
        label="Loading financial wellness…"
        onRetry={() => void query.reload()}
      />
    );
  }
  const { windowDays } = data;
  const { savings, goals, habits, levels } = data;
  const dailyHabits = habits.byFrequency.find((row) => row.key === "daily");
  const assignedLevels =
    levels.sources.mock + levels.sources.calculated + levels.sources.manual;

  return (
    <main
      className={query.loading ? analyticsStyles.refreshing : undefined}
      aria-busy={query.loading}
    >
      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Financial wellness metrics"
      >
        <DashboardStatCard
          label={`Saved · ${windowDays} days`}
          value={
            <>
              {formatMoney(savings.savedInWindow)}
              <small className={analyticsStyles.statHint}>
                {formatMoney(savings.totalSaved)} saved in total
              </small>
            </>
          }
          icon="goals"
          accent
        />
        <DashboardStatCard
          label={`Customers saving · ${windowDays} days`}
          value={savings.saversInWindow.toLocaleString()}
          icon="users"
        />
        <DashboardStatCard
          label="Goals at target"
          value={
            <>
              {goals.reachedTarget.toLocaleString()}
              <small className={analyticsStyles.statHint}>
                of {goals.activeGoals} active goals
              </small>
            </>
          }
          icon="accounts"
        />
        <DashboardStatCard
          label="Daily check-ins · 30 days"
          value={
            <>
              {dailyHabits?.last30Days.rate ?? 0}%
              <small className={analyticsStyles.statHint}>
                {checkIns.format(dailyHabits?.last30Days.completed ?? 0)} of{" "}
                {checkIns.format(dailyHabits?.last30Days.expected ?? 0)}{" "}
                expected
              </small>
            </>
          }
          icon="habits"
        />
      </section>

      <section className={styles["overview-grid"]}>
        <article className={`${styles.panel} ${styles["panel--wide"]}`}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Savings progression</h2>
              <p>
                Cumulative savings by all customers, starting from{" "}
                {formatMoney(savings.startingTotal)} saved before this window
              </p>
            </div>
          </div>
          <div
            className={analyticsStyles.chart}
            aria-label="Cumulative customer savings per week"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={savingsWeekly}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(value: number) => compactMoney.format(value)}
                />
                <Tooltip
                  cursor={tooltipLineCursor}
                  formatter={(value, _name, item) => [
                    `${formatMoney(Number(value))} · ${formatMoney(
                      (item.payload as { amount: number }).amount,
                    )} this week`,
                    "Total saved",
                  ]}
                  labelFormatter={(label, payload) =>
                    (payload[0]?.payload as { fullLabel?: string } | undefined)
                      ?.fullLabel ?? String(label)
                  }
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipTextStyle}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Goal progression</h2>
              <p>
                {goals.activeGoals} active goals by share of target saved, as of
                today
              </p>
            </div>
          </div>
          <div
            className={`${analyticsStyles.chart} ${analyticsStyles.goalChart}`}
            aria-label="Active goals by share of target saved"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={goals.buckets}
                layout="vertical"
                margin={{ top: 0, right: 32, bottom: 0, left: 8 }}
                barSize={20}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 4" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  formatter={(value) => [
                    `${value} of ${goals.activeGoals} ${
                      value === 1 ? "goal" : "goals"
                    }`,
                    "Active goals",
                  ]}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipTextStyle}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="count" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <CountList
          title="Level distribution"
          subtitle="Customers at each PurposeMint level today"
          items={[
            ...levels.levels.map((item) => ({
              key: `level_${item.level}`,
              label: `Level ${item.level}`,
              count: item.count,
            })),
            {
              key: "unassigned",
              label: "No level yet",
              count: levels.unassignedCount,
            },
          ]}
          badge={
            levels.sources.mock > 0 ? (
              <span
                className={`${styles["demo-label"]} ${analyticsStyles.badge}`}
              >
                Demo data
              </span>
            ) : null
          }
          footer={
            levels.sources.mock > 0
              ? `${levels.sources.mock} of ${assignedLevels} level assignments are demo data, not calculated from savings or habits.`
              : undefined
          }
        />

        <article className={`${styles.panel} ${styles["panel--wide"]}`}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Habit consistency</h2>
              <p>Share of scheduled check-ins completed, by frequency</p>
            </div>
            <ul className={analyticsStyles.legend} aria-label="Periods">
              <li>
                <span className={analyticsStyles.swatchRecent} aria-hidden />
                Last 7 days
              </li>
              <li>
                <span className={analyticsStyles.swatchMonth} aria-hidden />
                Last 30 days
              </li>
            </ul>
          </div>
          <div
            className={analyticsStyles.habitChart}
            aria-label="Habit check-in rate by frequency for the last 7 and 30 days"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={habitRates}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                barGap={4}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  formatter={(value, name, item) => {
                    const row = item.payload as (typeof habitRates)[number];
                    const period =
                      item.dataKey === "rate7" ? row.last7Days : row.last30Days;
                    const unit =
                      row.key === "as_needed" ? "habits used" : "check-ins";
                    return [
                      `${value}% · ${checkIns.format(period.completed)} of ${checkIns.format(period.expected)} ${unit}`,
                      name,
                    ];
                  }}
                  // Recharts sorts rows by name, which puts 30 before 7.
                  itemSorter={(item) => (item.dataKey === "rate7" ? 0 : 1)}
                  labelFormatter={(label, payload) => {
                    const row = payload[0]?.payload as
                      (typeof habitRates)[number] | undefined;
                    return row
                      ? `${row.label} habits · ${row.activeHabits} active`
                      : String(label);
                  }}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipTextStyle}
                />
                <Bar
                  dataKey="rate7"
                  name="Last 7 days"
                  className={analyticsStyles.seriesRecent}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="rate30"
                  name="Last 30 days"
                  className={analyticsStyles.seriesMonth}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className={analyticsStyles.note}>
            Daily habits expect one check-in a day and weekly habits one every 7
            days, counted from when the habit was added. As-needed habits have
            no schedule, so they show the share used at least once.
          </p>
        </article>
      </section>
    </main>
  );
}
