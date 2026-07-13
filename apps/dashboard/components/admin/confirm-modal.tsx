"use client";

import { useEffect } from "react";
import { useI18n } from "@muakhah/i18n";
import styles from "../../app/dashboard/dashboard.module.css";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "primary";
  loading?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "primary",
  loading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useI18n();
  const resolvedConfirm = confirmLabel ?? t("common.confirm");
  const resolvedCancel = cancelLabel ?? t("common.cancel");
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className={styles["modal-overlay"]}
      role="presentation"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className={styles["modal-card"]}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className={styles["modal-title"]}>
          {title}
        </h2>
        <p className={styles["modal-message"]}>{message}</p>
        {children}
        <div className={styles["modal-actions"]}>
          <button
            type="button"
            className={styles["modal-btn-cancel"]}
            onClick={onCancel}
            disabled={loading}
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            className={`${styles["modal-btn-confirm"]} ${styles[`modal-tone-${tone}`]}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t("common.pleaseWait") : resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
