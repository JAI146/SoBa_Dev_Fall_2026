"use client";

import { useEffect } from "react";
import { useI18n } from "@muakhah/i18n";
import type { TransferProofListItem } from "@muakhah/contracts";
import { FamilyProfileFieldLabel } from "@/components/family/family-profile-field-label";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import styles from "@/app/dashboard/dashboard.module.css";

type FamilyTransferProofDetailModalProps = {
  open: boolean;
  proof: TransferProofListItem | null;
  onClose: () => void;
};

function isPdfFile(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

export function FamilyTransferProofDetailModal({
  open,
  proof,
  onClose,
}: FamilyTransferProofDetailModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !proof) return null;

  return (
    <div
      className={styles["modal-overlay"]}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`${styles["modal-card"]} ${styles["modal-card--detail"]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-transfer-proof-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles["sponsorship-detail-header"]}>
          <div>
            <h2
              id="family-transfer-proof-detail-title"
              className={styles["modal-title"]}
            >
              {t("family.transfers.detailTitle")}
            </h2>
            <p className={styles["sponsorship-detail-subtitle"]}>
              {proof.donorName}
            </p>
          </div>
        </div>

        <section className={styles["sponsorship-detail-section"]}>
          <h3>
            <FamilyProfileFieldLabel icon="user">
              {t("family.donors.table.name")}
            </FamilyProfileFieldLabel>
          </h3>
          <dl className={styles["family-detail-list"]}>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="user">
                  {t("family.donors.table.name")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{proof.donorName}</dd>
            </div>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="email">
                  {t("family.donors.table.email")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{proof.donorEmail}</dd>
            </div>
          </dl>
        </section>

        <section className={styles["sponsorship-detail-section"]}>
          <h3>
            <FamilyProfileFieldLabel icon="money">
              {t("sponsorships.transferProof.title")}
            </FamilyProfileFieldLabel>
          </h3>
          <dl className={styles["family-detail-list"]}>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="money">
                  {t("sponsorships.transferProof.amountLabel")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{formatTransferAmount(proof.amount)}</dd>
            </div>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="calendar">
                  {t("sponsorships.transferProof.transferDateLabel")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{formatTransferDate(proof.transferDate)}</dd>
            </div>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="building">
                  {t("sponsorships.transferProof.receivingMethodLabel")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>
                {proof.receivingMethodType
                  ? t(`families.receivingMethods.${proof.receivingMethodType}`)
                  : "—"}
              </dd>
            </div>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="clock">
                  {t("sponsorships.transferProof.submittedAt")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{new Date(proof.createdAt).toLocaleString()}</dd>
            </div>
            {proof.reviewedAt && (
              <div className={styles["family-detail-row"]}>
                <dt>
                  <FamilyProfileFieldLabel icon="clock">
                    {t("family.donors.detail.reviewedDate")}
                  </FamilyProfileFieldLabel>
                </dt>
                <dd>{new Date(proof.reviewedAt).toLocaleString()}</dd>
              </div>
            )}
            {proof.notes && (
              <div
                className={`${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`}
              >
                <dt>
                  <FamilyProfileFieldLabel icon="text">
                    {t("sponsorships.transferProof.notesLabel")}
                  </FamilyProfileFieldLabel>
                </dt>
                <dd>{proof.notes}</dd>
              </div>
            )}
          </dl>

          <div className={styles["sponsorship-receipt-panel"]}>
            {isPdfFile(proof.fileUrl) ? (
              <div className={styles["sponsorship-receipt-pdf"]}>PDF</div>
            ) : (
              <a href={proof.fileUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={proof.fileUrl}
                  alt={t("sponsorships.transferProof.viewFile")}
                  className={styles["sponsorship-receipt-image"]}
                />
              </a>
            )}
            <a
              href={proof.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles["text-link"]}
            >
              <FamilyProfileFieldLabel icon="link">
                {t("sponsorships.transferProof.viewFile")}
              </FamilyProfileFieldLabel>
            </a>
          </div>
        </section>

        <div className={styles["modal-actions"]}>
          <button
            type="button"
            className={styles["modal-btn-cancel"]}
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
