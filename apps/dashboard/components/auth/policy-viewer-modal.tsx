"use client";

import { useEffect } from "react";
import { useI18n } from "@muakhah/i18n";
import type { LegalDocumentPublic } from "@muakhah/contracts";
import styles from "../../app/auth.module.css";

type PolicyViewerModalProps = {
  document: LegalDocumentPublic | null;
  onClose: () => void;
};

export function PolicyViewerModal({ document, onClose }: PolicyViewerModalProps) {
  const { t, locale, dir } = useI18n();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!document) return null;

  const title = t(`admin.legal.policies.${document.slug}`);
  const html = locale === "ar" ? document.contentAr : document.contentEn;

  return (
    <div
      className={styles["policy-modal-backdrop"]}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles["policy-modal"]}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles["policy-modal-header"]}>
          <h2 id="policy-modal-title">{title}</h2>
          <button
            type="button"
            className={styles["policy-modal-close"]}
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
        <div
          className={styles["policy-modal-body"]}
          dangerouslySetInnerHTML={{
            __html: html || `<p>${t("auth.register.policyEmpty")}</p>`,
          }}
        />
      </div>
    </div>
  );
}
