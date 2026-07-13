"use client";

import { useEffect } from "react";
import styles from "@/app/dashboard/dashboard.module.css";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className={styles["modal-overlay"]} onClick={onCancel}>
      <div
        className={styles["modal-card"]}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className={styles["modal-title"]}>
          {title}
        </h2>
        <p className={styles["modal-message"]}>{message}</p>
        <div className={styles["modal-actions"]}>
          <button
            type="button"
            className={styles["modal-btn-cancel"]}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={[
              styles["modal-btn-confirm"],
              styles["modal-tone-danger"],
            ].join(" ")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
