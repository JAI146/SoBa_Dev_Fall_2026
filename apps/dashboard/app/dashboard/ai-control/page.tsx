"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  assistantControlChanged,
  assistantControlPath,
  assistantControlSchema,
  type AssistantBudget,
  type AssistantControl,
} from "@purposemint/contracts";
import { ApiError, apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { ActivityPanel } from "./activity-panel";
import { BudgetEditor } from "./budget-editor";
import { ExpenseCarousel } from "./expense-carousel";
import dashboard from "../dashboard.module.css";
import styles from "./ai-control.module.css";

const tabs = ["Access control", "Budget", "Activity"] as const;

function AccessControl({
  data,
  busy,
  decide,
}: {
  data: AssistantControl;
  busy: boolean;
  decide: (id: string, decision: "approve" | "deny" | "revoke") => void;
}) {
  return (
    <div className={styles.accessLayout}>
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <div>
            <h2>Administrators with access</h2>
            <p>
              Assistant access follows each administrator’s existing dashboard
              permissions.
            </p>
          </div>
        </div>
        <ul className={styles.staffList}>
          {data.admins.map((admin) => (
            <li className={styles.staffRow} key={admin.id}>
              <span>
                <strong>{admin.name}</strong>
                <small>{admin.role}</small>
              </span>
              {admin.builtIn ? (
                <small>Built-in access</small>
              ) : (
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => decide(admin.id, "revoke")}
                >
                  Revoke access
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <aside className={styles.card} aria-label="Incoming access requests">
        <div className={styles.cardHeading}>
          <div>
            <h2>Incoming requests</h2>
            <p>Open a request to review the note.</p>
          </div>
        </div>
        {!data.requests.length && (
          <p className={styles.empty}>No pending requests.</p>
        )}
        {data.requests.map((request) => (
          <details key={request.id} className={styles.request}>
            <summary>
              <strong>{request.name}</strong>
              <small>{request.role}</small>
            </summary>
            <p>{request.note}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                disabled={busy}
                onClick={() => decide(request.id, "deny")}
              >
                Deny
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={() => decide(request.id, "approve")}
              >
                Approve
              </button>
            </div>
          </details>
        ))}
      </aside>
    </div>
  );
}

export default function AssistantControlPage() {
  const [data, setData] = useState<AssistantControl | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Access control");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetVersion, setBudgetVersion] = useState(0);
  const sequence = useRef({ version: 0 }).current;
  const mutating = useRef(false);

  const reload = useCallback(
    async (showProgress = false) => {
      if (mutating.current) return;
      const request = ++sequence.version;
      if (showProgress) setRefreshing(true);
      try {
        const next = await apiRequest(
          assistantControlPath,
          {},
          getToken(),
          assistantControlSchema,
        );
        if (request === sequence.version) {
          setLoadError("");
          setData(next);
        }
      } catch (cause) {
        if (request !== sequence.version) return;
        if (
          cause instanceof ApiError &&
          (cause.status === 401 || cause.status === 403)
        )
          setData(null);
        setLoadError(
          cause instanceof Error
            ? cause.message
            : "Unable to load assistant controls.",
        );
      } finally {
        if (request === sequence.version) setRefreshing(false);
      }
    },
    [sequence],
  );

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => {
      if (!document.hidden) void reload();
    }, 15000);
    return () => {
      ++sequence.version;
      window.clearInterval(timer);
    };
  }, [reload, sequence]);

  async function update(work: () => Promise<void>, success: string) {
    if (mutating.current) return;
    mutating.current = true;
    ++sequence.version;
    setRefreshing(false);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(success);
      window.dispatchEvent(new Event(assistantControlChanged));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save the change.",
      );
    } finally {
      mutating.current = false;
      setBusy(false);
      void reload();
    }
  }

  return (
    <main className={dashboard["dashboard-page"]}>
      <header className={dashboard["page-header"]}>
        <div>
          <p className={dashboard.eyebrow}>ADMINISTRATION</p>
          <h1>AI Control Panel</h1>
          <p>
            Review assistant spending, manage access, and audit conversations.
          </p>
        </div>
      </header>
      {(error || loadError) && (
        <p className={styles.error} role="alert">
          {error || loadError}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {!data ? (
        !loadError && <p role="status">Loading assistant controls…</p>
      ) : (
        <>
          <ExpenseCarousel data={data} />
          <div
            role="tablist"
            aria-label="AI control sections"
            className={styles.tabs}
          >
            {tabs.map((label, index) => (
              <button
                key={label}
                id={"ai-tab-" + index}
                role="tab"
                type="button"
                aria-controls="ai-tab-panel"
                aria-selected={tab === label}
                tabIndex={tab === label ? 0 : -1}
                onClick={() => setTab(label)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % tabs.length
                      : event.key === "ArrowLeft"
                        ? (index + tabs.length - 1) % tabs.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tabs.length - 1
                            : null;
                  if (next === null) return;
                  event.preventDefault();
                  setTab(tabs[next]!);
                  document.getElementById("ai-tab-" + next)?.focus();
                }}
              >
                {label}
                {label === "Access control" && !!data.requests.length && (
                  <span
                    className={styles.count}
                    aria-label={
                      data.requests.length + " pending access requests"
                    }
                  >
                    {data.requests.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div
            id="ai-tab-panel"
            role="tabpanel"
            aria-labelledby={"ai-tab-" + tabs.indexOf(tab)}
          >
            {tab === "Access control" && (
              <AccessControl
                data={data}
                busy={busy}
                decide={(id, decision) => {
                  void update(
                    async () => {
                      await apiRequest(
                        assistantControlPath + "/access/" + id,
                        { method: "POST", body: JSON.stringify({ decision }) },
                        getToken(),
                      );
                    },
                    decision === "approve"
                      ? "Access approved."
                      : decision === "deny"
                        ? "Request denied."
                        : "Access revoked.",
                  );
                }}
              />
            )}
            {tab === "Budget" && (
              <BudgetEditor
                key={budgetVersion}
                data={data}
                busy={busy}
                save={async (budget: AssistantBudget) => {
                  await update(async () => {
                    const next = await apiRequest(
                      assistantControlPath + "/budget",
                      { method: "PUT", body: JSON.stringify(budget) },
                      getToken(),
                      assistantControlSchema,
                    );
                    setData(next);
                    setBudgetVersion((version) => version + 1);
                  }, "Monthly budget saved.");
                }}
              />
            )}
            {tab === "Activity" && (
              <ActivityPanel
                admins={data.admins}
                reload={() => {
                  setError("");
                  void reload(true);
                }}
                refreshing={refreshing}
              />
            )}
          </div>
        </>
      )}
    </main>
  );
}
