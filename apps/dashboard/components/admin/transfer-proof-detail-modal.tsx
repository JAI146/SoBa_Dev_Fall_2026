"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type {
  TransferProofDetail,
  TransferProofStatusValue,
} from "@muakhah/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import {
  TRANSFER_PROOF_ADMIN_STATUS_OPTIONS,
  transferProofStatusClass,
} from "@/lib/transfer-proof-status";
import { FamilyProfileFieldLabel } from "@/components/family/family-profile-field-label";
import styles from "@/app/dashboard/dashboard.module.css";

type TransferProofDetailModalProps = {
  open: boolean;
  detail: TransferProofDetail | null;
  loading?: boolean;
  onClose: () => void;
  onUpdated: (detail: TransferProofDetail) => void;
  onError: (message: string) => void;
};

function isPdfFile(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

export function TransferProofDetailModal({
  open,
  detail,
  loading = false,
  onClose,
  onUpdated,
  onError,
}: TransferProofDetailModalProps) {
  const { t, te } = useI18n();
  const [selectedStatus, setSelectedStatus] = useState<TransferProofStatusValue>("pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!detail) return;
    setSelectedStatus(detail.status);
    setAdminNotes(detail.adminNotes ?? "");
  }, [detail]);

  if (!open) return null;

  async function handleUpdateStatus() {
    if (!detail) return;

    setSubmitting(true);
    onError("");
    try {
      const data = await apiRequest<{ transferProof: TransferProofDetail }>(
        `/admin/transfer-proofs/${encodeURIComponent(detail.id)}/review`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: selectedStatus,
            adminNotes: adminNotes.trim() || null,
          }),
        },
        getToken(),
      );
      onUpdated(data.transferProof);
      onClose();
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : t("sponsorships.transferProof.reviewFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

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
        aria-labelledby="transfer-proof-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles["sponsorship-detail-header"]}>
          <div>
            <h2 id="transfer-proof-detail-title" className={styles["modal-title"]}>
              {t("sponsorships.transferProof.detailTitle")}
            </h2>
            {detail && (
              <p className={styles["sponsorship-detail-subtitle"]}>
                {detail.familyPublicCode}
              </p>
            )}
          </div>
          {detail && (
            <span
              className={`${styles["status-badge"]} ${transferProofStatusClass(detail.status)}`}
            >
              {te("transferProofStatus", detail.status)}
            </span>
          )}
        </div>

        {loading ? (
          <p>{t("common.loading")}</p>
        ) : detail ? (
          <>
            <section className={styles["sponsorship-detail-section"]}>
              <h3>
                <FamilyProfileFieldLabel icon="home">
                  {t("sponsorships.transferProof.viewFamily")}
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
                      href={`/dashboard/admin/families/${encodeURIComponent(detail.familyId)}`}
                      className={styles["text-link"]}
                    >
                      {detail.familyPublicCode}
                    </Link>
                  </dd>
                </div>
              </dl>
            </section>

            <section className={styles["sponsorship-detail-section"]}>
              <h3>
                <FamilyProfileFieldLabel icon="user">
                  {t("sponsorships.transferProof.viewDonor")}
                </FamilyProfileFieldLabel>
              </h3>
              <dl className={styles["family-detail-list"]}>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="user">
                      {t("donors.table.name")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>
                    <Link
                      href={`/dashboard/admin/donors/${encodeURIComponent(detail.donorUserId)}`}
                      className={styles["text-link"]}
                    >
                      {detail.donorName}
                    </Link>
                  </dd>
                </div>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="email">
                      {t("donors.table.email")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>{detail.donorEmail}</dd>
                </div>
              </dl>
            </section>

            <section className={styles["sponsorship-detail-section"]}>
              <h3>
                <FamilyProfileFieldLabel icon="list">
                  {t("sponsorships.transferProof.viewSponsorship")}
                </FamilyProfileFieldLabel>
              </h3>
              <dl className={styles["family-detail-list"]}>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="list">
                      {t("sponsorships.table.type")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>
                    {detail.sponsorshipType === "full"
                      ? t("sponsorships.typeFull")
                      : t("sponsorships.typePartial")}
                  </dd>
                </div>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="money">
                      {t("sponsorships.transferProof.monthlyAmount")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>${detail.monthlyAmount.toFixed(2)}</dd>
                </div>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="hash">
                      {t("sponsorships.table.status")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>{te("sponsorshipStatus", detail.sponsorshipStatus)}</dd>
                </div>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="clock">
                      {t("sponsorships.transferProof.approvedCountLabel")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>{detail.approvedTransferCount}</dd>
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
                  <dd>{formatTransferAmount(detail.amount)}</dd>
                </div>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="calendar">
                      {t("sponsorships.transferProof.transferDateLabel")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>{formatTransferDate(detail.transferDate)}</dd>
                </div>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="building">
                      {t("sponsorships.transferProof.receivingMethodLabel")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>
                    {detail.receivingMethodType
                      ? t(`families.receivingMethods.${detail.receivingMethodType}`)
                      : "—"}
                  </dd>
                </div>
                <div className={styles["family-detail-row"]}>
                  <dt>
                    <FamilyProfileFieldLabel icon="clock">
                      {t("sponsorships.transferProof.submittedAt")}
                    </FamilyProfileFieldLabel>
                  </dt>
                  <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
                </div>
                {detail.notes && (
                  <div
                    className={`${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`}
                  >
                    <dt>
                      <FamilyProfileFieldLabel icon="text">
                        {t("sponsorships.transferProof.notesLabel")}
                      </FamilyProfileFieldLabel>
                    </dt>
                    <dd>{detail.notes}</dd>
                  </div>
                )}
              </dl>

              <div className={styles["sponsorship-receipt-panel"]}>
                {isPdfFile(detail.fileUrl) ? (
                  <div className={styles["sponsorship-receipt-pdf"]}>PDF</div>
                ) : (
                  <a
                    href={detail.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={detail.fileUrl}
                      alt={t("sponsorships.transferProof.viewFile")}
                      className={styles["sponsorship-receipt-image"]}
                    />
                  </a>
                )}
                <a
                  href={detail.fileUrl}
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

            <section className={styles["sponsorship-detail-section"]}>
              <h3>
                <FamilyProfileFieldLabel icon="list">
                  {t("sponsorships.transferProof.statusLabel")}
                </FamilyProfileFieldLabel>
              </h3>
              <div className={styles["sponsorship-status-form"]}>
                <div className={styles["form-field"]}>
                  <label htmlFor="transfer-proof-status">
                    <FamilyProfileFieldLabel icon="hash">
                      {t("sponsorships.lifecycle.updateTo")}
                    </FamilyProfileFieldLabel>
                  </label>
                  <select
                    id="transfer-proof-status"
                    value={selectedStatus}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as TransferProofStatusValue)
                    }
                  >
                    {TRANSFER_PROOF_ADMIN_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {te("transferProofStatus", status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles["form-field"]}>
                  <label htmlFor="transfer-proof-admin-notes">
                    <FamilyProfileFieldLabel icon="text">
                      {t("sponsorships.transferProof.statusNotesLabel")}
                    </FamilyProfileFieldLabel>
                  </label>
                  <textarea
                    id="transfer-proof-admin-notes"
                    rows={3}
                    maxLength={2000}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={t("sponsorships.transferProof.statusNotesPlaceholder")}
                  />
                </div>
                <button
                  type="button"
                  className={styles["btn-primary-inline"]}
                  disabled={submitting}
                  onClick={() => void handleUpdateStatus()}
                >
                  {submitting
                    ? t("common.saving")
                    : t("sponsorships.transferProof.updateStatus")}
                </button>
              </div>
            </section>
          </>
        ) : (
          <p className={styles["form-hint"]}>
            {t("sponsorships.transferProof.loadFailed")}
          </p>
        )}

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
