"use client";

import { adminPathwayAnalyticsResponseSchema } from "@purposemint/contracts";
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
import { formatMoney } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../../dashboard.module.css";
import {
  AnalyticsPageState,
  categoryTick,
  useAnalyticsRange,
  CountList,
  pathwayTitle,
  tooltipCursor,
  tooltipLabelStyle,
  tooltipStyle,
  tooltipTextStyle,
} from "../analytics-shared";
import analyticsStyles from "../analytics.module.css";

export default function PathwayAnalyticsPage() {
  const {
    query: rangeQuery,
    label: windowLabel,
    phrase: windowPhrase,
  } = useAnalyticsRange();
  const query = useAdminQuery(
    `/admin/analytics/pathways?${rangeQuery}`,
    adminPathwayAnalyticsResponseSchema,
  );
  const data = query.data;

  // Keep the previous window on screen while a new one loads.
  if (query.error || !data) {
    return (
      <AnalyticsPageState
        error={query.error}
        label="Loading pathways and plans…"
        onRetry={() => void query.reload()}
      />
    );
  }
  const { applications, checklist, partners, eligibility, premium } = data;
  const submittedApplications =
    applications.byStatus.find((item) => item.key === "submitted")?.count ?? 0;
  const draftApplications =
    applications.byStatus.find((item) => item.key === "draft")?.count ?? 0;
  const chosenPartners = partners.byPartner.filter(
    (item) => item.count > 0,
  ).length;
  // Demo levels mean the mock seed is loaded, and its savings are small.
  const seededData = data.demoLevelsPresent;

  return (
    <main
      className={query.loading ? analyticsStyles.refreshing : undefined}
      aria-busy={query.loading}
    >
      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Pathway and plan metrics"
      >
        <DashboardStatCard
          label={`Applications · ${windowLabel}`}
          value={
            <>
              {applications.total.toLocaleString()}
              <small className={analyticsStyles.statHint}>
                {submittedApplications} submitted · {draftApplications} draft
              </small>
            </>
          }
          icon="accounts"
          accent
        />
        <DashboardStatCard
          label="Checklists complete"
          value={
            <>
              {checklist.fullyComplete} of {checklist.applications}
              <small className={analyticsStyles.statHint}>
                {checklist.averageProgress}% average progress
              </small>
            </>
          }
          icon="goals"
        />
        <DashboardStatCard
          label="Partner selections"
          value={
            <>
              {partners.selections.toLocaleString()}
              <small className={analyticsStyles.statHint}>
                {chosenPartners} of {partners.byPartner.length} partners chosen
              </small>
            </>
          }
          icon="users"
        />
        <DashboardStatCard
          label="Customers on a paid plan"
          value={
            <>
              {premium.paidCustomers.toLocaleString()}
              <small className={analyticsStyles.statHint}>
                {premium.paidRate}% of customers · {premium.newPaidInWindow}{" "}
                moved to paid {windowPhrase}
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
              <h2>Applications by pathway</h2>
              <p>Started {windowPhrase}, by status</p>
            </div>
            <ul className={analyticsStyles.legend} aria-label="Statuses">
              <li>
                <span className={analyticsStyles.swatchMonth} aria-hidden />
                Submitted
              </li>
              <li>
                <span className={analyticsStyles.swatchRecent} aria-hidden />
                Draft
              </li>
            </ul>
          </div>
          <div
            className={`${analyticsStyles.habitChart} ${analyticsStyles.goalChart}`}
            aria-label="Pathway applications by pathway and status"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={applications.byPathway}
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
                  width={200}
                  tick={categoryTick(200)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  formatter={(value, name) => [
                    `${value} ${value === 1 ? "application" : "applications"}`,
                    name,
                  ]}
                  itemSorter={(item) => (item.dataKey === "submitted" ? 0 : 1)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipTextStyle}
                />
                <Bar
                  dataKey="submitted"
                  name="Submitted"
                  stackId="status"
                  className={analyticsStyles.seriesMonth}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="draft"
                  name="Draft"
                  stackId="status"
                  className={analyticsStyles.seriesRecent}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Partner selections</h2>
              <p>Partners chosen on applications in this window</p>
            </div>
          </div>
          <div
            className={`${analyticsStyles.chart} ${analyticsStyles.goalChart} ${analyticsStyles.partnerChart}`}
            aria-label="Partner selections by partner"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={partners.byPartner}
                layout="vertical"
                margin={{ top: 0, right: 32, bottom: 0, left: 8 }}
                barSize={16}
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
                  width={210}
                  tick={categoryTick(210)}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  formatter={(value, _name, item) => {
                    const row =
                      item.payload as (typeof partners.byPartner)[number];
                    return [
                      `${value} ${value === 1 ? "selection" : "selections"}`,
                      `${row.partnerType} · ${pathwayTitle(applications.byPathway, row.pathwayKey)}`,
                    ];
                  }}
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
          title="Partners by type"
          subtitle="Selections grouped by partner type"
          items={partners.byType}
        />

        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Pathway eligibility</h2>
              <p>
                Customers whose savings on active, pathway eligible goals meet
                each minimum, as of today
              </p>
            </div>
            {seededData ? (
              <span
                className={`${styles["demo-label"]} ${analyticsStyles.badge}`}
              >
                Demo data
              </span>
            ) : null}
          </div>
          {seededData ? (
            <p className={analyticsStyles.note}>
              Seeded savings are low, so few demo customers reach the larger
              minimums. Expect these counts to rise with real savings.
            </p>
          ) : null}
          <div
            className={`${analyticsStyles.chart} ${analyticsStyles.goalChart}`}
            aria-label="Customers meeting each pathway's savings minimum"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eligibility.byPathway}
                layout="vertical"
                margin={{ top: 0, right: 32, bottom: 0, left: 8 }}
                barSize={20}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 4" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, eligibility.customersWithEligibleGoals || 1]}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={200}
                  tick={categoryTick(200)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  formatter={(value, _name, item) => [
                    `${value} of ${eligibility.customersWithEligibleGoals} customers with active eligible goals`,
                    `${formatMoney(
                      (item.payload as { minimumAmount: number }).minimumAmount,
                    )} minimum`,
                  ]}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipTextStyle}
                />
                <Bar
                  dataKey="eligibleCustomers"
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="eligibleCustomers" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <CountList
          title="Paid plans"
          subtitle={`${premium.paidCustomers} of ${premium.totalCustomers} customers on an active or past due paid subscription`}
          items={premium.byPlan.map((plan) => ({
            key: plan.key,
            label: `${plan.label} · ${formatMoney(plan.priceMonthly)}/mo`,
            count: plan.count,
          }))}
          total={premium.totalCustomers}
        />
      </section>
    </main>
  );
}
