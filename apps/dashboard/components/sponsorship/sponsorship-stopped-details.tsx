"use client";

import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import {
  formatLocalDate,
  formatLocalTime,
} from "@/lib/format-local-datetime";
import { FamilyProfileFieldLabel } from "@/components/family/family-profile-field-label";
import styles from "@/app/dashboard/dashboard.module.css";

type SponsorshipStoppedDetailsProps = {
  sponsorship: SponsorshipListItem;
};

function resolveStopNotes(sponsorship: SponsorshipListItem) {
  const stopNotes = sponsorship.stopNotes?.trim();
  if (stopNotes) return stopNotes;

  // Legacy rows saved the stop reason into adminNotes before stopNotes existed.
  if (sponsorship.status === "stopped" && sponsorship.stoppedAt) {
    return sponsorship.adminNotes?.trim() || null;
  }

  return null;
}

export function SponsorshipStoppedDetails({
  sponsorship,
}: SponsorshipStoppedDetailsProps) {
  const { t, locale } = useI18n();

  if (sponsorship.status !== "stopped") {
    return null;
  }

  const stopNotes = resolveStopNotes(sponsorship);
  const empty = t("common.empty");

  return (
    <section className={styles["sponsorship-detail-section"]}>
      <h3>
        <FamilyProfileFieldLabel icon="lock">
          {t("sponsorships.detail.stoppedSection")}
        </FamilyProfileFieldLabel>
      </h3>
      <dl className={styles["family-detail-list"]}>
        {sponsorship.stoppedAt && (
          <>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="calendar">
                  {t("family.donors.detail.stoppedDate")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{formatLocalDate(sponsorship.stoppedAt, locale)}</dd>
            </div>
            <div className={styles["family-detail-row"]}>
              <dt>
                <FamilyProfileFieldLabel icon="clock">
                  {t("family.donors.detail.stoppedTime")}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{formatLocalTime(sponsorship.stoppedAt, locale)}</dd>
            </div>
          </>
        )}
        <div
          className={`${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`}
        >
          <dt>
            <FamilyProfileFieldLabel icon="text">
              {t("sponsorships.detail.stopNotesLabel")}
            </FamilyProfileFieldLabel>
          </dt>
          <dd>{stopNotes ?? empty}</dd>
        </div>
      </dl>
    </section>
  );
}
