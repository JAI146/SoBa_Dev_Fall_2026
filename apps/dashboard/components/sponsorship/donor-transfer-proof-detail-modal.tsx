"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@muakhah/i18n";
import type { TransferProofListItem } from "@muakhah/contracts";
import { FamilyProfileFieldLabel } from "@/components/family/family-profile-field-label";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import { transferProofStatusClass } from "@/lib/transfer-proof-status";
import styles from "@/app/dashboard/dashboard.module.css";
import { buildLandingFamilyUrl } from "@/lib/landing-links";

type DonorTransferProofDetailModalProps = {
  open: boolean;
  proof: TransferProofListItem | null;
  onClose: () => void;
};

function isPdfFile(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

export function DonorTransferProofDetailModal({
  open,
  proof,
  onClose,
}: DonorTransferProofDetailModalProps) {
  const { t, te } = useI18n();

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
        aria-labelledby="donor-transfer-proof-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles["sponsorship-detail-header"]}>
          <div>
            <h2 id="donor-transfer-proof-detail-title" className={styles["modal-title"]}>
              {t("sponsorships.transferProof.detailTitle")}
            </h2>
            <p className={styles["sponsorship-detail-subtitle"]}>
              {proof.familyPublicCode}
            </p>
          </div>
          <span
            className={`${styles["status-badge"]} ${transferProofStatusClass(proof.status)}`}
          >
            {te("transferProofStatus", proof.status)}
          </span>
        </div>

        <section className={styles["sponsorship-detail-section"]}>
          <h3>
            <FamilyProfileFieldLabel icon="home">
              {t("sponsorships.detail.familySection")}
            </FamilyProfileFieldLabel>
          </h3>
          <dl className={styles["family-detail-list"]}>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="hash">
                  {t("sponsorships.table.family")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>
                <Link
                  href={buildLandingFamilyUrl(proof.familyPublicCode)}
                  className={styles["text-link"]}
                >
                  {proof.familyPublicCode}
                </Link>
              </dd>
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

        {proof.adminNotes && (
          <section className={styles["sponsorship-detail-section"]}>
            <h3>
              <FamilyProfileFieldLabel icon="text">
                {t("sponsorships.transferProof.adminNotesLabel")}
              </FamilyProfileFieldLabel>
            </h3>
            <div className={styles["transfer-proof-admin-notes"]}>
              {proof.adminNotes}
            </div>
          </section>
        )}

        <div className={styles["modal-actions"]}>
          <Link
            href="/dashboard/visitor/sponsorships"
            className={styles["btn-secondary-inline"]}
          >
            {t("sponsorships.tickets.backToSponsorships")}
          </Link>
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
