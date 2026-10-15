"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  healthReportInputSchema,
  healthServiceIds,
  healthStatusSchema,
  healthIssueCategorySchema,
  systemHealthResponseSchema,
  type SystemHealthResponse,
} from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatEnum, formatAdminDateTime } from "@/lib/admin-format";
import layout from "../dashboard.module.css";
import styles from "./system-health.module.css";
const categories = {
  purposemint: "PurposeMint-side",
  provider: "Provider-side",
  synchronization: "Data synchronization",
  user_specific: "User-specific",
  undetermined: "Undetermined",
};
export default function SystemHealthPage() {
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [reportCategory, setReportCategory] = useState("undetermined");
  const inFlight = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    try {
      const result = await apiRequest(
        "/admin/system-health",
        { signal: controller.signal, cache: "no-store" },
        getToken(),
        systemHealthResponseSchema,
      );
      if (inFlight.current === controller) {
        setData(result);
        setError(null);
      }
    } catch (cause) {
      if (inFlight.current === controller)
        setError(
          cause instanceof Error ? cause.message : "Health check unavailable.",
        );
    } finally {
      clearTimeout(timeout);
      if (inFlight.current === controller) {
        inFlight.current = null;
        setLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30000);
    return () => {
      clearInterval(interval);
      const controller = inFlight.current;
      inFlight.current = null;
      controller?.abort();
    };
  }, [load]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const input = healthReportInputSchema.safeParse({
      serviceId: values.get("serviceId"),
      status: values.get("status"),
      category: reportCategory,
      affectedUserId:
        reportCategory === "user_specific"
          ? values.get("affectedUserId")
          : null,
      summary: values.get("summary"),
    });
    if (!input.success) {
      setFeedback(input.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      await apiRequest(
        "/admin/system-health/reports",
        { method: "POST", body: JSON.stringify(input.data) },
        getToken(),
      );
      form.reset();
      setReportCategory("undetermined");
      setFeedback("Observation saved to the audit history.");
      await load();
    } catch (cause) {
      setFeedback(
        cause instanceof Error ? cause.message : "Could not save observation.",
      );
    } finally {
      setSaving(false);
    }
  }
  const services =
    data?.services.filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (category === "all" || s.category === category),
    ) ?? [];
  const reports =
    data?.reports.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (category === "all" || r.category === category),
    ) ?? [];
  return (
    <main className={`${layout["dashboard-page"]} ${styles.page}`}>
      <header className={layout["page-header"]}>
        <div>
          <p className={layout.eyebrow}>Operations</p>
          <h1>System health</h1>
        </div>
        <button
          className={layout["btn-toolbar-primary"]}
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? "Checking…" : "Refresh checks"}
        </button>
      </header>
      {error && (
        <div className={styles.warning} role="alert">
          Could not refresh health: {error}.{" "}
          {data
            ? "The snapshot below is older data. Current health is unconfirmed."
            : "API availability and the cause of this issue are unconfirmed. Check connectivity and your staff permissions."}
        </div>
      )}
      {!data && !error && <p role="status">Loading health checks…</p>}
      {data && (
        <>
          <section
            className={`${layout.panel} ${styles.summary}`}
            aria-label="Health summary"
          >
            <div>
              <h2>
                {error ? "Previous snapshot status" : "Overall status"}{" "}
                <Badge status={data.overallStatus} />
              </h2>
              <p>Updated {formatAdminDateTime(data.generatedAt, null)} UTC</p>
            </div>
            <details>
              <summary>About these checks</summary>
              <p>
                API and database checks are live. Provider statuses are staff
                reports and expire after 24 hours.
              </p>
            </details>
          </section>
          {!data.reportsAvailable && (
            <p className={styles.warning} role="alert">
              Staff report history could not be loaded. Provider statuses are
              unconfirmed. Retry after database access recovers.
            </p>
          )}
          <div className={styles.filters}>
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                {healthStatusSchema.options.map((s) => (
                  <option key={s} value={s}>
                    {formatEnum(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Issue category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {healthIssueCategorySchema.options.map((c) => (
                  <option key={c} value={c}>
                    {categories[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section className={styles.services} aria-label="Service health">
            {services.map((service) => (
              <article className={layout.panel} key={service.id}>
                <div className={styles.heading}>
                  <div>
                    <p className={styles.muted}>{service.group}</p>
                    <h2>{service.name}</h2>
                  </div>
                  <Badge status={service.status} />
                </div>
                <p>{service.summary}</p>
                <dl className={styles.details}>
                  <div>
                    <dt>Issue category</dt>
                    <dd>{categories[service.category]}</dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>
                      {service.source === "live_check"
                        ? "Live check"
                        : service.source === "staff_report"
                          ? "Staff report"
                          : "Not monitored"}
                    </dd>
                  </div>
                  <div>
                    <dt>Last observation</dt>
                    <dd>
                      {service.checkedAt
                        ? formatAdminDateTime(service.checkedAt, null)
                        : "No observation"}
                      {service.stale ? " (expired)" : ""}
                    </dd>
                  </div>
                  {service.latencyMs !== null && (
                    <div>
                      <dt>Database round trip</dt>
                      <dd>{service.latencyMs} ms</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
            {!services.length && <p>No services match these filters.</p>}
          </section>
          {data.canReport && (
            <section className={layout.panel}>
              <details>
                <summary className={styles.formTitle}>
                  Record a staff observation
                </summary>
                <p className={styles.muted}>
                  Use verified operational evidence. Do not enter passwords,
                  tokens, financial details or private coaching conversations.
                  Live API/database checks remain independent of staff reports.
                </p>
                <form onSubmit={submit} className={styles.form}>
                  <label>
                    Service
                    <select name="serviceId" required defaultValue="">
                      <option value="" disabled>
                        Select a service
                      </option>
                      {healthServiceIds.map((id) => (
                        <option key={id} value={id}>
                          {data.services.find((s) => s.id === id)?.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select name="status" required defaultValue="">
                      <option value="" disabled>
                        Select a status
                      </option>
                      {healthStatusSchema.options.map((s) => (
                        <option key={s} value={s}>
                          {formatEnum(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Issue category
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                    >
                      {healthIssueCategorySchema.options.map((c) => (
                        <option key={c} value={c}>
                          {categories[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {reportCategory === "user_specific" && (
                    <label>
                      Affected customer UUID
                      <input
                        name="affectedUserId"
                        required
                        placeholder="Customer ID from the user detail URL"
                      />
                    </label>
                  )}
                  <label className={styles.full}>
                    Operational summary
                    <textarea
                      name="summary"
                      required
                      minLength={8}
                      maxLength={300}
                      rows={3}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className={layout["btn-primary"]}
                  >
                    {saving ? "Saving…" : "Save observation"}
                  </button>
                  <p role="status" className={styles.full}>
                    {feedback}
                  </p>
                </form>
              </details>
            </section>
          )}
          <section className={layout.panel}>
            <h2>Recent staff observations</h2>
            <p className={styles.muted}>
              Latest 50 observations. User-specific incidents do not change the
              provider’s overall status.
            </p>
            <ul className={styles.history}>
              {reports.map((report) => (
                <li key={report.id}>
                  <div className={styles.heading}>
                    <strong>
                      {
                        data.services.find((s) => s.id === report.serviceId)
                          ?.name
                      }
                    </strong>
                    <Badge status={report.status} />
                  </div>
                  <p>{report.summary}</p>
                  <p className={styles.muted}>
                    {categories[report.category]} ·{" "}
                    {formatAdminDateTime(report.recordedAt, null)}
                    {report.stale ? " · Expired" : ""}
                  </p>
                  {report.affectedUserId && (
                    <p className={styles.userId}>
                      Affected customer: {report.affectedUserId}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {!reports.length && (
              <p>
                {data.reportsAvailable
                  ? "No observations match these filters."
                  : "Observation history unavailable."}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
function Badge({ status }: { status: string }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {formatEnum(status)}
    </span>
  );
}
