"use client";

import { adminCommercialAnalyticsResponseSchema } from "@purposemint/contracts";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  percent,
  tooltipCursor,
  tooltipLabelStyle,
  tooltipStyle,
  tooltipTextStyle,
} from "../analytics-shared";
import analyticsStyles from "../analytics.module.css";

export default function SubscriptionAnalyticsPage() {
  const days = useAnalyticsDays();
  const query = useAdminQuery(
    `/admin/analytics/commercial?days=${days}`,
    adminCommercialAnalyticsResponseSchema,
  );
  const data = query.data;

  // Keep the previous window on screen while a new one loads.
  if (query.error || !data) {
    return (
      <AnalyticsPageState
        error={query.error}
        label="Loading subscriptions…"
        onRetry={() => void query.reload()}
      />
    );
  }
  const { windowDays } = data;
  const { conversions, intents, cancellations, payments } = data;
  const staffAssigned =
    conversions.byAction.find((item) => item.key === "assigned")?.count ?? 0;
  const windowPhrase = `in the last ${windowDays} days`;
  const hasPaymentActivity =
    payments.failedRecords +
      payments.paidRecords +
      payments.pastDueSubscriptions +
      payments.openFailedPayments >
    0;

  return (
    <main
      className={query.loading ? analyticsStyles.refreshing : undefined}
      aria-busy={query.loading}
    >
      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Subscription metrics"
      >
        <DashboardStatCard
          label={`Free to paid · ${windowDays} days`}
          value={
            <>
              {conversions.freeToPaid.toLocaleString()}
              <small className={analyticsStyles.statHint}>
                {conversions.freeToPaid === 0
                  ? `No moves to a paid plan ${windowPhrase}`
                  : `${conversions.freeToPaid - staffAssigned} by customers · ${staffAssigned} assigned by staff`}
              </small>
            </>
          }
          icon="users"
          accent
        />
        <DashboardStatCard
          label="Intent conversion"
          value={
            <>
              {intents.intents === 0 ? "—" : `${intents.conversionRate}%`}
              <small className={analyticsStyles.statHint}>
                {intents.intents === 0
                  ? `No upgrade intents ${windowPhrase}`
                  : `${intents.convertedToPaid} of ${intents.intents} intents now on a paid plan`}
              </small>
            </>
          }
          icon="goals"
        />
        <DashboardStatCard
          label={`Cancellations · ${windowDays} days`}
          value={
            <>
              {cancellations.cancelled.toLocaleString()}
              <small className={analyticsStyles.statHint}>
                {cancellations.cancelled + cancellations.scheduled === 0
                  ? `None ${windowPhrase}`
                  : `${cancellations.scheduled} scheduled · ${formatMoney(cancellations.cancelledMonthlyAmount)}/mo given up`}
              </small>
            </>
          }
          icon="accounts"
        />
        <DashboardStatCard
          label={`Failed payments · ${windowDays} days`}
          value={
            <>
              {payments.failedRecords.toLocaleString()}
              <small className={analyticsStyles.statHint}>
                {payments.failedRecords === 0 &&
                payments.pastDueSubscriptions === 0
                  ? "No failures and nothing past due"
                  : `${formatMoney(payments.failedAmount)} failed · ${payments.pastDueSubscriptions} past due`}
              </small>
            </>
          }
          icon="habits"
        />
      </section>

      <section className={styles["overview-grid"]}>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Upgrade intent conversion</h2>
              <p>
                Intents recorded {windowPhrase}, and how many of those customers
                now pay
              </p>
            </div>
            {intents.intents > 0 ? (
              <ul className={analyticsStyles.legend} aria-label="Series">
                <li>
                  <span className={analyticsStyles.swatchRecent} aria-hidden />
                  Intents
                </li>
                <li>
                  <span className={analyticsStyles.swatchMonth} aria-hidden />
                  Now paid
                </li>
              </ul>
            ) : null}
          </div>
          {intents.intents === 0 ? (
            <p className={styles["panel-empty"]}>
              No upgrade intents {windowPhrase}.
            </p>
          ) : (
            <div
              className={analyticsStyles.habitChart}
              aria-label="Upgrade intents and paid conversions by plan"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={intents.byPlan}
                  margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                  barGap={4}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 4" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={tooltipCursor}
                    formatter={(value, name, item) => {
                      const row =
                        item.payload as (typeof intents.byPlan)[number];
                      return [
                        item.dataKey === "converted"
                          ? `${value} of ${row.intents} (${percent(row.converted, row.intents)}%)`
                          : `${value}`,
                        name,
                      ];
                    }}
                    itemSorter={(item) => (item.dataKey === "intents" ? 0 : 1)}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipTextStyle}
                  />
                  <Bar
                    dataKey="intents"
                    name="Intents"
                    className={analyticsStyles.seriesRecent}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="converted"
                    name="Now paid"
                    className={analyticsStyles.seriesMonth}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <CountList
          title="Free to paid by plan"
          subtitle={`Moves from a free plan to a paid one ${windowPhrase}`}
          items={conversions.byPlan}
          emptyMessage={`No customers moved to a paid plan ${windowPhrase}.`}
        />

        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Cancellations by plan</h2>
              <p>
                Cancelled, or scheduled to cancel at renewal, {windowPhrase}
              </p>
            </div>
            {cancellations.cancelled + cancellations.scheduled > 0 ? (
              <ul className={analyticsStyles.legend} aria-label="Series">
                <li>
                  <span className={analyticsStyles.swatchRecent} aria-hidden />
                  Cancelled
                </li>
                <li>
                  <span className={analyticsStyles.swatchMonth} aria-hidden />
                  Scheduled
                </li>
              </ul>
            ) : null}
          </div>
          {cancellations.cancelled + cancellations.scheduled === 0 ? (
            <p className={styles["panel-empty"]}>
              No cancellations {windowPhrase}.
            </p>
          ) : (
            <div
              className={analyticsStyles.habitChart}
              aria-label="Cancelled and scheduled cancellations by plan"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cancellations.byPlan}
                  margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                  barGap={4}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 4" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={tooltipCursor}
                    formatter={(value, name) => [
                      `${value} ${value === 1 ? "subscription" : "subscriptions"}`,
                      name,
                    ]}
                    itemSorter={(item) =>
                      item.dataKey === "cancelled" ? 0 : 1
                    }
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipTextStyle}
                  />
                  <Bar
                    dataKey="cancelled"
                    name="Cancelled"
                    className={analyticsStyles.seriesRecent}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="scheduled"
                    name="Scheduled"
                    className={analyticsStyles.seriesMonth}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Payment health</h2>
              <p>Billing records {windowPhrase}; past due as of today</p>
            </div>
          </div>
          {hasPaymentActivity ? (
            <dl className={analyticsStyles.factList}>
              <div>
                <dt>Failed payments</dt>
                <dd>
                  {payments.failedRecords} ·{" "}
                  {formatMoney(payments.failedAmount)}
                </dd>
              </div>
              <div>
                <dt>Successful payments</dt>
                <dd>
                  {payments.paidRecords} · {formatMoney(payments.paidAmount)}
                </dd>
              </div>
              <div>
                <dt>Past due subscriptions</dt>
                <dd>
                  {payments.pastDueSubscriptions} ·{" "}
                  {formatMoney(payments.pastDueMonthlyAmount)}/mo
                </dd>
              </div>
              <div>
                <dt>Failed payments on open subscriptions</dt>
                <dd>{payments.openFailedPayments}</dd>
              </div>
            </dl>
          ) : (
            <p className={styles["panel-empty"]}>
              No billing records {windowPhrase} and no past due subscriptions.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
