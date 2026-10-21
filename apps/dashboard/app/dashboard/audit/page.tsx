"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AuditAction,
  auditHierarchySchema,
  type AuditStaffNode,
} from "@purposemint/contracts";
import { Dialog } from "@/components/common/dialog";
import { RefreshIcon, SearchIcon } from "@/components/dashboard/action-icons";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import AuditLogView, {
  emptyAuditFilters,
  type AuditFilters,
} from "./audit-log";
import styles from "./audit.module.css";
import { hierarchyHighlights } from "@purposemint/contracts";
import StaffTree from "./staff-tree";

const title = (value: string) =>
  value
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AuditPage() {
  const [mode, setMode] = useState("hierarchy");
  const [draft, setDraft] = useState(emptyAuditFilters);
  const [filters, setFilters] = useState(emptyAuditFilters);
  const [name, setName] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [searched, setSearched] = useState(false);
  const [users, setUsers] = useState<AuditStaffNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<AuditStaffNode | null>(null);
  const path = `/admin/audit-hierarchy?${new URLSearchParams(filters)}`;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void apiRequest(path, {}, getToken(), auditHierarchySchema)
      .then((data) => {
        if (active) setUsers(data.users);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load hierarchy.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setRevision((value) => value + 1);
    };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const detectionActive = searched && !error;
  const { detected, ancestors } = useMemo(() => hierarchyHighlights(
    users, Boolean(detectionActive), appliedName,
  ), [users, detectionActive, appliedName]);
  const byId = new Map(users.map((user) => [user.id, user]));
  const change = (key: keyof AuditFilters, value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  return (
    <main className={styles.page}>
      <div className={styles.pageTop}>
        <header className={styles.header}>
          <div>
            <h1>Audit & compliance</h1>
          </div>
          <button
            className={styles.iconButton}
            title="Refresh hierarchy"
            aria-label="Refresh hierarchy"
            disabled={loading}
            onClick={() => setRevision(revision + 1)}
          >
            <RefreshIcon spinning={loading} />
          </button>
        </header>
        <div
          className={styles.viewTabs}
          role="tablist"
          aria-label="Audit views"
        >
          <button
            role="tab"
            id="hierarchy-tab"
            aria-controls="hierarchy-panel"
            aria-selected={mode === "hierarchy"}
            onClick={() => setMode("hierarchy")}
          >
            Staff hierarchy
          </button>
          <button
            role="tab"
            id="overview-tab"
            aria-controls="overview-panel"
            aria-selected={mode === "overview"}
            onClick={() => setMode("overview")}
          >
            Detailed overview
          </button>
        </div>
      </div>
      {mode === "hierarchy" ? (
        <section
          id="hierarchy-panel"
          role="tabpanel"
          aria-labelledby="hierarchy-tab"
        >
          <details className={styles.searchDrawer}>
            <summary>
              <SearchIcon />
              Activity search
              {searched && (
                <span className={styles.searchApplied}>Applied</span>
              )}
            </summary>
            <form
              className={`${styles.filters} ${styles.hierarchyFilters}`}
              onSubmit={(event) => {
                event.preventDefault();
                setFilters({ ...draft });
                setAppliedName(name.trim());
                setSearched(true);
                setRevision(revision + 1);
              }}
            >
              <label>
                Staff member
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="All staff"
                />
              </label>
              <label>
                Action
                <select
                  value={draft.action}
                  onChange={(event) => change("action", event.target.value)}
                >
                  <option value="">All actions</option>
                  {Object.values(AuditAction).map((action) => (
                    <option key={action} value={action}>
                      {title(action)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                From (UTC)
                <input
                  type="date"
                  value={draft.from}
                  onChange={(event) => change("from", event.target.value)}
                />
              </label>
              <label>
                Through (UTC)
                <input
                  type="date"
                  value={draft.to}
                  onChange={(event) => change("to", event.target.value)}
                />
              </label>
              <label>
                Result
                <select
                  value={draft.outcome}
                  onChange={(event) => change("outcome", event.target.value)}
                >
                  <option value="">All results</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                </select>
              </label>
              <button type="submit" disabled={loading}>
                <SearchIcon />
                Search activity
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(emptyAuditFilters);
                  setFilters(emptyAuditFilters);
                  setName("");
                  setAppliedName("");
                  setSearched(false);
                }}
              >
                Clear
              </button>
            </form>
          </details>
          <div className={styles.treeToolbar}>
            <div className={styles.treeHeading}>
              <h2>Reporting hierarchy</h2>
              <span>
                {users.length} staff
                {detectionActive ? ` · ${detected.size} matched` : ""}
              </span>
            </div>
            <div className={styles.treeLegend}>
              <span>
                <i className={styles.legendMatch} />
                Matching activity
              </span>
              <span>
                <i className={styles.legendTeam} />
                Matching activity in team
              </span>
            </div>
          </div>
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : loading && !users.length ? (
            <p role="status" className={styles.empty}>
              Loading hierarchy...
            </p>
          ) : (
            <>
              {detectionActive && !detected.size && (
                <p className={styles.note} role="status">
                  No staff activity matches these filters.
                </p>
              )}
              <StaffTree users={users} detected={detected} ancestors={ancestors} onSelect={setSelected} />
            </>
          )}
        </section>
      ) : (
        <section
          id="overview-panel"
          role="tabpanel"
          aria-labelledby="overview-tab"
        >
          <AuditLogView initialFilters={filters} embedded />
        </section>
      )}
      <div className={styles.staffDialog}>
        <Dialog
          open={selected !== null}
          title={
            selected
              ? `${selected.name} · ${title(selected.roleLabel)}`
              : "Staff activity"
          }
          onClose={() => setSelected(null)}
        >
          {selected && (
            <>
              <p className={styles.note}>
                Reports to:{" "}
                {selected.reportsToUserId
                  ? (byId.get(selected.reportsToUserId)?.name ?? "Unassigned")
                  : "None"}
              </p>
              <AuditLogView
                key={selected.id}
                actorId={selected.id}
                initialFilters={filters}
                embedded
              />
            </>
          )}
        </Dialog>
      </div>
    </main>
  );
}
