"use client";

import { useEffect, useId, useRef } from "react";
import styles from "@/app/dashboard/dashboard.module.css";

export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      const dialogs = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      if (
        event.key === "Escape" &&
        dialogs.item(dialogs.length - 1) === dialogRef.current
      )
        onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles["modal-overlay"]} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles["modal-card"]}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles["modal-heading"]}>
          <h2 id={titleId} className={styles["modal-title"]}>
            {title}
          </h2>
          <button
            type="button"
            className={styles["modal-close"]}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
