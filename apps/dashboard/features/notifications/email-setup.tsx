"use client";
import { useState } from "react";
import {
  notificationSmtpResponseSchema,
  notificationSmtpInputSchema,
  notificationEmailTestSchema,
  notificationActionResponseSchema,
} from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./email.module.css";
export function EmailSetup({ onChanged }: { onChanged: () => Promise<void> }) {
  const query = useAdminQuery(
    "/admin/notifications/smtp",
    notificationSmtpResponseSchema,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    const input = notificationSmtpInputSchema.safeParse({
      smtpServer: data.get("server"),
      smtpPort: data.get("port"),
      smtpEmailUser: data.get("username"),
      fromEmail: data.get("from"),
      smtpEnabled: data.get("enabled") === "on",
      ...(data.get("password")
        ? { smtpEmailPassword: data.get("password") }
        : {}),
    });
    if (!input.success) {
      setError(input.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(
        "/admin/notifications/smtp",
        { method: "POST", body: JSON.stringify(input.data) },
        getToken(),
        notificationSmtpResponseSchema,
      );
      form.reset();
      setFeedback("Email settings saved. Send a test to check the connection.");
      await query.reload();
      await onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save email settings.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function test(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = notificationEmailTestSchema.safeParse({
      email: new FormData(event.currentTarget).get("test-email"),
    });
    if (!input.success) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const result = await apiRequest(
        "/admin/notifications/email-test",
        { method: "POST", body: JSON.stringify(input.data) },
        getToken(),
        notificationActionResponseSchema,
      );
      setFeedback(result.message);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send the test.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (!query.data) return <DashboardLoading />;
  const settings = query.data.settings;
  return (
    <section className={`${base.panel} ${styles.setup}`}>
      <h2>Email connection</h2>
      <p className={styles.note}>
        Use the SMTP settings provided by your email administrator. This is the
        shared account email sender. Saving settings does not send messages
        automatically.
      </p>
      {error && (
        <p className={base["inline-error"]} role="alert">
          {error}
        </p>
      )}
      {feedback && (
        <p className={styles.feedback} role="status">
          {feedback}
        </p>
      )}
      <form
        key={JSON.stringify(settings)}
        className={base["editor-form"]}
        onSubmit={save}
      >
        <fieldset className={styles.fields} disabled={busy}>
          <div className={styles.grid}>
            <label>
              SMTP server
              <input
                name="server"
                required
                defaultValue={settings?.smtpServer}
                placeholder="smtp.your-provider.com"
              />
            </label>
            <label>
              Port
              <input
                name="port"
                type="number"
                required
                min={1}
                max={65535}
                defaultValue={settings?.smtpPort ?? 587}
              />
            </label>
            <label>
              SMTP username
              <input
                name="username"
                required
                defaultValue={settings?.smtpEmailUser}
              />
            </label>
            <label>
              Sender email
              <input
                name="from"
                type="email"
                required
                defaultValue={settings?.fromEmail}
              />
            </label>
            <label>
              SMTP password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={
                  settings?.hasPassword
                    ? "Leave blank to keep saved password"
                    : "Enter SMTP password"
                }
              />
            </label>
          </div>
          <p className={styles.note}>
            Port 587 uses STARTTLS; 465 uses SSL. The saved password is never
            returned to this screen.
          </p>
          <label className={styles.check}>
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={settings?.smtpEnabled ?? true}
            />
            Enable email sending
          </label>
          <button className={base["btn-primary"]} disabled={busy}>
            Save email settings
          </button>
        </fieldset>
      </form>
      <form onSubmit={test} className={`${base["editor-form"]} ${styles.test}`}>
        <h3>Test your connection</h3>
        <label>
          Test inbox
          <input name="test-email" type="email" required />
        </label>
        <p className={styles.note}>
          Use a real inbox. Demo addresses ending in .local cannot receive
          email.
        </p>
        <button
          className={base["btn-primary"]}
          disabled={busy || !query.data.configured}
        >
          Send test email
        </button>
      </form>
    </section>
  );
}
