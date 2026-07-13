"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { FamilyProfileFieldLabel } from "@/components/family/family-profile-field-label";
import {
  canStopSponsorship,
  needsSponsorshipClarification,
  sponsorshipStatusClass,
  sponsorshipStatusKey,
} from "@/lib/sponsorship-status";
import { SponsorshipStoppedDetails } from "./sponsorship-stopped-details";
import { SponsorshipActionsPanel } from "./sponsorship-actions-panel";
import { SponsorshipLifecyclePanel } from "./sponsorship-lifecycle-panel";
import { formatSponsorshipDuration } from "@/lib/sponsorship-duration";
import styles from "@/app/dashboard/dashboard.module.css";

type SponsorshipDetailModalProps = {
  open: boolean;
  sponsorship: SponsorshipListItem | null;
  showDonor?: boolean;
  lifecycleRole?: "admin" | "donor";
  familyHref?: string;
  donorHref?: string;
  onEdit?: (sponsorship: SponsorshipListItem) => void;
  onStop?: (sponsorship: SponsorshipListItem) => void;
  onLifecycleUpdated?: (sponsorship: SponsorshipListItem) => void;
  onLifecycleError?: (message: string) => void;
  onClose: () => void;
};

function isPdfReceipt(url: string | null) {
  return url ? /\.pdf($|\?)/i.test(url) : false;
}

function formatValue(value: string | null | undefined, empty: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : empty;
}

export function SponsorshipDetailModal({
  open,
  sponsorship,
  showDonor = false,
  lifecycleRole,
  familyHref,
  donorHref,
  onEdit,
  onStop,
  onLifecycleUpdated,
  onLifecycleError,
  onClose,
}: SponsorshipDetailModalProps) {
  const { t, te } = useI18n();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !sponsorship) return null;

  const receiptIsPdf = isPdfReceipt(sponsorship.receiptUrl);
  const empty = t("common.empty");
  const durationLabel = formatSponsorshipDuration(sponsorship, t);

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
        aria-labelledby="sponsorship-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles["sponsorship-detail-header"]}>
          <div>
            <h2 id="sponsorship-detail-title" className={styles["modal-title"]}>
              {t("sponsorships.detail.title")}
            </h2>
            <p className={styles["sponsorship-detail-subtitle"]}>
              {sponsorship.familyPublicCode}
            </p>
          </div>
          <span
            className={`${styles["status-badge"]} ${sponsorshipStatusClass(sponsorshipStatusKey(sponsorship))}`}
          >
            {te("sponsorshipStatus", sponsorshipStatusKey(sponsorship))}
          </span>
        </div>

        {showDonor && (
          <section className={styles["sponsorship-detail-section"]}>
            <h3>
              <FamilyProfileFieldLabel icon="user">
                {t("sponsorships.detail.donorSection")}
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
                  {donorHref ? (
                    <Link href={donorHref} className={styles["text-link"]}>
                      {sponsorship.donorName}
                    </Link>
                  ) : (
                    sponsorship.donorName
                  )}
                </dd>
              </div>
              <div className={styles["family-detail-row"]}>
                <dt>
                  <FamilyProfileFieldLabel icon="email">
                    {t("donors.table.email")}
                  </FamilyProfileFieldLabel>
                </dt>
                <dd>{sponsorship.donorEmail}</dd>
              </div>
            </dl>
          </section>
        )}

        <section className={styles["sponsorship-detail-section"]}>
          <h3>
            <FamilyProfileFieldLabel icon="home">
              {t("sponsorships.detail.familySection")}
            </FamilyProfileFieldLabel>
          </h3>
          <dl className={styles["family-detail-list"]}>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="id">
                  {t("sponsorships.table.family")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>
                {familyHref ? (
                  <Link href={familyHref} className={styles["text-link"]}>
                    {sponsorship.familyPublicCode}
                  </Link>
                ) : (
                  sponsorship.familyPublicCode
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles["sponsorship-detail-section"]}>
          <h3>
            <FamilyProfileFieldLabel icon="list">
              {t("sponsorships.detail.requestSection")}
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
                {sponsorship.type === "full"
                  ? t("sponsorships.typeFull")
                  : t("sponsorships.typePartial")}
              </dd>
            </div>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="money">
                  {t("sponsorships.table.amount")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>
                ${sponsorship.monthlyAmount.toFixed(2)}/{t("sponsorships.perMonth")}
              </dd>
            </div>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="calendar">
                  {t("sponsorships.table.duration")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{durationLabel}</dd>
            </div>
            {typeof sponsorship.approvedTransferCount === "number" && (
              <div className={styles["family-detail-row"]}>
                <dt>
                  <FamilyProfileFieldLabel icon="hash">
                    {t("sponsorships.transferProof.approvedCountLabel")}
                  </FamilyProfileFieldLabel>
                </dt>
                <dd>{sponsorship.approvedTransferCount}</dd>
              </div>
            )}
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="clock">
                  {t("sponsorships.table.submitted")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{new Date(sponsorship.createdAt).toLocaleString()}</dd>
            </div>
            <div
              className={`${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`}
            >
              <dt>
                <FamilyProfileFieldLabel icon="text">
                  {t("sponsorships.notesLabel")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{formatValue(sponsorship.notes, empty)}</dd>
            </div>
            {sponsorship.adminNotes && sponsorship.status !== "stopped" && (
              <div
                className={`${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`}
              >
                <dt>
                  <FamilyProfileFieldLabel icon="text">
                    {t("sponsorships.adminNotesLabel")}
                  </FamilyProfileFieldLabel>
                </dt>
                <dd>{sponsorship.adminNotes}</dd>
              </div>
            )}
          </dl>
        </section>

        <SponsorshipStoppedDetails sponsorship={sponsorship} />

        {!showDonor && <SponsorshipActionsPanel sponsorship={sponsorship} />}

        {lifecycleRole && onLifecycleUpdated && onLifecycleError && (
          <SponsorshipLifecyclePanel
            sponsorship={sponsorship}
            role={lifecycleRole}
            onUpdated={onLifecycleUpdated}
            onError={onLifecycleError}
          />
        )}

        {sponsorship.receiptUrl && (
          <section className={styles["sponsorship-detail-section"]}>
            <h3>
              <FamilyProfileFieldLabel icon="link">
                {t("sponsorships.detail.receiptSection")}
              </FamilyProfileFieldLabel>
            </h3>
            <div className={styles["sponsorship-receipt-panel"]}>
              {receiptIsPdf ? (
                <div className={styles["sponsorship-receipt-pdf"]}>PDF</div>
              ) : (
                <a
                  href={sponsorship.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={sponsorship.receiptUrl}
                    alt={t("sponsorships.receiptLabel")}
                    className={styles["sponsorship-receipt-image"]}
                  />
                </a>
              )}
              <a
                href={sponsorship.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles["text-link"]}
              >
                {t("sponsorships.detail.openReceipt")}
              </a>
            </div>
          </section>
        )}

        <div className={styles["modal-actions"]}>
          {onStop && canStopSponsorship(sponsorship.status) && (
            <button
              type="button"
              className={`${styles["modal-btn-confirm"]} ${styles["modal-tone-danger"]}`}
              onClick={() => onStop(sponsorship)}
            >
              {t("sponsorships.actions.stop")}
            </button>
          )}
          {onEdit && needsSponsorshipClarification(sponsorship) && (
            <button
              type="button"
              className={`${styles["modal-btn-confirm"]} ${styles["modal-tone-primary"]}`}
              onClick={() => onEdit(sponsorship)}
            >
              {t("sponsorships.actions.update")}
            </button>
          )}
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
