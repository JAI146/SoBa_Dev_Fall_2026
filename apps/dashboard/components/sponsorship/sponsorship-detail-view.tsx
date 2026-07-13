"use client";

import Link from "next/link";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { FamilyProfileFieldLabel } from "@/components/family/family-profile-field-label";
import {
  formatLocalDate,
  formatLocalTime,
} from "@/lib/format-local-datetime";
import { canStopSponsorship, sponsorshipStatusClass } from "@/lib/sponsorship-status";
import { SponsorshipStoppedDetails } from "./sponsorship-stopped-details";
import { ReceivingMethodsDisplay } from "@/components/donor/receiving-methods-display";
import { SponsorshipActionsPanel } from "./sponsorship-actions-panel";
import { formatSponsorshipDuration } from "@/lib/sponsorship-duration";
import styles from "@/app/dashboard/dashboard.module.css";

type SponsorshipDetailViewProps = {
  sponsorship: SponsorshipListItem;
  showDonor?: boolean;
  familyHref?: string;
  onStop?: (sponsorship: SponsorshipListItem) => void;
};

function isPdfReceipt(url: string | null) {
  return url ? /\.pdf($|\?)/i.test(url) : false;
}

function formatValue(value: string | null | undefined, empty: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : empty;
}

export function SponsorshipDetailView({
  sponsorship,
  showDonor = false,
  familyHref,
  onStop,
}: SponsorshipDetailViewProps) {
  const { t, te, locale } = useI18n();
  const receiptIsPdf = isPdfReceipt(sponsorship.receiptUrl);
  const empty = t("common.empty");
  const durationLabel = formatSponsorshipDuration(sponsorship, t);

  return (
    <div className={`${styles.card} ${styles["card-wide"]}`}>
      <div className={styles["sponsorship-detail-header"]}>
        <div>
          <h1 className={styles["modal-title"]} style={{ margin: 0 }}>
            {t("sponsorships.detail.title")}
          </h1>
          <p className={styles["sponsorship-detail-subtitle"]}>
            {sponsorship.familyPublicCode}
          </p>
        </div>
        <span
          className={`${styles["status-badge"]} ${sponsorshipStatusClass(sponsorship.status)}`}
        >
          {te("sponsorshipStatus", sponsorship.status)}
        </span>
      </div>

      {showDonor && (
        <section className={styles["sponsorship-detail-section"]}>
          <h3>{t("sponsorships.detail.donorSection")}</h3>
          <dl className={styles["family-detail-list"]}>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="user">
                  {t("donors.table.name")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{sponsorship.donorName}</dd>
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
        <h3>{t("sponsorships.detail.familySection")}</h3>
        <dl className={styles["family-detail-list"]}>
          <div className={styles["family-detail-row"]}>
            <dt>
              <FamilyProfileFieldLabel icon="home">
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
        <h3>{t("sponsorships.detail.requestSection")}</h3>
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
              <FamilyProfileFieldLabel icon="hash">
                {t("sponsorships.table.duration")}
              </FamilyProfileFieldLabel>
            </dt>
            <dd>{durationLabel}</dd>
          </div>
          <div className={styles["family-detail-row"]}>
            <dt>
              <FamilyProfileFieldLabel icon="calendar">
                {t("family.donors.detail.donatedDate")}
              </FamilyProfileFieldLabel>
            </dt>
            <dd>{formatLocalDate(sponsorship.createdAt, locale)}</dd>
          </div>
          <div className={styles["family-detail-row"]}>
            <dt>
              <FamilyProfileFieldLabel icon="clock">
                {t("family.donors.detail.donatedTime")}
              </FamilyProfileFieldLabel>
            </dt>
            <dd>{formatLocalTime(sponsorship.createdAt, locale)}</dd>
          </div>
          {sponsorship.reviewedAt && (
            <>
              <div className={styles["family-detail-row"]}>
                <dt>
                  <FamilyProfileFieldLabel icon="calendar">
                    {t("family.donors.detail.reviewedDate")}
                  </FamilyProfileFieldLabel>
                </dt>
                <dd>{formatLocalDate(sponsorship.reviewedAt, locale)}</dd>
              </div>
              <div className={styles["family-detail-row"]}>
                <dt>
                  <FamilyProfileFieldLabel icon="clock">
                    {t("family.donors.detail.reviewedTime")}
                  </FamilyProfileFieldLabel>
                </dt>
                <dd>{formatLocalTime(sponsorship.reviewedAt, locale)}</dd>
              </div>
            </>
          )}
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
          {(sponsorship.selectedReceivingMethods ?? []).length > 0 && (
            <div
              className={`${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`}
            >
              <dt>
                <FamilyProfileFieldLabel icon="list">
                  {t("sponsorships.receivingMethodsLabel")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>
                {sponsorship.canViewReceivingDetails ? (
                  <ReceivingMethodsDisplay
                    methods={sponsorship.selectedReceivingMethods}
                    variant="card"
                  />
                ) : (
                  sponsorship.selectedReceivingMethods
                    .map((method) => t(`families.receivingMethods.${method.method}`))
                    .join(", ")
                )}
              </dd>
            </div>
          )}
          {sponsorship.initialMessage && (
            <div
              className={`${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`}
            >
              <dt>
                <FamilyProfileFieldLabel icon="text">
                  {t("sponsorships.initialMessageLabel")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{sponsorship.initialMessage}</dd>
            </div>
          )}
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

      {sponsorship.receiptUrl && (
        <section className={styles["sponsorship-detail-section"]}>
        <h3>{t("sponsorships.detail.receiptSection")}</h3>
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

      {onStop && canStopSponsorship(sponsorship.status) && (
        <div className={styles["form-footer"]}>
          <button
            type="button"
            className={`${styles["btn-secondary-inline"]} ${styles["btn-sm"]}`}
            onClick={() => onStop(sponsorship)}
          >
            {t("sponsorships.actions.stop")}
          </button>
        </div>
      )}
    </div>
  );
}
