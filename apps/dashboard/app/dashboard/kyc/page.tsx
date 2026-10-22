"use client";

import {
  adminKycHistoryResponseSchema,
  adminKycResponseSchema,
  kycStatusValues,
  type AdminKycHistoryResponse,
  type AdminKycItem,
  type KycStatusValue,
} from "@purposemint/contracts";
import {
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const POPOVER_WIDTH = 320;

function popoverPosition(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  return {
    top: rect.bottom + 6,
    left: Math.max(
      8,
      Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8),
    ),
  };
}

export default function KycPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [show, setShow] = useState<"all" | "stuck" | "escalated">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [escalating, setEscalating] = useState<AdminKycItem | null>(null);
  const [resolving, setResolving] = useState<AdminKycItem | null>(null);
  const [outcome, setOutcome] = useState("not_started");
  const [resolveNote, setResolveNote] = useState("");
  const [note, setNote] = useState("");
  const [messageView, setMessageView] = useState<{
    item: AdminKycItem;
    top: number;
    left: number;
  } | null>(null);
  const messagePopoverRef = useRef<HTMLDivElement>(null);
  const [historyFor, setHistoryFor] = useState<AdminKycItem | null>(null);
  const [history, setHistory] = useState<AdminKycHistoryResponse | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const messageAnchorRef = useRef<HTMLElement | null>(null);
  const messageOpen = messageView !== null;

  useEffect(() => {
    if (!messageOpen) return;
    function reposition() {
      const anchor = messageAnchorRef.current;
      if (!anchor?.isConnected) {
        setMessageView(null);
        return;
      }
      const { top, left } = popoverPosition(anchor);
      setMessageView((current) =>
        current ? { ...current, top, left } : current,
      );
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (messagePopoverRef.current?.contains(target)) return;
      if (messageAnchorRef.current?.contains(target)) return;
      setMessageView(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMessageView(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [messageOpen]);

  function toggleMessage(
    event: ReactMouseEvent<HTMLButtonElement>,
    item: AdminKycItem,
  ) {
    if (messageView?.item.user.id === item.user.id) {
      setMessageView(null);
      return;
    }
    messageAnchorRef.current = event.currentTarget;
    setMessageView({ item, ...popoverPosition(event.currentTarget) });
  }

  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (show === "stuck") params.set("stuck", "true");
    if (show === "escalated") params.set("escalated", "true");
    return `/admin/kyc?${params.toString()}`;
  }, [page, search, status, show]);
  const query = useAdminQuery(path, adminKycResponseSchema);

  async function openHistory(item: AdminKycItem) {
    setHistoryFor(item);
    setHistory(null);
    setHistoryError(null);
    try {
      setHistory(
        await apiRequest(
          `/admin/kyc/${encodeURIComponent(item.user.id)}/history`,
          {},
          getToken(),
          adminKycHistoryResponseSchema,
        ),
      );
    } catch (cause) {
      setHistoryError(
        cause instanceof Error ? cause.message : "Could not load the history.",
      );
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function runAction(
    userId: string,
    action: "retry" | "escalate" | "resolve",
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
          : action === "escalate"
            ? "Case escalated for review."
            : "Escalated case resolved.",
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

  async function submitResolution(event: FormEvent) {
    event.preventDefault();
    if (!resolving) return;
    const body = {
      outcome,
      ...(resolveNote.trim() ? { note: resolveNote.trim() } : {}),
    };
    if (await runAction(resolving.user.id, "resolve", body)) {
      setResolving(null);
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
        <DashboardStatCard
          label="Escalated"
          value={data.summary.escalated.toLocaleString()}
          icon="accounts"
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
              value={show}
              onChange={(event) => {
                setPage(1);
                setShow(event.target.value as typeof show);
              }}
            >
              <option value="all">All customers</option>
              <option value="stuck">Stuck only</option>
              <option value="escalated">Escalated only</option>
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
                      {item.failureReason || item.escalationNote ? (
                        <button
                          type="button"
                          className={styles["kyc-message-button"]}
                          aria-haspopup="dialog"
                          aria-expanded={
                            messageView?.item.user.id === item.user.id
                          }
                          onClick={(event) => toggleMessage(event, item)}
                        >
                          View message
                        </button>
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
                        onClick={() => void openHistory(item)}
                      >
                        History
                      </button>
                      <button
                        type="button"
                        className={styles["btn-toolbar-primary"]}
                        disabled={!item.canRetry || busyUserId === item.user.id}
                        onClick={() => void runAction(item.user.id, "retry")}
                      >
                        Retry
                      </button>
                      {item.escalatedAt ? (
                        <button
                          type="button"
                          className={styles["btn-toolbar-primary"]}
                          disabled={busyUserId === item.user.id}
                          onClick={() => {
                            setOutcome("not_started");
                            setResolveNote("");
                            setResolving(item);
                          }}
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles["btn-toolbar-primary"]}
                          disabled={
                            item.status === "verified" ||
                            busyUserId === item.user.id
                          }
                          onClick={() => {
                            setNote("");
                            setEscalating(item);
                          }}
                        >
                          Escalate
                        </button>
                      )}
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
      {messageView ? (
        <div
          ref={messagePopoverRef}
          className={styles["kyc-message-popover"]}
          role="dialog"
          aria-label="Verification message"
          style={{ top: messageView.top, left: messageView.left }}
        >
          {messageView.item.failureReason ? (
            <p>
              <strong>{formatEnum(messageView.item.failureCode ?? "")}</strong>
              {" — "}
              {messageView.item.failureReason}
            </p>
          ) : null}
          {messageView.item.escalationNote ? (
            <p>Escalation: {messageView.item.escalationNote}</p>
          ) : null}
        </div>
      ) : null}
      <Dialog
        open={!!historyFor}
        title={`Case history${historyFor ? ` — ${historyFor.user.name}` : ""}`}
        onClose={() => setHistoryFor(null)}
      >
        {historyError ? <p role="alert">{historyError}</p> : null}
        {!history && !historyError ? <p>Loading history…</p> : null}
        {history && history.items.length === 0 ? (
          <p className={styles["kyc-history-empty"]}>
            No staff actions have been recorded for this customer yet.
          </p>
        ) : null}
        {history && history.items.length > 0 ? (
          <ol className={styles["kyc-history"]}>
            {history.items.map((entry) => (
              <li key={entry.id}>
                <strong>
                  {entry.action === "retried"
                    ? "Retry started"
                    : entry.action === "escalated"
                      ? "Escalated"
                      : `Resolved${entry.outcome ? ` — ${formatEnum(entry.outcome)}` : ""}`}
                </strong>
                <span>
                  {entry.actorName ?? "Unknown"} ·{" "}
                  {formatAdminDateTime(entry.createdAt, history.user.timeZone)}
                </span>
                {entry.previousStatus ? (
                  <span>From: {formatEnum(entry.previousStatus)}</span>
                ) : null}
                {entry.attemptCount !== null ? (
                  <span>Attempt {entry.attemptCount}</span>
                ) : null}
                {entry.note ? <span>Note: {entry.note}</span> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </Dialog>
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
      <Dialog
        open={!!resolving}
        title="Resolve escalated case"
        onClose={() => {
          if (!busyUserId) setResolving(null);
        }}
      >
        <form className={styles["role-form"]} onSubmit={submitResolution}>
          <label>
            Outcome
            <select
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
            >
              <option value="not_started">Reset to Not started (retest)</option>
              <option value="verified">Mark as Verified</option>
              <option value="failed">Mark as Failed</option>
            </select>
          </label>
          <label>
            Resolution note (optional)
            <textarea
              maxLength={1000}
              rows={3}
              value={resolveNote}
              onChange={(event) => setResolveNote(event.target.value)}
            />
          </label>
          <div className={styles["form-actions"]}>
            <button
              type="button"
              disabled={!!busyUserId}
              onClick={() => setResolving(null)}
            >
              Cancel
            </button>
            <button type="submit" disabled={!!busyUserId}>
              Resolve
            </button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
