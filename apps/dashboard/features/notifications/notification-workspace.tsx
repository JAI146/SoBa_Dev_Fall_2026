"use client";
import Link from "next/link";
import { CustomerPicker } from "@/components/dashboard/customer-picker";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { notificationLabel } from "@/lib/notification-display";
import { useRef, useState } from "react";
import { CustomerBrowser } from "./customer-browser";
import { EmailSetup } from "./email-setup";
import { SendEmail } from "./send-email";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import {
  categoryConfigurationSchema,
  notificationActionResponseSchema,
  notificationQueueResponseSchema,
  notificationCategoriesResponseSchema,
  type NotificationJobPublic,
  type MessageResponse,
  reengagementScanSchema,
  queueNotificationSchema,
  notificationOperationsSchema,
  notificationSettingsResponseSchema,
  notificationStatusSchema,
  type NotificationSettings,
  type NotificationCategoryPublic,
} from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatAdminDateTime, formatEnum } from "@/lib/admin-format";
import layout from "@/app/dashboard/dashboard.module.css";
import styles from "@/app/dashboard/notifications/notifications.module.css";
export function NotificationWorkspace() {
  const [sendJob, setSendJob] = useState<NotificationJobPublic | null>(null);
  const createForm = useRef<HTMLDetailsElement>(null);
  function openCreate() {
    setTab("settings");
    requestAnimationFrame(() => {
      if (createForm.current) {
        createForm.current.open = true;
        createForm.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }
  const [tab, setTab] = useState("activity");
  const [queueUserId, setQueueUserId] = useState("");
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [category, setCategory] = useState(""),
    [channel, setChannel] = useState("");
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  if (category) params.set("categoryKey", category);
  if (channel) params.set("channel", channel);
  const query = useAdminQuery(
    `/admin/notifications?${params}`,
    notificationOperationsSchema,
  );
  const [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<{
    settings: NotificationSettings;
    categories: NotificationCategoryPublic[];
  } | null>(null);
  const [userId, setUserId] = useState(""),
    [preferenceError, setPreferenceError] = useState("");
  const [editing, setEditing] = useState("");
  const [queueCategory, setQueueCategory] = useState("goals");
  const requestId = useRef<string | null>(null);
  const preferenceRequest = useRef(0);
  const [preferenceLoading, setPreferenceLoading] = useState(false);
  const [preferenceCustomerName, setPreferenceCustomerName] = useState("");
  async function action(path: string, body?: unknown) {
    setBusy(true);
    setFeedback("");
    try {
      const result = await apiRequest<
        MessageResponse | NotificationCategoryPublic[]
      >(
        path,
        { method: "POST", ...(body ? { body: JSON.stringify(body) } : {}) },
        getToken(),
        path.endsWith("/queue")
          ? notificationQueueResponseSchema
          : path.endsWith("/categories")
            ? notificationCategoriesResponseSchema
            : notificationActionResponseSchema,
      );
      setFeedback(Array.isArray(result) ? "Category saved." : result.message);
      await query.reload();
      return true;
    } catch (cause) {
      setFeedback(
        cause instanceof Error
          ? cause.message
          : "Could not complete this operation.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function scanReengagement() {
    setBusy(true);
    setFeedback("");
    try {
      const result = await apiRequest(
        "/admin/notifications/re-engagement/scan",
        { method: "POST" },
        getToken(),
        reengagementScanSchema,
      );
      setFeedback(
        result.busy
          ? "An inactivity check is already running."
          : `Checked ${result.examined} customers. Added ${result.queued} reminders, cancelled ${result.cancelled}, and skipped ${result.suppressed}.`,
      );
      await query.reload();
    } catch (cause) {
      setFeedback(
        cause instanceof Error ? cause.message : "Could not scan inactivity.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadPreferences(customerId: string, customerName: string) {
    setPreferenceCustomerName(customerName);
    setUserId(customerId);
    setPreferenceError("");
    setPreferences(null);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        customerId,
      )
    ) {
      setPreferenceError("Select a customer or enter a valid customer ID.");
      return;
    }
    const current = ++preferenceRequest.current;
    setPreferenceLoading(true);
    try {
      const result = await apiRequest(
        `/admin/notifications/users/${customerId}/preferences`,
        {},
        getToken(),
        notificationSettingsResponseSchema,
      );
      if (current === preferenceRequest.current) setPreferences(result);
    } catch (cause) {
      if (current === preferenceRequest.current)
        setPreferenceError(
          cause instanceof Error ? cause.message : "Preferences unavailable.",
        );
    } finally {
      if (current === preferenceRequest.current) setPreferenceLoading(false);
    }
  }
  async function configure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const input = categoryConfigurationSchema.safeParse({
      key:
        editing ||
        String(values.get("name") ?? "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 50),
      name: values.get("name"),
      enabled: values.get("enabled") === "on",
      pushSupported: values.get("push") === "on",
      emailSupported: values.get("email") === "on",
      minIntervalHours: Number(values.get("interval")),
    });
    if (!input.success) {
      setFeedback(input.error.issues.map((i) => i.message).join(" "));
      return;
    }
    if (
      !editing &&
      query.data?.categories.some((category) => category.key === input.data.key)
    ) {
      setFeedback("This category already exists. Select it above to edit it.");
      return;
    }
    await action("/admin/notifications/categories", input.data);
  }
  async function createQueue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!queueUserId) {
      setFeedback("Select a customer first.");
      return;
    }
    const form = new FormData(event.currentTarget);
    requestId.current ??= crypto.randomUUID();
    const planned = form.get("scheduledAt") as string;
    if (planned && Number.isNaN(new Date(planned).getTime())) {
      setFeedback("Choose a valid planned date and time.");
      return;
    }
    const parsed = queueNotificationSchema.safeParse({
      userId: queueUserId,
      categoryKey: queueCategory,
      eventType: form.get("eventType"),
      channel: form.get("channel"),
      requestId: requestId.current,
      ...(planned ? { scheduledAt: new Date(planned).toISOString() } : {}),
    });
    if (!parsed.success) {
      setFeedback(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    const saved = await action("/admin/notifications/queue", parsed.data);
    if (saved) {
      requestId.current = null;
      setTab("activity");
      setPage(1);
      setStatus("");
      setCategory("");
      setChannel("");
    }
  }
  const data = query.data,
    selected = data?.categories.find((c) => c.key === editing);
  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (!data) return <DashboardLoading />;
  return (
    <main className={`${layout["dashboard-page"]} ${styles.page}`}>
      <Link href="/dashboard/settings" className={layout["back-link"]}>
        Back to settings
      </Link>
      <header className={layout["page-header"]}>
        <div>
          <p className={layout.eyebrow}>Settings</p>
          <h1>Notifications</h1>
        </div>
        <div className={layout["page-actions-group"]}>
          {data.canManage && (
            <button className={layout["btn-primary"]} onClick={openCreate}>
              Create notification
            </button>
          )}
          <button
            disabled={query.loading}
            className={layout["btn-toolbar-primary"]}
            onClick={() => void query.reload()}
          >
            Refresh
          </button>
        </div>
      </header>
      <div className={styles.connectionStrip}>
        <span
          className={`${styles.badge} ${data.emailConfigured ? styles.sent : styles.blocked}`}
        >
          {data.emailConfigured ? "Email configured" : "Email setup needed"}
        </span>
        <span>
          Push not connected ·{" "}
          {data.automation?.configured && data.emailConfigured
            ? "Inactivity emails send automatically. Other emails are sent from Activity."
            : "Automatic inactivity emails are paused. Manual email is available from Activity."}
        </span>
      </div>
      {query.error && (
        <p className={styles.error} role="alert">
          {query.error}
        </p>
      )}
      {query.loading && <p role="status">Loading operations…</p>}
      {data && (
        <>
          <WorkspaceTabs
            id="notifications"
            items={[
              { key: "activity", label: "Activity" },
              { key: "preferences", label: "Customer notifications" },
              { key: "settings", label: "Manage notifications" },
              ...(data.canConfigureEmail
                ? [{ key: "email", label: "Email setup" }]
                : []),
            ]}
            value={tab}
            onChange={setTab}
          />
          {feedback && (
            <p className={styles.feedback} role="status">
              {feedback}
            </p>
          )}
          <div
            role="tabpanel"
            id="notifications-panel-activity"
            aria-labelledby="notifications-tab-activity"
            hidden={tab !== "activity"}
          >
            <section
              className={styles.metrics}
              aria-label="All notification status totals"
            >
              {[
                {
                  key: "",
                  label: "All notifications",
                  count: Object.values(data.counts).reduce(
                    (sum, count) => sum + count,
                    0,
                  ),
                },
                {
                  key: "sent",
                  label: "Sent",
                  count: data.counts.sent ?? 0,
                },
                {
                  key: "failed",
                  label: "Failed",
                  count: data.counts.failed ?? 0,
                },
                {
                  key: "blocked",
                  label: "Blocked",
                  count: data.counts.blocked ?? 0,
                },
              ].map((metric) => (
                <button
                  type="button"
                  key={metric.key}
                  className={styles.metricButton}
                  aria-pressed={status === metric.key}
                  onClick={() => {
                    setStatus(metric.key);
                    setCategory("");
                    setChannel("");
                    setPage(1);
                  }}
                >
                  <span>{metric.label}</span>
                  <strong>{metric.count}</strong>
                </button>
              ))}
            </section>
            <p className={styles.muted}>
              Totals across all categories. Select one to view its
              notifications.
            </p>
            <div className={styles.filters}>
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {notificationStatusSchema.options.map((s) => (
                    <option key={s} value={s}>
                      {notificationLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {data.categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Channel
                <select
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Both channels</option>
                  <option value="push">Push</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <div className={styles.filterActions}>
                <button
                  type="button"
                  className={layout["btn-toolbar-primary"]}
                  onClick={() => {
                    setStatus("");
                    setCategory("");
                    setChannel("");
                    setPage(1);
                  }}
                >
                  Reset filters
                </button>
              </div>
            </div>

            <section className={layout.panel}>
              <h2>Recent notifications</h2>
              <div className={layout["table-wrap"]}>
                <table className={`${layout["data-table"]} ${styles.table}`}>
                  <thead>
                    <tr>
                      <th>Notification</th>
                      <th>Channel</th>
                      <th>Status</th>
                      <th>Planned (UTC)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <strong>
                            {data.categories.find(
                              (c) => c.key === job.categoryKey,
                            )?.name ?? job.categoryKey}
                          </strong>
                          <span>
                            {formatEnum(job.eventType)} ·{" "}
                            {job.mandatory ? "Mandatory" : "Optional"}
                          </span>
                          <Link
                            className={layout["table-link"]}
                            href={`/dashboard/users/${job.userId}`}
                          >
                            {job.recipientName ?? "View customer"}
                          </Link>
                          <small>{job.recipientEmail}</small>
                        </td>
                        <td data-label="Channel">{formatEnum(job.channel)}</td>
                        <td data-label="Status">
                          <span
                            className={`${styles.badge} ${styles[job.status]}`}
                          >
                            {notificationLabel(job.status)}
                          </span>
                          <small>
                            {job.reason
                              ? notificationLabel(job.reason)
                              : "No issue recorded"}
                          </small>
                        </td>
                        <td data-label="Planned (UTC)">
                          <time dateTime={job.scheduledAt}>
                            {formatAdminDateTime(job.scheduledAt, null)}
                          </time>
                          <details className={styles.deliveryDetails}>
                            <summary>Delivery details</summary>
                            <div>
                              <small>
                                Sent:{" "}
                                {job.sentAt
                                  ? formatAdminDateTime(job.sentAt, null)
                                  : "Not sent"}
                              </small>
                              <small>
                                Delivered:{" "}
                                {job.deliveredAt
                                  ? formatAdminDateTime(job.deliveredAt, null)
                                  : "Not confirmed"}
                              </small>
                              <small>
                                {job.attempts} send attempt
                                {job.attempts === 1 ? "" : "s"}
                              </small>
                              <small>
                                {job.retryRequests} recheck
                                {job.retryRequests === 1 ? "" : "s"}
                              </small>
                            </div>
                          </details>
                        </td>
                        <td data-label="Action">
                          {data.canManage &&
                            data.emailConfigured &&
                            job.channel === "email" &&
                            !job.mandatory &&
                            job.attempts < 5 &&
                            ![
                              "sent",
                              "delivered",
                              "cancelled",
                              "processing",
                              "delivery_uncertain",
                              "suppressed",
                            ].includes(job.status) && (
                              <button
                                className={layout["btn-primary"]}
                                onClick={() => setSendJob(job)}
                              >
                                Send email
                              </button>
                            )}
                          {data.canManage &&
                          ![
                            "sent",
                            "delivered",
                            "cancelled",
                            "processing",
                            "delivery_uncertain",
                          ].includes(job.status) ? (
                            <button
                              disabled={busy || job.retryRequests >= 5}
                              className={layout["btn-toolbar-primary"]}
                              onClick={() =>
                                void action(
                                  `/admin/notifications/${job.id}/retry`,
                                )
                              }
                            >
                              Check again
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                    {!data.items.length && (
                      <tr>
                        <td colSpan={5}>
                          <div className={styles.emptyState}>
                            <strong>
                              {status || category || channel
                                ? "No matching notifications"
                                : "No notifications yet"}
                            </strong>
                            <p>
                              {status || category || channel
                                ? "Try different filters."
                                : "Planned and sent notifications will appear here."}
                            </p>
                            {(status || category || channel) && (
                              <button
                                type="button"
                                className={layout["btn-toolbar-primary"]}
                                onClick={() => {
                                  setStatus("");
                                  setCategory("");
                                  setChannel("");
                                  setPage(1);
                                }}
                              >
                                Clear filters
                              </button>
                            )}
                            {data.canManage &&
                              !status &&
                              !category &&
                              !channel && (
                                <button
                                  type="button"
                                  className={layout["btn-toolbar-primary"]}
                                  onClick={openCreate}
                                >
                                  Plan a notification
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span>{data.total} matching records</span>
                <button
                  disabled={page <= 1 || query.loading}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} of{" "}
                  {Math.max(1, Math.ceil(data.total / data.pageSize))}
                </span>
                <button
                  disabled={page * data.pageSize >= data.total || query.loading}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          </div>
          <div
            role="tabpanel"
            id="notifications-panel-preferences"
            aria-labelledby="notifications-tab-preferences"
            hidden={tab !== "preferences"}
          >
            <section className={layout.panel}>
              <h2>Customer notifications</h2>
              <p className={styles.muted}>
                Choose a customer to see which notifications they receive.
              </p>
              {tab === "preferences" && (
                <CustomerBrowser
                  value={userId}
                  onSelect={(id, name) => void loadPreferences(id, name)}
                />
              )}
              {userId && (
                <h3>Notification settings for {preferenceCustomerName}</h3>
              )}
              {preferenceLoading && (
                <p role="status">Loading notification settings…</p>
              )}
              {preferenceError && (
                <p role="alert" className={styles.error}>
                  {preferenceError}
                </p>
              )}
              {preferences && (
                <>
                  <p>
                    Optional notifications:{" "}
                    <strong>
                      {preferences.settings.optionalOptOut
                        ? "Turned off"
                        : "Allowed"}
                    </strong>
                  </p>
                  <p>
                    Do not disturb:{" "}
                    <strong>
                      {preferences.settings.quietHours.enabled
                        ? `${preferences.settings.quietHours.start}–${preferences.settings.quietHours.end} (${preferences.settings.quietHours.timeZone})`
                        : "Off"}
                    </strong>
                  </p>
                  <ul className={styles.preferenceList}>
                    {preferences.categories.map((c) => (
                      <li key={c.key}>
                        <strong>{c.name}</strong>
                        <span>
                          {c.mandatory ? "Mandatory" : "Optional"} · Push{" "}
                          {preferences.settings.categories[c.key]?.push
                            ? "on"
                            : "off"}{" "}
                          · Email{" "}
                          {preferences.settings.categories[c.key]?.email
                            ? "on"
                            : "off"}
                          {!c.enabled ? " · Category unavailable" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>
          <div
            role="tabpanel"
            id="notifications-panel-settings"
            aria-labelledby="notifications-tab-settings"
            hidden={tab !== "settings"}
          >
            {data.canManage && (
              <section className={layout.panel}>
                <details ref={createForm}>
                  <summary className={styles.formTitle}>
                    Plan a notification
                  </summary>
                  <p className={styles.muted}>
                    Save an optional notification, then review and send it from
                    Activity. A future schedule sets the earliest manual send
                    time; it does not send automatically.
                  </p>
                  <form
                    className={`${styles.form} ${styles.planForm}`}
                    onSubmit={createQueue}
                    onChange={() => {
                      requestId.current = null;
                    }}
                  >
                    <CustomerPicker
                      value={queueUserId}
                      onSelect={(id) => {
                        setQueueUserId(id);
                        requestId.current = null;
                      }}
                    />
                    <label>
                      Category
                      <select
                        value={queueCategory}
                        onChange={(e) => setQueueCategory(e.target.value)}
                      >
                        {data.categories
                          .filter((c) => !c.mandatory)
                          .map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Notification type
                      <select
                        name="eventType"
                        defaultValue="staff_notification"
                      >
                        <option value="staff_notification">
                          General message
                        </option>
                        <option value="goal_reminder">Goal reminder</option>
                        <option value="habit_reminder">Habit reminder</option>
                        <option value="savings_checkin">
                          Savings check-in
                        </option>
                      </select>
                    </label>
                    <label>
                      Channel
                      <select name="channel" defaultValue="email">
                        <option value="push" disabled>
                          Push — not connected
                        </option>
                        <option value="email">Email</option>
                      </select>
                    </label>
                    <label>
                      Schedule (optional)
                      <input name="scheduledAt" type="datetime-local" />
                    </label>
                    <button
                      disabled={busy || !queueUserId}
                      className={layout["btn-primary"]}
                    >
                      Save notification
                    </button>
                  </form>
                </details>
              </section>
            )}
            <section
              className={layout.panel}
              aria-labelledby="reengagement-heading"
            >
              <h2 id="reengagement-heading">Inactivity reminders</h2>
              <p className={styles.muted}>
                {data.automation?.configured && data.emailConfigured
                  ? "Automatic email is on. Eligible reminders are processed every minute in batches of up to 25."
                  : !data.automation?.enabled
                    ? "Automatic email is off. A server administrator must explicitly enable it; checking inactivity only plans reminders."
                    : !data.automation.configured
                      ? "The configured customer app URL is invalid. Ask the server administrator to correct or remove it."
                      : "Automatic email is enabled, but SMTP setup is required before messages can be sent."}
              </p>
              <div className={styles.ruleGrid}>
                <div>
                  <span>After no login</span>
                  <strong>3 days</strong>
                </div>
                <div>
                  <span>Minimum reminder gap</span>
                  <strong>7 days</strong>
                </div>
                <div>
                  <span>Preferences and quiet hours</span>
                  <strong>Respected</strong>
                </div>
              </div>
              <details className={styles.help}>
                <summary>Email content</summary>
                <p>
                  <strong>Your next small step with PurposeMint</strong>
                </p>
                <p>Hi [customer name],</p>
                <p>
                  It has been a few days since your last visit. Whenever you are
                  ready, PurposeMint is here to help you take your next small
                  step.
                </p>
                <p>
                  Check in on your goals, review your progress, or return to a
                  habit that matters to you. There is no pressure to catch up or
                  make a contribution.
                </p>
                <p>
                  The email includes a PurposeMint-branded layout, preference
                  guidance, and a plain-text fallback.{" "}
                  {data.automation?.customerAppLinkConfigured
                    ? "An Open PurposeMint button links to the configured customer app."
                    : "The customer app link is not connected; the email asks customers to open their app instead of showing a broken button."}
                </p>
              </details>
              <details className={styles.help}>
                <summary>Reminder rules</summary>
                <p>
                  One reminder per channel for each inactivity spell. A longer
                  category interval applies when configured. Returning
                  customers’ old reminders are cancelled. Automatic delivery
                  only applies to inactivity emails. Goal and habit triggers are
                  not connected.
                </p>
              </details>
              {data.canManage && (
                <button
                  className={layout["btn-toolbar-primary"]}
                  disabled={busy}
                  onClick={() => void scanReengagement()}
                >
                  Check inactivity now
                </button>
              )}
            </section>
            {data.canManage && (
              <section className={layout.panel}>
                <details>
                  <summary className={styles.formTitle}>
                    Notification categories
                  </summary>
                  <p className={styles.muted}>
                    Security, transactions and critical updates are always
                    required.
                  </p>
                  <label>
                    Category
                    <select
                      value={editing}
                      onChange={(e) => setEditing(e.target.value)}
                    >
                      <option value="">Create a category</option>
                      {data.categories
                        .filter((c) => !c.mandatory)
                        .map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <form
                    key={editing}
                    className={styles.form}
                    onSubmit={configure}
                  >
                    <label>
                      Name
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={80}
                        defaultValue={selected?.name}
                      />
                    </label>
                    <label>
                      Minimum reminder gap (hours)
                      <input
                        name="interval"
                        type="number"
                        required
                        min={1}
                        max={720}
                        defaultValue={selected?.minIntervalHours ?? 24}
                      />
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        name="enabled"
                        type="checkbox"
                        defaultChecked={selected?.enabled ?? true}
                      />
                      Category enabled
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        name="push"
                        type="checkbox"
                        defaultChecked={selected?.pushSupported ?? true}
                      />
                      Supports push
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        name="email"
                        type="checkbox"
                        defaultChecked={selected?.emailSupported ?? true}
                      />
                      Supports email
                    </label>
                    <button disabled={busy} className={layout["btn-primary"]}>
                      Save category
                    </button>
                  </form>
                </details>
              </section>
            )}
          </div>
        </>
      )}
      {tab === "email" && data.canConfigureEmail && (
        <div
          role="tabpanel"
          id="notifications-panel-email"
          aria-labelledby="notifications-tab-email"
        >
          <EmailSetup onChanged={query.reload} />
        </div>
      )}
      {sendJob && (
        <SendEmail
          key={sendJob.id}
          job={sendJob}
          onClose={() => setSendJob(null)}
          onComplete={async (message) => {
            setFeedback(message);
            await query.reload();
          }}
        />
      )}
    </main>
  );
}
