"use client";
import { notificationLabel } from "@/lib/notification-display";
import { useState } from "react";
import {
  coachingOperationsResponseSchema,
  coachingEventSchema,
  coachingGenerationSchema,
  coachingFlagSchema,
  coachingSourceSchema,
  notificationStatusSchema,
} from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import { formatEnum, formatAdminDateTime } from "@/lib/admin-format";
import layout from "../dashboard.module.css";
import styles from "../notifications/notifications.module.css";
export default function CoachingOperationsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const params = new URLSearchParams({ page: String(page) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = useAdminQuery(
    `/admin/coaching-operations?${params}`,
    coachingOperationsResponseSchema,
  );
  const data = query.data;
  const fields = [
    {
      key: "eventType",
      label: "Message type",
      options: coachingEventSchema.options,
    },
    {
      key: "generationStatus",
      label: "Message status",
      options: coachingGenerationSchema.options,
    },
    {
      key: "deliveryStatus",
      label: "Delivery status",
      options: notificationStatusSchema.options,
    },
    {
      key: "safetyFlag",
      label: "Review flag",
      options: coachingFlagSchema.options,
    },
    {
      key: "source",
      label: "Data source",
      options: coachingSourceSchema.options,
    },
  ];
  return (
    <main className={`${layout["dashboard-page"]} ${styles.page}`}>
      <header className={layout["page-header"]}>
        <div>
          <p className={layout.eyebrow}>Coaching operations</p>
          <h1>KiroMoney</h1>
        </div>
        <button
          className={layout["btn-toolbar-primary"]}
          disabled={query.loading}
          onClick={() => void query.reload()}
        >
          Refresh
        </button>
      </header>
      <div className={styles.connectionStrip}>
        <span className={`${styles.badge} ${styles.blocked}`}>
          KiroMoney not connected
        </span>
        <span>Private conversations are not shown.</span>
      </div>
      {query.error && (
        <p className={styles.error} role="alert">
          {query.error}
        </p>
      )}
      {query.loading && <p role="status">Loading KiroMoney operations…</p>}
      {data && (
        <>
          <section className={layout.panel} aria-labelledby="service-status">
            <h2 id="service-status">Service observation</h2>
            <p>
              <strong>{formatEnum(data.service.status)}</strong> ·{" "}
              {data.service.source === "staff_report"
                ? "Staff observation"
                : "Not connected"}
            </p>
            {data.service.checkedAt && (
              <p className={styles.muted}>
                Last checked:{" "}
                {formatAdminDateTime(data.service.checkedAt, null)} UTC
                {data.service.stale ? " · Report expired" : " · Staff report"}
              </p>
            )}
          </section>
          <section
            className={styles.metrics}
            aria-label="All coaching operation totals"
          >
            {[
              ["Total records", data.counts.total],
              ["Generated", data.counts.generated],
              ["Failed", data.counts.failed],
              ["Needs review", data.counts.reviewRequired],
            ].map(([label, count]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </section>
          <p className={styles.muted}>
            All activity, including labelled test data.
          </p>
          <div className={styles.filters}>
            {fields.map((field) => (
              <label key={field.key}>
                {field.label}
                <select
                  value={filters[field.key] ?? ""}
                  onChange={(event) => {
                    setFilters((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }));
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {notificationLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {Object.values(filters).some(Boolean) && (
            <button
              type="button"
              className={layout["btn-toolbar-primary"]}
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
          <section className={layout.panel} aria-labelledby="operation-records">
            <h2 id="operation-records">Recent coaching activity</h2>
            <div className={layout["table-wrap"]}>
              <table className={`${layout["data-table"]} ${styles.table}`}>
                <thead>
                  <tr>
                    <th>Message type</th>
                    <th>Generation</th>
                    <th>Delivery</th>
                    <th>Issue</th>
                    <th>Review flags</th>
                    <th>Source / updated (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className={layout.empty}>
                        {data.total === 0 &&
                        !Object.values(filters).some(Boolean)
                          ? "No coaching activity yet. Activity will appear when KiroMoney is connected."
                          : "No records match these filters."}
                      </td>
                    </tr>
                  )}
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Message type">
                        <strong>{formatEnum(item.eventType)}</strong>
                        <details className={styles.help}>
                          <summary>Record details</summary>
                          <small className={styles.userId}>{item.id}</small>
                          <small>
                            Created: {formatAdminDateTime(item.createdAt, null)}{" "}
                            UTC
                          </small>
                        </details>
                      </td>
                      <td data-label="Generation">
                        {formatEnum(item.generationStatus)}
                      </td>
                      <td data-label="Delivery">
                        <span
                          className={`${styles.badge} ${styles[item.deliveryStatus]}`}
                        >
                          {notificationLabel(item.deliveryStatus)}
                        </span>
                      </td>
                      <td data-label="Issue">
                        {item.errorCode
                          ? notificationLabel(item.errorCode)
                          : "None recorded"}
                      </td>
                      <td data-label="Review flags">
                        {item.safetyFlags.length
                          ? item.safetyFlags.map((flag) => (
                              <span
                                className={`${styles.badge} ${styles.blocked}`}
                                key={flag}
                              >
                                {notificationLabel(flag)}
                              </span>
                            ))
                          : "None recorded"}
                      </td>
                      <td data-label="Source / updated (UTC)">
                        <strong>{notificationLabel(item.source)}</strong>

                        <small>
                          Updated: {formatAdminDateTime(item.updatedAt, null)}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>
                {data.total} matching records · Page {page} of{" "}
                {Math.max(1, Math.ceil(data.total / 20))}
              </span>
              <button
                disabled={query.loading || page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                disabled={query.loading || page * 20 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
