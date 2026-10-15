"use client";
import { useRef, useState } from "react";
import {
  notificationEmailInputSchema,
  notificationEmailResultSchema,
  type NotificationJobPublic,
} from "@purposemint/contracts";
import { Dialog } from "@/components/common/dialog";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./email.module.css";
export function SendEmail({
  job,
  onClose,
  onComplete,
}: {
  job: NotificationJobPublic;
  onClose: () => void;
  onComplete: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const sending = useRef(false);
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = new FormData(event.currentTarget);
    const input = notificationEmailInputSchema.safeParse({
      recipientEmail: job.recipientEmail,
      subject: form.get("subject"),
      message: form.get("message"),
    });
    if (!input.success) {
      setError(input.error.issues.map((i) => i.message).join(" "));
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest(
        `/admin/notifications/${job.id}/send-email`,
        { method: "POST", body: JSON.stringify(input.data) },
        getToken(),
        notificationEmailResultSchema,
      );
      await onComplete(result.message);
      onClose();
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : "Unable to send email."} If the connection was interrupted, refresh Activity before trying again.`,
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title="Send email"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className={styles.recipient}>
        To: <strong>{job.recipientName}</strong>
        <br />
        {job.recipientEmail}
      </p>
      {error && (
        <p className={base["inline-error"]} role="alert">
          {error}
        </p>
      )}
      <form onSubmit={send} className={base["editor-form"]}>
        <label>
          Subject
          <input
            name="subject"
            autoFocus
            required
            maxLength={120}
            disabled={busy}
          />
        </label>
        <label>
          Message
          <textarea
            name="message"
            rows={7}
            required
            maxLength={3000}
            disabled={busy}
            className={styles.message}
          />
        </label>
        <p className={styles.note}>
          Plain text email. Customer preferences, quiet hours, and sending
          limits are checked before sending.
        </p>
        <label className={styles.check}>
          <input type="checkbox" required disabled={busy} />I have checked the
          recipient and message.
        </label>
        <div className={base["modal-actions"]}>
          <button
            type="button"
            className={base["btn-toolbar-primary"]}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className={base["btn-primary"]}
            disabled={busy || !job.recipientEmail}
          >
            {busy ? "Sending…" : "Send email now"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
