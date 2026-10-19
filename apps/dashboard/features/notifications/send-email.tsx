"use client";
import { useRef, useState } from "react";
import {
  notificationEmailInputSchema,
  notificationEmailResultSchema,
  notificationEmailDraft,
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
  const [draft, setDraft] = useState(() => notificationEmailDraft(job));
  const [confirmed, setConfirmed] = useState(false);
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
      <div className={styles.composer}>
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
              value={draft.subject}
              onChange={(event) => {
                setDraft((previous) => ({
                  ...previous,
                  subject: event.target.value,
                }));
                setConfirmed(false);
              }}
            />
          </label>
          <label>
            Message
            <textarea
              name="message"
              aria-label="Message"
              rows={7}
              required
              maxLength={3000}
              disabled={busy}
              className={styles.message}
              value={draft.message}
              onChange={(event) => {
                setDraft((previous) => ({
                  ...previous,
                  message: event.target.value,
                }));
                setConfirmed(false);
              }}
            />
          </label>
          <p className={styles.note}>
            A suggested message is filled in for this notification. Review or
            edit it before sending. The email includes a PurposeMint-branded
            layout and a plain-text fallback. Customer preferences, quiet hours,
            and sending limits are checked before sending.
          </p>
          <button
            type="button"
            disabled={busy}
            className={base["btn-toolbar-primary"]}
            onClick={() => {
              setDraft(notificationEmailDraft(job));
              setConfirmed(false);
            }}
          >
            Restore suggested message
          </button>
          <details className={styles.preview}>
            <summary>Review email content</summary>
            <strong className={styles.brand}>PurposeMint</strong>
            <h3>{draft.subject || "Add a subject"}</h3>
            <p className={styles.previewMessage}>
              {draft.message || "Add a message"}
            </p>
          </details>
          <label className={styles.check}>
            <input
              type="checkbox"
              required
              disabled={busy}
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I have checked the recipient and message.
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
      </div>
    </Dialog>
  );
}
