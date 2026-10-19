"use client";

import { adminUserAnalyticsResponseSchema } from "@purposemint/contracts";
import { useMemo } from "react";
import {
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
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../dashboard.module.css";
import {
  AnalyticsPageState,
  useAnalyticsDays,
  CountList,
  percent,
  tooltipCursor,
  tooltipLabelStyle,
  tooltipStyle,
  tooltipTextStyle,
  weekFullLabel,
  weekLabel,
} from "./analytics-shared";
import analyticsStyles from "./analytics.module.css";

export default function UserAnalyticsPage() {
  const days = useAnalyticsDays();
  const query = useAdminQuery(
    `/admin/analytics/users?days=${days}`,
    adminUserAnalyticsResponseSchema,
  );
  const data = query.data;

  const weekly = useMemo(
    () =>
      (data?.acquisition.weekly ?? []).map((week) => {
        const start = new Date(`${week.weekStart}T00:00:00Z`);
        return {
          ...week,
          label: weekLabel.format(start),
          fullLabel: `Week of ${weekFullLabel.format(start)}`,
        };
      }),
    [data],
  );
  const funnel = useMemo(() => {
    const registered = data?.dropOff.funnel[0]?.count ?? 0;
    return (data?.dropOff.funnel ?? []).map((stage) => ({
      ...stage,
      share: percent(stage.count, registered),
      display: `${stage.count} · ${percent(stage.count, registered)}%`,
    }));
  }, [data]);

  // Keep the previous window on screen while a new one loads.
  if (query.error || !data) {
    return (
      <AnalyticsPageState
        error={query.error}
        label="Loading user analytics…"
        onRetry={() => void query.reload()}
      />
    );
  }
  const { windowDays } = data;
  const { acquisition, activation, dropOff } = data;
  const lapsedRate = percent(
    dropOff.lapsed.inactiveCustomers,
    dropOff.lapsed.onboardedCustomers,
  );

  return (
    <main
      className={query.loading ? analyticsStyles.refreshing : undefined}
      aria-busy={query.loading}
    >
      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Key metrics"
      >
        <DashboardStatCard
          label="Total customers"
          value={acquisition.totalCustomers.toLocaleString()}
          icon="users"
          accent
        />
        <DashboardStatCard
          label={`New customers · ${windowDays} days`}
          value={
            <>
              {acquisition.newCustomers.toLocaleString()}
              <small className={analyticsStyles.statHint}>
                {acquisition.previousPeriodNewCustomers.toLocaleString()} in the
                previous {windowDays} days
              </small>
            </>
          }
          icon="users"
        />
        <DashboardStatCard
          label="Email verified"
          value={`${acquisition.emailVerifiedRate}%`}
          icon="accounts"
        />
        <DashboardStatCard
          label="Activation rate"
          value={
            <>
              {activation.activationRate}%
              <small className={analyticsStyles.statHint}>
                {activation.activated} of {activation.cohortSize} new customers
              </small>
            </>
          }
          icon="habits"
        />
      </section>

      <h2 className={analyticsStyles.sectionTitle}>
        Acquisition
        <span>Weeks start on Monday, UTC.</span>
      </h2>
      <section className={styles["overview-grid"]}>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Signups per week</h2>
              <p>New customer accounts</p>
            </div>
          </div>
          <div
            className={analyticsStyles.chart}
            aria-label="New customer signups per week"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekly}
                margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  formatter={(value) => [
                    `${value} ${value === 1 ? "signup" : "signups"}`,
                    "New customers",
                  ]}
                  labelFormatter={(label, payload) =>
                    (payload[0]?.payload as { fullLabel?: string } | undefined)
                      ?.fullLabel ?? String(label)
                  }
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipTextStyle}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <CountList
          title="Account status"
          subtitle="New customers by status"
          items={acquisition.byStatus}
        />
      </section>

      <h2 className={analyticsStyles.sectionTitle}>
        Activation
        <span>
          Activated means onboarding is complete and the customer has logged
          savings or completed a habit.
        </span>
      </h2>
      <section className={styles["overview-grid"]}>
        <CountList
          title="First actions"
          subtitle={`Of ${activation.cohortSize} new customers, in any order`}
          items={activation.milestones}
          total={activation.cohortSize}
        />
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Time to value</h2>
              <p>New customers in this window</p>
            </div>
          </div>
          <dl className={analyticsStyles.factList}>
            <div>
              <dt>Activated customers</dt>
              <dd>
                {activation.activated} of {activation.cohortSize}
              </dd>
            </div>
            <div>
              <dt>Median days to finish onboarding</dt>
              <dd>
                {activation.medianDaysToOnboarding === null
                  ? "No one yet"
                  : `${activation.medianDaysToOnboarding} ${
                      activation.medianDaysToOnboarding === 1 ? "day" : "days"
                    }`}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <h2 className={analyticsStyles.sectionTitle}>
        Drop off
        <span>
          Each stage counts only customers who reached every earlier stage.
        </span>
      </h2>
      <section className={styles["overview-grid"]}>
        <article className={`${styles.panel} ${styles["panel--wide"]}`}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Signup funnel</h2>
              <p>Count and share of registered customers at each stage</p>
            </div>
          </div>
          <div
            className={analyticsStyles.funnelChart}
            aria-label="Signup funnel from registration to submitted application"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ top: 0, right: 96, bottom: 0, left: 8 }}
                barSize={24}
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
                  width={200}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  formatter={(value, _name, item) => [
                    `${value} ${value === 1 ? "customer" : "customers"} · ${
                      (item.payload as { share: number }).share
                    }% of registered`,
                    "Reached",
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
                  <LabelList dataKey="display" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <CountList
          title="Onboarding status"
          subtitle="Where new customers are now"
          items={dropOff.onboardingStatus}
        />
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Lapsed and leaving</h2>
              <p>Onboarded customers in this window</p>
            </div>
          </div>
          <dl className={analyticsStyles.factList}>
            <div>
              <dt>Inactive for {dropOff.lapsed.inactiveWindowDays}+ days</dt>
              <dd>
                {dropOff.lapsed.inactiveCustomers} of{" "}
                {dropOff.lapsed.onboardedCustomers} ({lapsedRate}%)
              </dd>
            </div>
            <div>
              <dt>Requested account deletion</dt>
              <dd>{dropOff.deletionRequested}</dd>
            </div>
          </dl>
          <p className={analyticsStyles.note}>
            Activity means a habit completion, savings entry, reflection or sign
            in.
          </p>
        </article>
      </section>
    </main>
  );
}
