"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem, TransferProofListItem } from "@muakhah/contracts";
import { AdminDonutChart } from "@/components/admin/admin-dashboard-charts";
import {
  sponsorshipStatusClass,
  sponsorshipStatusKey,
} from "@/lib/sponsorship-status";
import {
  TRANSFER_PROOF_ADMIN_STATUS_OPTIONS,
  transferProofStatusClass,
} from "@/lib/transfer-proof-status";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import { SidebarNavIcon } from "@/components/dashboard/sidebar-nav-icons";
import styles from "@/app/dashboard/dashboard.module.css";
import { buildLandingFamilyUrl } from "@/lib/landing-links";

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#059669",
  rejected: "#dc2626",
  clarification: "#6366f1",
  disputed: "#9333ea",
};

type DonorDashboardPanelsProps = {
  sponsorships: SponsorshipListItem[];
  transferProofs: TransferProofListItem[];
};

export function DonorDashboardPanels({
  sponsorships,
  transferProofs,
}: DonorDashboardPanelsProps) {
  const { t, te } = useI18n();

  const sponsoredFamilies = useMemo(
    () =>
      sponsorships.filter(
        (item) => item.status === "active" || item.status === "paused",
      ),
    [sponsorships],
  );

  const latestTransfers = useMemo(
    () => transferProofs.slice(0, 5),
    [transferProofs],
  );

  const transferStatusSegments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const status of TRANSFER_PROOF_ADMIN_STATUS_OPTIONS) {
      counts.set(status, 0);
    }
    for (const proof of transferProofs) {
      counts.set(proof.status, (counts.get(proof.status) ?? 0) + 1);
    }
    return TRANSFER_PROOF_ADMIN_STATUS_OPTIONS.map((status) => ({
      key: status,
      label: te("transferProofStatus", status),
      value: counts.get(status) ?? 0,
      color: TRANSFER_STATUS_COLORS[status] ?? "#9ca3af",
    }));
  }, [transferProofs, te]);

  return (
    <div className={styles["donor-dashboard-sections"]}>
      <section className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["donor-dashboard-section-header"]}>
          <div>
            <h2>{t("visitor.dashboard.sponsoredFamiliesTitle")}</h2>
            <p>{t("visitor.dashboard.sponsoredFamiliesDescription")}</p>
          </div>
          <Link
            href="/dashboard/visitor/my-families"
            className={`${styles["text-link"]} ${styles["text-link-inline"]}`}
          >
            <SidebarNavIcon name="myFamilies" className={styles["text-link__icon"]} />
            {t("visitor.dashboard.viewAllFamilies")}
          </Link>
        </div>

        {sponsoredFamilies.length === 0 ? (
          <p className={styles["form-hint"]}>{t("visitor.dashboard.noSponsoredFamilies")}</p>
        ) : (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("sponsorships.table.family")}</th>
                  <th>{t("sponsorships.table.type")}</th>
                  <th>{t("sponsorships.table.amount")}</th>
                  <th>{t("sponsorships.table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {sponsoredFamilies.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={buildLandingFamilyUrl(item.familyPublicCode)}
                      >
                        {item.familyPublicCode}
                      </Link>
                    </td>
                    <td>
                      {item.type === "full"
                        ? t("sponsorships.typeFull")
                        : t("sponsorships.typePartial")}
                    </td>
                    <td>
                      ${item.monthlyAmount.toFixed(2)}/{t("sponsorships.perMonth")}
                    </td>
                    <td>
                      <span
                        className={`${styles["status-badge"]} ${sponsorshipStatusClass(sponsorshipStatusKey(item))}`}
                      >
                        {te("sponsorshipStatus", sponsorshipStatusKey(item))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["donor-dashboard-section-header"]}>
          <div>
            <h2>{t("visitor.dashboard.latestTransfersTitle")}</h2>
            <p>{t("visitor.dashboard.latestTransfersDescription")}</p>
          </div>
          <Link
            href="/dashboard/visitor/transfer-requests"
            className={`${styles["text-link"]} ${styles["text-link-inline"]}`}
          >
            <SidebarNavIcon
              name="transferRequests"
              className={styles["text-link__icon"]}
            />
            {t("visitor.dashboard.viewAllTransfers")}
          </Link>
        </div>

        {latestTransfers.length === 0 ? (
          <p className={styles["form-hint"]}>{t("sponsorships.transferProof.empty")}</p>
        ) : (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("sponsorships.transferProof.table.family")}</th>
                  <th>{t("sponsorships.transferProof.table.amount")}</th>
                  <th>{t("sponsorships.transferProof.table.transferDate")}</th>
                  <th>{t("sponsorships.transferProof.table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {latestTransfers.map((proof) => (
                  <tr key={proof.id}>
                    <td>{proof.familyPublicCode}</td>
                    <td>{formatTransferAmount(proof.amount)}</td>
                    <td>{formatTransferDate(proof.transferDate)}</td>
                    <td>
                      <span
                        className={`${styles["status-badge"]} ${transferProofStatusClass(proof.status)}`}
                      >
                        {te("transferProofStatus", proof.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={styles["donor-dashboard-sections__chart"]}>
        <AdminDonutChart
          title={t("visitor.dashboard.transferProofChartTitle")}
          subtitle={t("visitor.dashboard.transferProofChartDescription")}
          centerCaption={t("visitor.dashboard.transferProofChartCenter")}
          centerLabel={String(transferProofs.length)}
          segments={transferStatusSegments}
        />
      </div>
    </div>
  );
}
