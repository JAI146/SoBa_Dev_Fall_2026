"use client";

/**
 * Coordinates program selection, creation, settings, recipients, and analytics.
 * Shares search/date filters between reports and opens recipient drilldowns from metrics.
 */
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  incentiveProgramsSchema,
  incentiveStatuses,
  type IncentiveProgram,
} from "@purposemint/contracts";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { Recipients } from "./recipients";
import { Analytics } from "./analytics";
import { useAdminQuery } from "@/lib/use-admin-query";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./incentives.module.css";
import { label, money } from "./shared";
import { ProgramSettings } from "./program-settings";

export function IncentivesPage() {
  const programs = useAdminQuery(
    "/admin/incentives/programs",
    incentiveProgramsSchema,
  );
  if (programs.error)
    return (
      <DashboardError
        message={programs.error}
        onRetry={() => void programs.reload()}
      />
    );
  if (!programs.data) return <DashboardLoading label="Loading incentives…" />;
  if (!programs.data.length) return <p>No incentive programs configured.</p>;
  return (
    <IncentivesWorkspace programs={programs.data} reload={programs.reload} />
  );
}

function IncentivesWorkspace({
  programs,
  reload,
}: {
  programs: IncentiveProgram[];
  reload: () => Promise<void>;
}) {
  const url = useSearchParams();
  const userId = url.get("userId") ?? "";
  const [programId, setProgram] = useState(programs[0]!.id);
  const program = programs.find((p) => p.id === programId) ?? programs[0]!;
  const [tab, setTab] = useState("Recipients");
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    from: "",
    to: "",
  });
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(1);
  const [metricFilter, setMetricFilter] = useState("");
  const params = new URLSearchParams({
    programId: program.id,
    page: String(page),
    pageSize: "20",
  });
  if (userId) params.set("userId", userId);
  if (metricFilter && tab === "Recipients") params.set("metric", metricFilter);
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  function apply(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setMetricFilter("");
    setFilters(draft);
  }
  function metric(value: string) {
    setMetricFilter(value);
    setPage(1);
    setTab("Recipients");
  }
  return (
    <main className={`${base["dashboard-page"]} ${styles.stack}`}>
      <div className={base["page-header"]}>
        <div>
          <p className={base.eyebrow}>Financial incentives</p>
          <h1>Incentives &amp; Benefits</h1>
          <p>Manage bonuses and track benefit activity.</p>
        </div>
      </div>
      <div className={styles.filters}>
        <label>
          Program
          <select
            value={program.id}
            onChange={(e) => {
              setProgram(e.target.value);
              setCreatingProgram(false);
              setPage(1);
            }}
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.status}>
          {program.active ? "Active" : "Inactive"} ·{" "}
          {money(program.amountCents)}
        </span>
        <button
          className={base["btn-toolbar-primary"]}
          onClick={() => setCreatingProgram(true)}
        >
          New program
        </button>
      </div>
      {creatingProgram ? (
        <ProgramSettings
          key="new-program"
          reload={reload}
          onCancel={() => setCreatingProgram(false)}
          onCreated={async (created) => {
            await reload();
            setProgram(created.id);
            setPage(1);
            setCreatingProgram(false);
            setTab("Program settings");
          }}
        />
      ) : (
        <>
          <nav className={styles.tabs} aria-label="Incentives sections">
            {["Recipients", "Analytics", "Program settings"].map((t) => (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          {tab === "Program settings" ? (
            <ProgramSettings
              key={`${program.id}:${program.version}`}
              program={program}
              reload={reload}
            />
          ) : (
            <>
              {metricFilter && tab === "Recipients" ? (
                <p className={styles.muted}>
                  Metric filter: {label(metricFilter)}.{" "}
                  <button
                    className={styles.buttonLink}
                    onClick={() => {
                      setMetricFilter("");
                      setPage(1);
                    }}
                  >
                    Clear metric filter
                  </button>
                </p>
              ) : null}
              {userId ? (
                <p className={styles.muted}>
                  Showing one customer.{" "}
                  <Link href="/dashboard/incentives">View all customers</Link>
                </p>
              ) : null}
              <form className={styles.filters} onSubmit={apply}>
                <label>
                  Search recipients
                  <input
                    value={draft.search}
                    onChange={(e) =>
                      setDraft({ ...draft, search: e.target.value })
                    }
                    placeholder="Name or email"
                  />
                </label>
                <label>
                  Status
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value })
                    }
                  >
                    <option value="">All statuses</option>
                    {incentiveStatuses.map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  First review from (UTC)
                  <input
                    type="date"
                    value={draft.from}
                    max={draft.to || undefined}
                    onChange={(e) =>
                      setDraft({ ...draft, from: e.target.value })
                    }
                  />
                </label>
                <label>
                  First review through (UTC)
                  <input
                    type="date"
                    value={draft.to}
                    min={draft.from || undefined}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                  />
                </label>
                <button className={base["btn-toolbar-primary"]}>
                  Apply filters
                </button>
                <button
                  type="button"
                  className={styles.buttonLink}
                  onClick={() => {
                    const empty = { search: "", status: "", from: "", to: "" };
                    setDraft(empty);
                    setFilters(empty);
                    setMetricFilter("");
                    setPage(1);
                  }}
                >
                  Clear
                </button>
              </form>
              {tab === "Recipients" ? (
                <Recipients
                  program={program}
                  params={params.toString()}
                  page={page}
                  setPage={setPage}
                />
              ) : (
                <Analytics params={params.toString()} onMetric={metric} />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
