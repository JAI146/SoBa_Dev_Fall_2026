"use client";
import { useEffect, useId, useState } from "react";
import {
  adminUsersResponseSchema,
  type AdminUsersResponse,
} from "@purposemint/contracts";
import { apiRequest, ApiError } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { DashboardError } from "@/components/dashboard/dashboard-data-state";
import layout from "@/app/dashboard/dashboard.module.css";
import styles from "@/app/dashboard/notifications/notifications.module.css";

export function CustomerBrowser({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (id: string, name: string) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "6",
          search,
        });
        const result = await apiRequest(
          `/admin/users?${params}`,
          {},
          getToken(),
          adminUsersResponseSchema,
        );
        if (active) setData(result);
      } catch (cause) {
        if (active)
          setError(
            cause instanceof ApiError && cause.status === 403
              ? "You need Users View permission to browse customers. Ask your administrator to enable it."
              : "Could not load customers. Please try again.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [page, search, retry]);
  return (
    <div className={styles.customerBrowser}>
      <form
        className={styles.customerSearch}
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(draft.trim());
        }}
      >
        <label htmlFor={inputId}>
          Search customers
          <input
            id={inputId}
            placeholder="Name or email"
            value={draft}
            maxLength={255}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button className={layout["btn-toolbar-primary"]} type="submit">
          Search
        </button>
        <button
          className={layout["btn-toolbar-primary"]}
          type="button"
          onClick={() => {
            setDraft("");
            setSearch("");
            setPage(1);
          }}
        >
          Reset
        </button>
      </form>
      {error ? (
        <DashboardError message={error} onRetry={() => setRetry(retry + 1)} />
      ) : loading ? (
        <p role="status">Loading customers…</p>
      ) : (
        data && (
          <>
            <p className={styles.muted} role="status">
              {data.total} customer{data.total === 1 ? "" : "s"}
              {search ? " found" : " available"}
            </p>
            {data.items.length ? (
              <ul className={styles.customerList} aria-label="Customers">
                {data.items.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      aria-pressed={value === customer.id}
                      onClick={() =>
                        onSelect(
                          customer.id,
                          customer.displayName ||
                            `${customer.firstName} ${customer.lastName}`,
                        )
                      }
                    >
                      <strong>
                        {customer.displayName ||
                          `${customer.firstName} ${customer.lastName}`}
                      </strong>
                      <span>{customer.email}</span>
                      <small>
                        {value === customer.id
                          ? "Selected"
                          : "View notifications →"}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No customers found. Try another name or reset the search.</p>
            )}
            <div className={styles.pagination} aria-label="Customer pages">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.max(1, data.totalPages)}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
