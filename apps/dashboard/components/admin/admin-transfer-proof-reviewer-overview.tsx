"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@muakhah/i18n";
import type { AdminDashboardOverview } from "@muakhah/contracts";
import { AdminDonutChart } from "@/components/admin/admin-dashboard-charts";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import { transferProofStatusClass } from "@/lib/transfer-proof-status";
import styles from "@/app/dashboard/dashboard.module.css";

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#059669",
  rejected: "#dc2626",
  clarification: "#6366f1",
  disputed: "#7c3aed",
};

type AdminTransferProofReviewerOverviewProps = {
  overview: AdminDashboardOverview;
};

export function AdminTransferProofReviewerOverview({
  overview,
}: AdminTransferProofReviewerOverviewProps) {
  const { t, te, locale } = useI18n();

  const breakdown = overview.transferProofStatusBreakdown ?? {
    pending: overview.transferProofsPendingReview,
    accepted: 0,
    rejected: 0,
    clarification: 0,
    disputed: 0,
  };

  const recentLists = overview.recentLists ?? {
    latestTransferProofs: [],
    latestPendingTransferProofs: [],
  };

  const chartSegments = useMemo(() => {
    return (Object.keys(TRANSFER_STATUS_COLORS) as Array<keyof typeof breakdown>).map(
      (status) => ({
        key: status,
        label: te("transferProofStatus", status),
        value: breakdown[status],
        color: TRANSFER_STATUS_COLORS[status] ?? "#9ca3af",
      }),
    );
  }, [breakdown, te]);

  const totalTransferProofs = useMemo(
    () => chartSegments.reduce((sum, segment) => sum + segment.value, 0),
    [chartSegments],
  );

  const pendingProofs = recentLists.latestPendingTransferProofs ?? [];
  const recentProofs = recentLists.latestTransferProofs ?? [];

  return (
    <>
      <div className={styles["admin-overview-stats"]}>
        <DashboardStatCard
          label={t("admin.overview.transferProofReviewer.stats.total")}
          value={overview.totalTransferProofs}
          icon="money"
          accent
        />
        <DashboardStatCard
          label={t("admin.overview.transferProofReviewer.stats.pending")}
          value={overview.transferProofsPendingReview}
          icon="notices"
        />
        <DashboardStatCard
          label={t("admin.overview.transferProofReviewer.stats.accepted")}
          value={breakdown.accepted}
          icon="approved"
        />
        <DashboardStatCard
          label={t("admin.overview.transferProofReviewer.stats.rejected")}
          value={breakdown.rejected}
          icon="suspended"
        />
      </div>

      <div className={styles["admin-overview-charts"]}>
        <AdminDonutChart
          title={t("admin.overview.transferProofReviewer.chartTitle")}
          subtitle={t("admin.overview.transferProofReviewer.chartDescription")}
          centerCaption={t("admin.overview.transferProofReviewer.chartCenter")}
          centerLabel={String(totalTransferProofs)}
          segments={chartSegments}
        />
      </div>

      <div className={styles["admin-overview-metrics-stack"]}>
        <div className={`${styles.card} ${styles["card-wide"]}`}>
          <div className={styles["donor-dashboard-section-header"]}>
            <div>
              <h2>{t("admin.overview.transferProofReviewer.pendingTitle")}</h2>
              <p>{t("admin.overview.transferProofReviewer.pendingDescription")}</p>
            </div>
            <Link
              href="/dashboard/admin/transfer-requests"
              className={`${styles["text-link"]} ${styles["text-link-inline"]}`}
            >
              {t("admin.overview.metricsPanel.viewAll")}
            </Link>
          </div>

          {pendingProofs.length === 0 ? (
            <p className={styles["empty-state"]}>
              {t("admin.overview.transferProofReviewer.emptyPending")}
            </p>
          ) : (
            <div className={styles["table-scroll"]}>
              <table className={`${styles["data-table"]} ${styles["admin-overview-metrics-table"]}`}>
                <thead>
                  <tr>
                    <th>{t("sponsorships.transferProof.table.family")}</th>
                    <th>{t("sponsorships.transferProof.table.donor")}</th>
                    <th>{t("sponsorships.transferProof.table.amount")}</th>
                    <th>{t("sponsorships.transferProof.table.transferDate")}</th>
                    <th>{t("sponsorships.transferProof.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingProofs.map((proof) => (
                    <tr key={proof.id}>
                      <td>{proof.familyPublicCode}</td>
                      <td>{proof.donorName}</td>
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
        </div>

        <div className={`${styles.card} ${styles["card-wide"]}`}>
          <div className={styles["donor-dashboard-section-header"]}>
            <div>
              <h2>{t("admin.overview.transferProofReviewer.recentTitle")}</h2>
              <p>
                {t("admin.overview.transferProofReviewer.recentDescription", {
                  count: String(recentProofs.length),
                })}
              </p>
            </div>
            <Link
              href="/dashboard/admin/transfer-requests"
              className={`${styles["text-link"]} ${styles["text-link-inline"]}`}
            >
              {t("admin.overview.metricsPanel.viewAll")}
            </Link>
          </div>

          {recentProofs.length === 0 ? (
            <p className={styles["empty-state"]}>
              {t("sponsorships.transferProof.adminEmpty")}
            </p>
          ) : (
            <div className={styles["table-scroll"]}>
              <table className={`${styles["data-table"]} ${styles["admin-overview-metrics-table"]}`}>
                <thead>
                  <tr>
                    <th>{t("sponsorships.transferProof.table.family")}</th>
                    <th>{t("sponsorships.transferProof.table.donor")}</th>
                    <th>{t("sponsorships.transferProof.table.amount")}</th>
                    <th>{t("sponsorships.transferProof.table.submitted")}</th>
                    <th>{t("sponsorships.transferProof.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProofs.map((proof) => (
                    <tr key={proof.id}>
                      <td>{proof.familyPublicCode}</td>
                      <td>{proof.donorName}</td>
                      <td>{formatTransferAmount(proof.amount)}</td>
                      <td>
                        {new Date(proof.createdAt).toLocaleDateString(locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
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
        </div>
      </div>
    </>
  );
}
