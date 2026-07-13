"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { FormFieldLabel } from "@/components/forms/form-field-label";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "@/app/dashboard/dashboard.module.css";
import authStyles from "@/app/auth.module.css";

type IssueTicketModalProps = {
  sponsorship: SponsorshipListItem;
  open: boolean;
  onClose: () => void;
};

function TicketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function IssueTicketModal({
  sponsorship,
  open,
  onClose,
}: IssueTicketModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSubject("");
    setMessage("");
    setError(null);
    setSubmitting(false);
  }, [open, sponsorship.id]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  if (!open || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(
        "/donor/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            sponsorshipId: sponsorship.id,
            subject: subject.trim(),
            message: message.trim(),
          }),
        },
        getToken(),
      );
      onClose();
      router.push("/dashboard/visitor/tickets");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("sponsorships.tickets.createFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className={`${styles["modal-overlay"]} ${styles["issue-ticket-overlay"]}`}
      role="presentation"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className={`${styles["modal-card"]} ${styles["issue-ticket-modal"]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-ticket-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles["issue-ticket-modal__header"]}>
          <span className={styles["issue-ticket-modal__icon"]} aria-hidden>
            <TicketIcon />
          </span>
          <div className={styles["issue-ticket-modal__heading"]}>
            <h2 id="issue-ticket-title" className={styles["modal-title"]}>
              {t("sponsorships.tickets.createTitle")}
            </h2>
            <p className={styles["issue-ticket-modal__hint"]}>
              {t("sponsorships.tickets.createHint", {
                code: sponsorship.familyPublicCode,
              })}
            </p>
          </div>
          <span className={styles["issue-ticket-modal__family-chip"]}>
            {sponsorship.familyPublicCode}
          </span>
        </div>

        {error && (
          <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className={styles["issue-ticket-modal__form"]}
        >
          <div className={styles["form-field"]}>
            <label htmlFor="ticket-subject">
              <FormFieldLabel icon="list">
                {t("sponsorships.tickets.subjectLabel")}
              </FormFieldLabel>
            </label>
            <input
              id="ticket-subject"
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("sponsorships.tickets.subjectPlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className={styles["form-field"]}>
            <label htmlFor="ticket-message">
              <FormFieldLabel icon="text">
                {t("sponsorships.tickets.messageLabel")}
              </FormFieldLabel>
            </label>
            <textarea
              id="ticket-message"
              required
              rows={5}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("sponsorships.tickets.messagePlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className={styles["modal-actions"]}>
            <button
              type="button"
              className={styles["modal-btn-cancel"]}
              onClick={onClose}
              disabled={submitting}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className={`${styles["modal-btn-confirm"]} ${styles["modal-tone-primary"]}`}
              disabled={submitting}
            >
              {submitting
                ? t("sponsorships.tickets.submitting")
                : t("sponsorships.tickets.submitCta")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
