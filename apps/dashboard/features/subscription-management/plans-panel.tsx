"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  adminPlansResponseSchema,
  type AdminPlan,
} from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import { formatMoney } from "@/lib/admin-format";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./subscription-management.module.css";
import { apiRoot, dateLabel, Pagination } from "./shared";
import { PlanEditor } from "./plan-editor";

export function PlansPanel({ canManagePlans }: { canManagePlans: boolean }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", active: "" });
  const [editor, setEditor] = useState<AdminPlan | "new" | null>(null);
  const path = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (filters.search) params.set("search", filters.search);
    if (filters.active) params.set("active", filters.active);
    return `${apiRoot}/plans?${params}`;
  }, [page, filters]);
  const query = useAdminQuery(path, adminPlansResponseSchema);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPage(1);
    setFilters({
      search: String(form.get("search") ?? "").trim(),
      active: String(form.get("active") ?? ""),
    });
  }
  return (
    <>
      <div className={styles.actions}>
        {canManagePlans && (
          <button onClick={() => setEditor("new")}>Create plan</button>
        )}
        <button onClick={() => void query.reload()}>Refresh plans</button>
      </div>
      <section className={base["crud-card"]}>
        <form className={styles.toolbar} onSubmit={filter}>
          <label>
            Search plans
            <input name="search" placeholder="Plan name or key" />
          </label>
          <label>
            Status
            <select name="active">
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <button className={base["btn-toolbar-primary"]}>Search</button>
        </form>
        {query.error ? (
          <DashboardError
            message={query.error}
            onRetry={() => void query.reload()}
          />
        ) : query.loading || !query.data ? (
          <DashboardLoading label="Loading plans…" />
        ) : (
          <>
            <div className={base["table-wrap"]}>
              <table
                className={`${base["data-table"]} ${styles["compact-table"]}`}
              >
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Monthly / yearly</th>
                    <th>Status</th>
                    <th>Availability</th>
                    <th>Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((plan) => (
                    <tr key={plan.key}>
                      <td>
                        <strong>
                          {plan.name}
                          {plan.isDefault ? " · Default" : ""}
                        </strong>
                      </td>
                      <td>
                        <div className={styles["plan-prices"]}>
                          {(["monthly", "yearly"] as const).map((cycle) => (
                            <div key={cycle} className={styles["price-row"]}>
                              <span className={styles["price-cycle"]}>
                                {cycle === "monthly" ? "Monthly" : "Yearly"}
                              </span>
                              <span
                                className={
                                  plan.billingCycles.includes(cycle)
                                    ? styles["price-value"]
                                    : styles["price-unavailable"]
                                }
                              >
                                {plan.billingCycles.includes(cycle)
                                  ? formatMoney(
                                      cycle === "monthly"
                                        ? plan.priceMonthly
                                        : plan.priceYearly,
                                    )
                                  : "Not offered"}
                              </span>
                            </div>
                          ))}
                        </div>
                        {plan.promotion && (
                          <span>
                            Promo until{" "}
                            {dateLabel(plan.promotion.endsAt, false)}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${base.badge} ${plan.active ? base["badge-active"] : base["badge-inactive"]}`}
                        >
                          {plan.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        {plan.available ? "Available" : "Unavailable"}
                        {plan.availableFrom && (
                          <span>
                            From {dateLabel(plan.availableFrom, false)}
                          </span>
                        )}
                        {plan.availableUntil && (
                          <span>
                            Until {dateLabel(plan.availableUntil, false)}
                          </span>
                        )}
                      </td>
                      <td>{plan.sortOrder}</td>
                      <td>
                        {canManagePlans ? (
                          <button
                            className={base["table-link"]}
                            onClick={() => setEditor(plan)}
                          >
                            Edit
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                  {!query.data.items.length && (
                    <tr>
                      <td colSpan={6} className={base.empty}>
                        No plans match these filters. Create a plan to get
                        started.
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
      {editor && (
        <PlanEditor
          key={editor === "new" ? "new" : `${editor.key}:${editor.version}`}
          plan={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={query.reload}
        />
      )}
    </>
  );
}
