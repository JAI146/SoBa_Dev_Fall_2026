"use client";

import Link from "next/link";
import { useI18n } from "@muakhah/i18n";
import type { AdminDashboardOverview } from "@muakhah/contracts";
import {
  activityActionBadgeClass,
  activityActorInitials,
  formatActivityLogTime,
} from "@/lib/activity-log-ui";
import styles from "../../app/dashboard/dashboard.module.css";

const METRIC_TABLE_ROWS = 5;

function formatShortDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, max = 42) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

type MetricCardProps = {
  title: string;
  count: number;
  href: string;
  uniform?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
};

function MetricCard({
  title,
  count,
  href,
  uniform,
  fullWidth,
  children,
}: MetricCardProps) {
  const { t } = useI18n();

  const cardClass = [
    styles.card,
    styles["admin-overview-metric-card"],
    uniform ? styles["admin-overview-metric-card--uniform"] : "",
    fullWidth ? styles["admin-overview-metric-card--full"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className={styles["admin-overview-metric-card__header"]}>
        <div className={styles["admin-overview-metric-card__title-wrap"]}>
          <h3>{title}</h3>
          <span className={styles["admin-overview-metric-card__count"]}>{count}</span>
        </div>
        <Link href={href} className={styles["btn-secondary-inline"]}>
          {t("admin.overview.metricsPanel.viewAll")}
        </Link>
      </div>
      <div className={styles["admin-overview-metric-card__body"]}>{children}</div>
    </div>
  );
}

function MetricsTable({
  headers,
  rows,
  empty,
  fixedRows = false,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
  fixedRows?: boolean;
}) {
  if (!fixedRows) {
    if (rows.length === 0) {
      return <p className={styles["admin-overview-metrics-empty"]}>{empty}</p>;
    }

    return (
      <div className={styles["table-scroll"]}>
        <table className={`${styles["data-table"]} ${styles["admin-overview-metrics-table"]}`}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, index) => (
              <tr key={`${cells[0]}-${index}`}>
                {cells.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const paddedRows = Array.from(
    { length: METRIC_TABLE_ROWS },
    (_, index) => rows[index] ?? null,
  );

  return (
    <div className={styles["admin-overview-metric-card__table-wrap"]}>
      {rows.length === 0 && (
        <p className={styles["admin-overview-metrics-empty-overlay"]}>{empty}</p>
      )}
      <table
        className={`${styles["data-table"]} ${styles["admin-overview-metrics-table"]} ${styles["admin-overview-metrics-table--fixed"]}`}
      >
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddedRows.map((cells, index) => (
            <tr
              key={`row-${index}`}
              className={
                cells ? undefined : styles["admin-overview-metrics-table__placeholder-row"]
              }
            >
              {cells
                ? cells.map((cell, cellIndex) => (
                    <td key={`${cell}-${cellIndex}`}>{cell}</td>
                  ))
                : headers.map((header) => (
                    <td key={`${header}-${index}`} aria-hidden="true">
                      {"\u00A0"}
                    </td>
                  ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminOverviewMetricsPanel({
  overview,
  familyManagerOnly = false,
  systemAdministratorOnly = false,
}: {
  overview: AdminDashboardOverview;
  familyManagerOnly?: boolean;
  systemAdministratorOnly?: boolean;
}) {
  const { t, te, locale } = useI18n();
  const recentLists = overview.recentLists ?? {
    latestSponsors: [],
    latestActiveSponsorships: [],
    latestPendingMessages: [],
    latestProfileUpdateRequests: [],
    latestActivityLogs: [],
    latestChatRooms: [],
    latestTransferProofs: [],
    latestPendingTransferProofs: [],
  };

  return (
    <div className={styles["admin-overview-metrics-stack"]}>
      {familyManagerOnly ? (
        <MetricCard
          title={t("admin.overview.stats.profileUpdateRequestsPending")}
          count={overview.profileUpdateRequestsPending}
          href="/dashboard/admin/profile-update-requests"
          fullWidth
        >
          <MetricsTable
            fixedRows
            empty={t("admin.overview.metricsPanel.empty.profileUpdates")}
            headers={[
              t("admin.overview.metricsPanel.columns.family"),
              t("admin.overview.metricsPanel.columns.field"),
              t("admin.overview.metricsPanel.columns.requested"),
            ]}
            rows={recentLists.latestProfileUpdateRequests.map((item) => [
              item.familyPublicCode,
              item.fieldKey,
              truncate(item.requestedValue),
            ])}
          />
        </MetricCard>
      ) : (
        <>
          <div className={styles["admin-overview-metrics-quad"]}>
            <MetricCard
              title={t("admin.overview.stats.totalSponsors")}
              count={overview.totalSponsors}
              href="/dashboard/admin/donors"
              uniform
            >
              <MetricsTable
                fixedRows
                empty={t("admin.overview.metricsPanel.empty.sponsors")}
                headers={[
                  t("admin.overview.metricsPanel.columns.name"),
                  t("admin.overview.metricsPanel.columns.email"),
                  t("admin.overview.metricsPanel.columns.joined"),
                ]}
                rows={recentLists.latestSponsors.map((item) => [
                  item.fullName,
                  item.email,
                  formatShortDate(item.createdAt, locale),
                ])}
              />
            </MetricCard>

            <MetricCard
              title={t("admin.overview.stats.activeSponsorshipRelationships")}
              count={overview.activeSponsorshipRelationships}
              href="/dashboard/admin/sponsorships"
              uniform
            >
              <MetricsTable
                fixedRows
                empty={t("admin.overview.metricsPanel.empty.sponsorships")}
                headers={[
                  t("admin.overview.metricsPanel.columns.family"),
                  t("admin.overview.metricsPanel.columns.donor"),
                  t("admin.overview.metricsPanel.columns.amount"),
                ]}
                rows={recentLists.latestActiveSponsorships.map((item) => [
                  item.familyPublicCode,
                  item.donorName,
                  `$${item.monthlyAmount.toFixed(2)}`,
                ])}
              />
            </MetricCard>

            {!systemAdministratorOnly && (
              <MetricCard
                title={t("admin.overview.stats.messagesPendingReview")}
                count={overview.messagesPendingReview}
                href="/dashboard/admin/chat"
                uniform
              >
                <MetricsTable
                  fixedRows
                  empty={t("admin.overview.metricsPanel.empty.messages")}
                  headers={[
                    t("admin.overview.metricsPanel.columns.sender"),
                    t("admin.overview.metricsPanel.columns.message"),
                    t("admin.overview.metricsPanel.columns.date"),
                  ]}
                  rows={recentLists.latestPendingMessages.map((item) => [
                    item.senderName,
                    truncate(item.content ?? t("admin.overview.metricsPanel.mediaMessage")),
                    formatShortDate(item.createdAt, locale),
                  ])}
                />
              </MetricCard>
            )}

            <MetricCard
              title={t("admin.overview.stats.profileUpdateRequestsPending")}
              count={overview.profileUpdateRequestsPending}
              href="/dashboard/admin/profile-update-requests"
              uniform
            >
              <MetricsTable
                fixedRows
                empty={t("admin.overview.metricsPanel.empty.profileUpdates")}
                headers={[
                  t("admin.overview.metricsPanel.columns.family"),
                  t("admin.overview.metricsPanel.columns.field"),
                  t("admin.overview.metricsPanel.columns.requested"),
                ]}
                rows={recentLists.latestProfileUpdateRequests.map((item) => [
                  item.familyPublicCode,
                  item.fieldKey,
                  truncate(item.requestedValue),
                ])}
              />
            </MetricCard>
          </div>

          {!systemAdministratorOnly && (
            <MetricCard
              title={t("admin.overview.stats.totalActivityLogs")}
              count={overview.totalActivityLogs}
              href="/dashboard/admin/activity-logs"
              fullWidth
            >
              {recentLists.latestActivityLogs.length === 0 ? (
                <p className={styles["admin-overview-metrics-empty"]}>
                  {t("admin.overview.metricsPanel.empty.activityLogs")}
                </p>
              ) : (
                <div className={styles["table-scroll"]}>
                  <table
                    className={`${styles["data-table"]} ${styles["admin-overview-metrics-table"]}`}
                  >
                    <thead>
                      <tr>
                        <th>{t("admin.activityLogs.actor")}</th>
                        <th>{t("admin.activityLogs.action")}</th>
                        <th>{t("admin.activityLogs.summary")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLists.latestActivityLogs.map((log) => {
                        const when = formatActivityLogTime(log.createdAt, locale);
                        const actionLabel = te("activityAction", log.action);

                        return (
                          <tr key={log.id}>
                            <td>
                              <div className={styles["activity-log-actor"]}>
                                <span className={styles["activity-log-actor__avatar"]}>
                                  {activityActorInitials(log.actorName)}
                                </span>
                                <div>
                                  <div className={styles["activity-log-actor__name"]}>
                                    {log.actorName}
                                  </div>
                                  <div className={styles["activity-log-actor__email"]}>
                                    {when.date}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`${styles["activity-action-badge"]} ${activityActionBadgeClass(log.action)}`}
                              >
                                {actionLabel}
                              </span>
                            </td>
                            <td className={styles["activity-log-summary"]}>
                              {truncate(log.summary, 56)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </MetricCard>
          )}
        </>
      )}
    </div>
  );
}
