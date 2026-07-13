"use client";

import { useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { ReceivingMethodsDisplay } from "@/components/donor/receiving-methods-display";
import { TransferProofUpload } from "@/components/sponsorship/transfer-proof-upload";
import { IssueTicketModal } from "@/components/sponsorship/issue-ticket-modal";
import styles from "@/app/dashboard/dashboard.module.css";

type SponsorshipActionsPanelProps = {
  sponsorship: SponsorshipListItem;
};

const ACTIVE_STATUSES = new Set(["active", "paused"]);

export function SponsorshipActionsPanel({
  sponsorship,
}: SponsorshipActionsPanelProps) {
  const { t } = useI18n();
  const [issueOpen, setIssueOpen] = useState(false);
  const isActive = ACTIVE_STATUSES.has(sponsorship.status);

  if (!isActive && sponsorship.status !== "completed") {
    return null;
  }

  return (
    <div className={styles["sponsorship-actions-stack"]}>
      {sponsorship.canViewReceivingDetails &&
        sponsorship.selectedReceivingMethods.length > 0 && (
          <section className={styles["sponsorship-action-panel"]}>
            <h3>{t("sponsorships.receivingMethodsDetailsTitle")}</h3>
            <p className={styles["form-hint"]}>
              {t("sponsorships.receivingMethodsDetailsHint")}
            </p>
            <ReceivingMethodsDisplay
              methods={sponsorship.selectedReceivingMethods}
              variant="card"
            />
          </section>
        )}

      {isActive && <TransferProofUpload sponsorship={sponsorship} />}

      {isActive && (
        <section className={styles["sponsorship-action-panel"]}>
          <h3>{t("sponsorships.tickets.sectionTitle")}</h3>
          <p className={styles["form-hint"]}>{t("sponsorships.tickets.sectionHint")}</p>
          <button
            type="button"
            className={styles["btn-secondary-inline"]}
            onClick={() => setIssueOpen(true)}
          >
            {t("sponsorships.tickets.issueCta")}
          </button>
        </section>
      )}

      <IssueTicketModal
        sponsorship={sponsorship}
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
      />
    </div>
  );
}
