"use client";

import { useEffect } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorTicketDetail } from "@muakhah/contracts";
import { FormFieldLabel } from "@/components/forms/form-field-label";
import { FormIcon } from "@/components/forms/form-icons";
import { sponsorTicketStatusClass } from "@/lib/sponsor-ticket-status";
import styles from "@/app/dashboard/dashboard.module.css";

type DonorTicketDetailModalProps = {
  open: boolean;
  detail: SponsorTicketDetail | null;
  loading?: boolean;
  reply: string;
  submitting?: boolean;
  onReplyChange: (value: string) => void;
  onSubmitReply: () => void;
  onClose: () => void;
};

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m22 2-7 20-4-9-9-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2 11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DonorTicketDetailModal({
  open,
  detail,
  loading = false,
  reply,
  submitting = false,
  onReplyChange,
  onSubmitReply,
  onClose,
}: DonorTicketDetailModalProps) {
  const { t, te, locale } = useI18n();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles["modal-overlay"]}
      role="presentation"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className={`${styles["modal-card"]} ${styles["modal-card--detail"]} ${styles["ticket-detail-modal"]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="donor-ticket-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !detail ? (
          <p>{t("common.loading")}</p>
        ) : (
          <>
            <div className={styles["sponsorship-detail-header"]}>
              <div>
                <h2 id="donor-ticket-detail-title" className={styles["modal-title"]}>
                  <span className={styles["ticket-detail-title"]}>
                    <FormIcon name="list" className={styles["ticket-detail-title__icon"]} />
                    {detail.subject}
                  </span>
                </h2>
                <p className={styles["sponsorship-detail-subtitle"]}>
                  <span className={styles["ticket-detail-meta"]}>
                    <FormIcon name="home" className={styles["ticket-detail-meta__icon"]} />
                    {detail.familyPublicCode}
                  </span>
                </p>
              </div>
              <span
                className={`${styles["status-badge"]} ${sponsorTicketStatusClass(detail.status)}`}
              >
                {te("sponsorTicketStatus", detail.status)}
              </span>
            </div>

            <section className={styles["ticket-thread-section"]}>
              <h3 className={styles["ticket-thread-label"]}>
                <FormFieldLabel icon="text">
                  {t("sponsorships.tickets.conversationLabel")}
                </FormFieldLabel>
              </h3>
              <div className={styles["ticket-thread"]}>
                {detail.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles["ticket-message"]} ${
                      message.senderRole === "admin"
                        ? styles["ticket-message--admin"]
                        : styles["ticket-message--donor"]
                    }`}
                  >
                    <div className={styles["ticket-message-meta"]}>
                      <strong className={styles["ticket-message-meta__name"]}>
                        <FormIcon
                          name={message.senderRole === "admin" ? "users" : "user"}
                          className={styles["ticket-detail-meta__icon"]}
                        />
                        {message.senderName}
                      </strong>
                      <time>
                        {new Date(message.createdAt).toLocaleString(locale)}
                      </time>
                    </div>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>
            </section>

            {detail.status !== "resolved" ? (
              <div className={styles["ticket-reply-form"]}>
                <label htmlFor="donor-ticket-reply">
                  <FormFieldLabel icon="text">
                    {t("sponsorships.tickets.replyLabel")}
                  </FormFieldLabel>
                </label>
                <textarea
                  id="donor-ticket-reply"
                  rows={4}
                  value={reply}
                  onChange={(e) => onReplyChange(e.target.value)}
                  placeholder={t("sponsorships.tickets.replyPlaceholder")}
                  disabled={submitting}
                />
                <div className={styles["modal-actions"]}>
                  <button
                    type="button"
                    className={styles["modal-btn-cancel"]}
                    onClick={onClose}
                    disabled={submitting}
                  >
                    <CloseIcon />
                    {t("common.close")}
                  </button>
                  <button
                    type="button"
                    className={`${styles["modal-btn-confirm"]} ${styles["modal-tone-primary"]}`}
                    disabled={submitting || !reply.trim()}
                    onClick={onSubmitReply}
                  >
                    <SendIcon />
                    {submitting
                      ? t("sponsorships.tickets.replying")
                      : t("sponsorships.tickets.replyCta")}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles["modal-actions"]}>
                <button
                  type="button"
                  className={styles["modal-btn-cancel"]}
                  onClick={onClose}
                >
                  <CloseIcon />
                  {t("common.close")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
