"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@muakhah/i18n";
import type { TransferProofListItem } from "@muakhah/contracts";
import { AdminDonutChart } from "@/components/admin/admin-dashboard-charts";
import { SidebarNavIcon } from "@/components/dashboard/sidebar-nav-icons";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import styles from "@/app/dashboard/dashboard.module.css";

const DONOR_CHART_COLORS = [
  "#2563eb",
  "#059669",
  "#f59e0b",
  "#dc2626",
  "#6366f1",
  "#9333ea",
  "#0d9488",
  "#ea580c",
];

type DonorTransferTotal = {
  donorUserId: string;
  donorName: string;
  donorEmail: string;
  totalAmount: number;
};

function aggregateDonorTotals(
  proofs: TransferProofListItem[],
): DonorTransferTotal[] {
  const byDonor = new Map<string, DonorTransferTotal>();

  for (const proof of proofs) {
    const amount = proof.amount ?? 0;
    const existing = byDonor.get(proof.donorUserId);
    if (existing) {
      existing.totalAmount += amount;
      continue;
    }
    byDonor.set(proof.donorUserId, {
      donorUserId: proof.donorUserId,
      donorName: proof.donorName,
      donorEmail: proof.donorEmail,
      totalAmount: amount,
    });
  }

  return [...byDonor.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}

export function sumTransferAmounts(proofs: TransferProofListItem[]) {
  return proofs.reduce((sum, proof) => sum + (proof.amount ?? 0), 0);
}

type FamilyDashboardPanelsProps = {
  transferProofs: TransferProofListItem[];
};

export function FamilyDashboardPanels({
  transferProofs,
}: FamilyDashboardPanelsProps) {
  const { t } = useI18n();

  const topDonors = useMemo(
    () => aggregateDonorTotals(transferProofs).slice(0, 5),
    [transferProofs],
  );

  const latestTransfers = useMemo(
    () => transferProofs.slice(0, 5),
    [transferProofs],
  );

  const donorChartSegments = useMemo(() => {
    const totals = aggregateDonorTotals(transferProofs);
    const top = totals.slice(0, 5);
    const othersTotal = totals
      .slice(5)
      .reduce((sum, item) => sum + item.totalAmount, 0);

    const segments = top.map((item, index) => ({
      key: item.donorUserId,
      label: item.donorName,
      value: item.totalAmount,
      color: DONOR_CHART_COLORS[index % DONOR_CHART_COLORS.length]!,
    }));

    if (othersTotal > 0) {
      segments.push({
        key: "others",
        label: t("family.dashboard.donorChartOthers"),
        value: othersTotal,
        color: "#9ca3af",
      });
    }

    return segments;
  }, [transferProofs, t]);

  const totalTransferred = useMemo(
    () => sumTransferAmounts(transferProofs),
    [transferProofs],
  );

  return (
    <div className={styles["donor-dashboard-sections"]}>
      <section className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["donor-dashboard-section-header"]}>
          <div>
            <h2>{t("family.dashboard.topDonorsTitle")}</h2>
            <p>{t("family.dashboard.topDonorsDescription")}</p>
          </div>
          <Link
            href="/dashboard/family/donors"
            className={`${styles["text-link"]} ${styles["text-link-inline"]}`}
          >
            <SidebarNavIcon name="donors" className={styles["text-link__icon"]} />
            {t("family.dashboard.viewAllDonors")}
          </Link>
        </div>

        {topDonors.length === 0 ? (
          <p className={styles["form-hint"]}>{t("family.transfers.empty")}</p>
        ) : (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("family.transfers.table.donor")}</th>
                  <th>{t("family.transfers.table.email")}</th>
                  <th>{t("family.dashboard.totalTransferred")}</th>
                </tr>
              </thead>
              <tbody>
                {topDonors.map((donor) => (
                  <tr key={donor.donorUserId}>
                    <td>{donor.donorName}</td>
                    <td>{donor.donorEmail}</td>
                    <td>{formatTransferAmount(donor.totalAmount)}</td>
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
            <h2>{t("family.dashboard.latestTransfersTitle")}</h2>
            <p>{t("family.dashboard.latestTransfersDescription")}</p>
          </div>
          <Link
            href="/dashboard/family/transfers"
            className={`${styles["text-link"]} ${styles["text-link-inline"]}`}
          >
            <SidebarNavIcon
              name="transferRequests"
              className={styles["text-link__icon"]}
            />
            {t("family.dashboard.viewAllTransfers")}
          </Link>
        </div>

        {latestTransfers.length === 0 ? (
          <p className={styles["form-hint"]}>{t("family.transfers.empty")}</p>
        ) : (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("family.transfers.table.donor")}</th>
                  <th>{t("family.transfers.table.amount")}</th>
                  <th>{t("family.transfers.table.transferDate")}</th>
                  <th>{t("family.transfers.table.submitted")}</th>
                </tr>
              </thead>
              <tbody>
                {latestTransfers.map((proof) => (
                  <tr key={proof.id}>
                    <td>{proof.donorName}</td>
                    <td>{formatTransferAmount(proof.amount)}</td>
                    <td>{formatTransferDate(proof.transferDate)}</td>
                    <td>{new Date(proof.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={styles["donor-dashboard-sections__chart"]}>
        <AdminDonutChart
          title={t("family.dashboard.donorChartTitle")}
          subtitle={t("family.dashboard.donorChartDescription")}
          centerCaption={t("family.dashboard.donorChartCenterCaption")}
          centerLabel={formatTransferAmount(totalTransferred)}
          formatSegmentValue={formatTransferAmount}
          segments={donorChartSegments}
        />
      </div>
    </div>
  );
}
