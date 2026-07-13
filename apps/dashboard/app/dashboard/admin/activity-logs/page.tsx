"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { ActivityLogListItem } from "@muakhah/contracts";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { apiRequest } from "@/lib/api-client";
import {
  activityActionBadgeClass,
  activityActorInitials,
  formatActivityLogTime,
} from "@/lib/activity-log-ui";
import {
  ACTIVITY_LOG_ACTION_OPTIONS,
  ACTIVITY_LOG_ENTITY_TYPES,
  buildActivityLogQuery,
  EMPTY_ACTIVITY_LOG_FILTERS,
  hasActiveActivityLogFilters,
  type ActivityLogFilters,
} from "@/lib/activity-log-filters";
import { getToken } from "@/lib/auth";
import { downloadCsv } from "@/lib/export-csv";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

const PAGE_SIZE = 50;

export default function AdminActivityLogsPage() {
  const { t, te, locale } = useI18n();
  const [logs, setLogs] = useState<ActivityLogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ActivityLogFilters>(
    EMPTY_ACTIVITY_LOG_FILTERS,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  const loadLogs = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const token = getToken();
        if (!token) throw new Error(t("admin.activityLogs.loadFailed"));
        const query = buildActivityLogQuery(filters, page, PAGE_SIZE);
        const data = await apiRequest<{ logs: ActivityLogListItem[]; total: number }>(
          `/admin/activity-logs?${query}`,
          {},
          token,
        );
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("admin.activityLogs.loadFailed"),
        );
      } finally {
        if (opts?.silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [filters, page, t],
  );

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  function updateFilter<K extends keyof ActivityLogFilters>(
    key: K,
    value: ActivityLogFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_ACTIVITY_LOG_FILTERS);
    setPage(1);
  }

  const emptyMessage = useMemo(() => {
    if (!hasActiveActivityLogFilters(filters)) {
      return t("admin.activityLogs.empty");
    }
    return t("admin.activityLogs.noFilterResults");
  }, [filters, t]);

  function exportLogsCsv() {
    const headers = [
      t("admin.activityLogs.time"),
      t("admin.activityLogs.actor"),
      t("admin.activityLogs.action"),
      t("admin.activityLogs.summary"),
    ];
    const rows = logs.map((log) => {
      const when = formatActivityLogTime(log.createdAt, locale);
      return [
        `${when.date} ${when.time}`,
        `${log.actorName} (${log.actorEmail})`,
        te("activityAction", log.action),
        log.summary,
      ];
    });
    downloadCsv(
      `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    );
  }

  return (
    <>
      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("admin.activityLogs.title")}</h1>
          <p className={styles["page-description"]}>
            {t("admin.activityLogs.description")}
          </p>
        </div>
        <ListToolbar
          onRefresh={() => void loadLogs({ silent: true })}
          onExport={exportLogsCsv}
          exportDisabled={logs.length === 0}
          refreshing={refreshing || loading}
        />
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className={`${styles.card} ${styles["card-wide"]} ${styles["activity-log-card"]}`}>
        <div className={styles["activity-log-card__header"]}>
          <div>
            <h2 className={styles["section-title"]} style={{ marginBottom: "0.25rem" }}>
              {t("admin.activityLogs.listTitle", { total: String(total) })}
            </h2>
            <p className={styles["form-hint"]}>
              {t("admin.activityLogs.listSubtitle", {
                page: String(page),
                totalPages: String(totalPages),
              })}
            </p>
          </div>
        </div>

        <div className={styles["filter-bar"]}>
          <div className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}>
            <label htmlFor="activity-log-search">{t("filters.search")}</label>
            <input
              id="activity-log-search"
              type="search"
              value={filters.search}
              placeholder={t("admin.activityLogs.searchPlaceholder")}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="activity-log-action">{t("admin.activityLogs.action")}</label>
            <select
              id="activity-log-action"
              value={filters.action}
              onChange={(e) => updateFilter("action", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              {ACTIVITY_LOG_ACTION_OPTIONS.map((action) => (
                <option key={action} value={action}>
                  {te("activityAction", action)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="activity-log-entity">{t("admin.activityLogs.entityType")}</label>
            <select
              id="activity-log-entity"
              value={filters.entityType}
              onChange={(e) => updateFilter("entityType", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              {ACTIVITY_LOG_ENTITY_TYPES.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {te("activityEntityType", entityType)}
                </option>
              ))}
            </select>
          </div>
          {hasActiveActivityLogFilters(filters) && (
            <div className={styles["filter-actions"]}>
              <button
                type="button"
                className={styles["btn-filter-clear"]}
                onClick={clearFilters}
              >
                {t("filters.clear")}
              </button>
            </div>
          )}
        </div>

        {loading && !refreshing && (
          <p className={styles["empty-state"]}>{t("common.loading")}</p>
        )}

        {!loading && logs.length === 0 && (
          <p className={styles["empty-state"]}>{emptyMessage}</p>
        )}

        {!loading && logs.length > 0 && (
          <>
            <div className={styles["table-scroll"]}>
              <table className={`${styles["data-table"]} ${styles["activity-log-table"]}`}>
                <thead>
                  <tr>
                    <th>{t("admin.activityLogs.time")}</th>
                    <th>{t("admin.activityLogs.actor")}</th>
                    <th>{t("admin.activityLogs.action")}</th>
                    <th>{t("admin.activityLogs.summary")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const when = formatActivityLogTime(log.createdAt, locale);
                    const actionLabel = te("activityAction", log.action);
                    return (
                      <tr key={log.id}>
                        <td>
                          <div className={styles["activity-log-time"]}>
                            <span className={styles["activity-log-time__date"]}>
                              {when.date}
                            </span>
                            <span className={styles["activity-log-time__clock"]}>
                              {when.time}
                            </span>
                          </div>
                        </td>
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
                                {log.actorEmail}
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
                        <td className={styles["activity-log-summary"]}>{log.summary}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles["activity-log-pagination"]}>
              <button
                type="button"
                className={styles["btn-secondary-inline"]}
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("admin.activityLogs.prev")}
              </button>
              <span className={styles["activity-log-pagination__meta"]}>
                {t("admin.activityLogs.page", { page: String(page) })} ·{" "}
                {t("admin.activityLogs.pageOf", { totalPages: String(totalPages) })}
              </span>
              <button
                type="button"
                className={styles["btn-secondary-inline"]}
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("admin.activityLogs.next")}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
