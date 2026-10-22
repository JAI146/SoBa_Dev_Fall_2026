"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  adminSubscriptionsResponseSchema,
  subscriptionStatusValues,
} from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { formatMoney, formatEnum } from "@/lib/admin-format";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./subscription-management.module.css";
import { apiRoot, dateLabel, Pagination } from "./shared";
import { SubscriptionEditor } from "./subscription-editor";
import { SubscriptionDetail } from "./subscription-detail";

export function SubscriptionsPanel({ canEdit }: { canEdit: boolean }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    planKey: "",
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const path = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    for (const [key, value] of Object.entries(filters))
      if (value) params.set(key, value);
    return `${apiRoot}/subscriptions?${params}`;
  }, [page, filters]);
  const query = useAdminQuery(path, adminSubscriptionsResponseSchema);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPage(1);
    setFilters({
      search: String(form.get("search") ?? "").trim(),
      status: String(form.get("status") ?? ""),
      planKey: String(form.get("planKey") ?? "").trim(),
    });
  }
  if (selected)
    return (
      <SubscriptionDetail
        key={selected}
        id={selected}
        canEdit={canEdit}
        onBack={() => setSelected(null)}
        onChanged={query.reload}
      />
    );
  return (
    <>
      <div className={styles.actions}>
        {canEdit && (
          <button onClick={() => setAssigning(true)}>
            Assign subscription
          </button>
        )}
        <button onClick={() => void query.reload()}>
          Refresh subscriptions
        </button>
      </div>
      <section className={base["crud-card"]}>
        <form className={styles.toolbar} onSubmit={filter}>
          <label>
            Search customers
            <input name="search" placeholder="Name or email" />
          </label>
          <label>
            Status
            <select name="status">
              <option value="">All statuses</option>
              {subscriptionStatusValues.map((value) => (
                <option key={value} value={value}>
                  {formatEnum(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Plan key
            <input name="planKey" placeholder="Any plan" maxLength={20} />
          </label>
          <button className={base["btn-toolbar-primary"]}>Search</button>
        </form>
        {query.error ? (
          <DashboardError
            message={query.error}
            onRetry={() => void query.reload()}
          />
        ) : query.loading || !query.data ? (
          <DashboardLoading label="Loading subscriptions…" />
        ) : (
          <>
            <div className={base["table-wrap"]}>
              <table
                className={`${base["data-table"]} ${styles["compact-table"]}`}
              >
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Renewal</th>
                    <th>Scheduled</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.userName}</strong>
                        <span className={styles["customer-email"]}>
                          {row.userEmail}
                        </span>
                      </td>
                      <td>
                        <strong>{row.planName}</strong>
                        <span>
                          {formatMoney(row.billing.amountCents / 100)} /{" "}
                          {row.billing.cycle}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${base.badge} ${row.status === "active" ? base["badge-active"] : base["badge-inactive"]}`}
                        >
                          {formatEnum(row.status)}
                        </span>
                        <span>
                          {formatEnum(row.paymentStatus)}
                          {row.failedPayments > 0
                            ? ` · ${row.failedPayments} failed`
                            : ""}
                        </span>
                      </td>
                      <td>{dateLabel(row.renewalAt, false)}</td>
                      <td>
                        {row.pendingChange ? (
                          <>
                            <span>
                              {row.pendingChange.action === "cancel"
                                ? "Cancel"
                                : "Plan change"}
                            </span>
                            <span>
                              {dateLabel(row.pendingChange.effectiveAt, false)}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <button
                          className={base["table-link"]}
                          onClick={() => setSelected(row.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!query.data.items.length && (
                    <tr>
                      <td colSpan={6} className={base.empty}>
                        No subscriptions match these filters. Assign a
                        subscription to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={query.data.totalPages}
              total={query.data.total}
              onPage={setPage}
            />
          </>
        )}
      </section>
      {assigning && (
        <SubscriptionEditor
          action="assign"
          onClose={() => setAssigning(false)}
          onSaved={query.reload}
        />
      )}
    </>
  );
}
