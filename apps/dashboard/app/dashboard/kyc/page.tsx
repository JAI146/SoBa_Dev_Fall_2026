"use client";

import {
  adminKycResponseSchema,
  kycStatusValues,
  type AdminKycItem,
  type KycStatusValue,
} from "@purposemint/contracts";
import { type FormEvent, useMemo, useState } from "react";
import { Dialog } from "@/components/common/dialog";
import { SearchIcon } from "@/components/dashboard/action-icons";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { formatAdminDateTime, formatEnum } from "@/lib/admin-format";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../dashboard.module.css";

const PAGE_SIZE = 20;

const BADGE_BY_STATUS: Record<KycStatusValue, string> = {
  not_started: "badge-inactive",
  in_progress: "badge-invited",
  verified: "badge-active",
  failed: "badge-danger",
  requires_action: "badge-warning",
  under_review: "badge-warning",
};

export default function KycPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [stuckOnly, setStuckOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [escalating, setEscalating] = useState<AdminKycItem | null>(null);
  const [note, setNote] = useState("");

  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (stuckOnly) params.set("stuck", "true");
    return `/admin/kyc?${params.toString()}`;
  }, [page, search, status, stuckOnly]);
  const query = useAdminQuery(path, adminKycResponseSchema);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function runAction(
    userId: string,
    action: "retry" | "escalate",
    body?: unknown,
  ) {
    setBusyUserId(userId);
    setActionError(null);
    setMessage(null);
    try {
      await apiRequest(
        `/admin/kyc/${encodeURIComponent(userId)}/${action}`,
        {
          method: "POST",
          body: body === undefined ? undefined : JSON.stringify(body),
        },
        getToken(),
      );
      setMessage(
        action === "retry"
          ? "Verification retry started."
          : "Case escalated for review.",
      );
      await query.reload();
      return true;
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "The action failed.",
      );
      return false;
    } finally {
      setBusyUserId(null);
    }
  }

  async function submitEscalation(event: FormEvent) {
    event.preventDefault();
    if (!escalating) return;
    if (await runAction(escalating.user.id, "escalate", { note })) {
      setEscalating(null);
      setNote("");
    }
  }

  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading && !query.data)
    return <DashboardLoading label="Loading onboarding and KYC…" />;
  if (!query.data) return null;
  const data = query.data;

  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Customer operations</p>
          <h1>Onboarding &amp; KYC</h1>
          <p>
            Track identity verification, find stalled customers, and resolve
            cases. Verification data is simulated until a provider is connected.
          </p>
        </div>
      </div>
      {message ? (
        <p className={styles["notice-banner"]} role="status">
          {message}
        </p>
      ) : null}
      {actionError ? (
        <p className={styles["notice-banner"]} role="alert">
          {actionError}
        </p>
      ) : null}
      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Verification status counts"
      >
        {data.summary.counts.map((group) => (
          <DashboardStatCard
            key={group.key}
            label={group.label}
            value={group.count.toLocaleString()}
            icon="accounts"
          />
        ))}
        <DashboardStatCard
          label={`Stuck (>${data.summary.stuckAfterDays} days)`}
          value={data.summary.stuck.toLocaleString()}
          icon="accounts"
          accent
        />
      </section>
      <section className={`${styles["crud-card"]} ${styles["section-spaced"]}`}>
        <form className={styles["kyc-filters"]} onSubmit={submitSearch}>
          <label className={styles["search-field"]}>
            <span className="sr-only">Search customers</span>
            <SearchIcon />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name or email"
            />
          </label>
          <label className={styles["filter-field"]}>
            Status
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              <option value="">All statuses</option>
              {kycStatusValues.map((value) => (
                <option key={value} value={value}>
                  {formatEnum(value)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles["filter-field"]}>
            Show
            <select
              value={stuckOnly ? "stuck" : "all"}
              onChange={(event) => {
                setPage(1);
                setStuckOnly(event.target.value === "stuck");
              }}
            >
              <option value="all">All customers</option>
              <option value="stuck">Stuck only</option>
            </select>
          </label>
          <button type="submit" className={styles["btn-toolbar-primary"]}>
            Search
          </button>
        </form>
        <div className={styles["table-wrap"]}>
          <table className={styles["data-table"]}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Verification</th>
                <th>Details</th>
                <th>Last change</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.user.id}>
                  <td>
                    <strong>{item.user.name}</strong>
                    <span>{item.user.email}</span>
                  </td>
                  <td>
                    <div className={styles["badge-list"]}>
                      <span
                        className={`${styles.badge} ${styles[BADGE_BY_STATUS[item.status]]}`}
                      >
                        {formatEnum(item.status)}
                      </span>
                      {item.isStuck ? (
                        <span
                          className={`${styles.badge} ${styles["badge-danger"]}`}
                        >
                          Stuck
                        </span>
                      ) : null}
                      {item.escalatedAt ? (
                        <span
                          className={`${styles.badge} ${styles["badge-warning"]}`}
                        >
                          Escalated
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className={styles["kyc-detail"]}>
                      {item.failureReason ? (
                        <span>
                          <strong>{formatEnum(item.failureCode ?? "")}</strong>
                          {" — "}
                          {item.failureReason}
                        </span>
                      ) : null}
                      {item.escalationNote ? (
                        <span>Escalation: {item.escalationNote}</span>
                      ) : null}
                      <span>
                        Attempts: {item.attemptCount} · Provider:{" "}
                        {item.provider}
                      </span>
                    </div>
                  </td>
                  <td>
                    {item.statusChangedAt
                      ? formatAdminDateTime(
                          item.statusChangedAt,
                          item.user.timeZone,
                        )
                      : "—"}
                  </td>
                  <td>
                    <div className={styles["kyc-actions"]}>
                      <button
                        type="button"
                        className={styles["btn-toolbar-primary"]}
                        disabled={!item.canRetry || busyUserId === item.user.id}
                        onClick={() => void runAction(item.user.id, "retry")}
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        className={styles["btn-toolbar-primary"]}
                        disabled={
                          item.status === "verified" ||
                          !!item.escalatedAt ||
                          busyUserId === item.user.id
                        }
                        onClick={() => {
                          setNote("");
                          setEscalating(item);
                        }}
                      >
                        Escalate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No customers match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <span>{data.total.toLocaleString()} customers</span>
          <div>
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      <Dialog
        open={!!escalating}
        title="Escalate verification case"
        onClose={() => {
          if (!busyUserId) setEscalating(null);
        }}
      >
        <form className={styles["role-form"]} onSubmit={submitEscalation}>
          <label>
            Note for the reviewer
            <textarea
              required
              maxLength={1000}
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Describe what was tried and what is blocking the customer."
            />
          </label>
          <div className={styles["form-actions"]}>
            <button
              type="button"
              disabled={!!busyUserId}
              onClick={() => setEscalating(null)}
            >
              Cancel
            </button>
            <button type="submit" disabled={!!busyUserId || !note.trim()}>
              Escalate
            </button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
