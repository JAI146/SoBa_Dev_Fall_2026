"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { AdminDashboardOverview } from "@muakhah/contracts";
import { AdminChatModeratorOverview } from "@/components/admin/admin-chat-moderator-overview";
import { AdminTransferProofReviewerOverview } from "@/components/admin/admin-transfer-proof-reviewer-overview";
import { AdminOverviewMetricsPanel } from "@/components/admin/admin-overview-metrics-panel";
import { AdminBarChart, AdminDonutChart } from "@/components/admin/admin-dashboard-charts";
import { AdminSubAdminsPanel } from "@/components/admin/admin-sub-admins-panel";
import { AdminTopDonorsTable } from "@/components/admin/admin-top-donors-table";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { apiRequest } from "@/lib/api-client";
import { isContentModeratorDashboard, isFamilyManagerDashboard, isSystemAdministratorDashboard, isTransferProofReviewerDashboard } from "@/lib/admin-dashboard-view";
import { getStoredUser, getToken } from "@/lib/auth";
import { useRefetchTriggers } from "@/lib/use-refetch-triggers";
import styles from "../dashboard.module.css";
import authStyles from "../../auth.module.css";

export default function AdminOverviewPage() {
  const { t } = useI18n();
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showChatModeratorDashboard = useMemo(
    () => isContentModeratorDashboard(getStoredUser()),
    [],
  );
  const showFamilyManagerDashboard = useMemo(
    () => isFamilyManagerDashboard(getStoredUser()),
    [],
  );
  const showTransferProofReviewerDashboard = useMemo(
    () => isTransferProofReviewerDashboard(getStoredUser()),
    [],
  );
  const showSystemAdministratorDashboard = useMemo(
    () => isSystemAdministratorDashboard(getStoredUser()),
    [],
  );

  const loadDashboard = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await apiRequest<{ overview: AdminDashboardOverview }>(
          "/admin/dashboard",
          {},
          getToken(),
        );
        setOverview(data.overview);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("admin.overview.loadFailed"),
        );
      } finally {
        if (opts?.silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [t],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useRefetchTriggers(() => {
    void loadDashboard({ silent: true });
  });

  if (loading) {
    return <div className={styles.card}>{t("admin.overview.loading")}</div>;
  }

  return (
    <>
      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("admin.overview.title")}</h1>
          <p className={styles["page-description"]}>
            {showChatModeratorDashboard
              ? t("admin.overview.chatModerator.welcome")
              : showFamilyManagerDashboard
                ? t("admin.overview.familyManager.welcome")
                : showTransferProofReviewerDashboard
                  ? t("admin.overview.transferProofReviewer.welcome")
                  : showSystemAdministratorDashboard
                    ? t("admin.overview.systemAdministrator.welcome")
                    : t("admin.overview.welcome")}
          </p>
        </div>
        <RefreshButton
          refreshing={refreshing}
          onClick={() => void loadDashboard({ silent: true })}
        />
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {overview && showChatModeratorDashboard && (
        <AdminChatModeratorOverview overview={overview} />
      )}

      {overview && showTransferProofReviewerDashboard && (
        <AdminTransferProofReviewerOverview overview={overview} />
      )}

      {overview && showFamilyManagerDashboard && (
        <>
          <div className={styles["admin-overview-stats"]}>
            <DashboardStatCard
              label={t("admin.overview.stats.totalFamilies")}
              value={overview.totalFamilies}
              icon="families"
              accent
            />
            <DashboardStatCard
              label={t("admin.overview.stats.hiddenFamilies")}
              value={overview.hiddenFamilies}
              icon="hidden"
            />
            <DashboardStatCard
              label={t("admin.overview.stats.partiallySponsoredFamilies")}
              value={overview.partiallySponsoredFamilies}
              icon="partial"
            />
            <DashboardStatCard
              label={t("admin.overview.stats.fullyCoveredFamilies")}
              value={overview.fullyCoveredFamilies}
              icon="covered"
            />
          </div>

          <div className={styles["admin-overview-charts"]}>
            <AdminDonutChart
              title={t("admin.overview.charts.familyCoverage.title")}
              subtitle={t("admin.overview.charts.familyCoverage.subtitle")}
              centerCaption={t(
                "admin.overview.charts.familyCoverage.centerCaption",
              )}
              centerLabel={String(overview.totalFamilies)}
              segments={[
                {
                  key: "fullyCovered",
                  label: t("admin.overview.charts.familyCoverage.fullyCovered"),
                  value: overview.familyCoverageBreakdown.fullyCovered,
                  color: "#064e3b",
                },
                {
                  key: "partiallyCovered",
                  label: t("admin.overview.charts.familyCoverage.partiallyCovered"),
                  value: overview.familyCoverageBreakdown.partiallyCovered,
                  color: "#34d399",
                },
                {
                  key: "notCovered",
                  label: t("admin.overview.charts.familyCoverage.notCovered"),
                  value: overview.familyCoverageBreakdown.notCovered,
                  color: "#cbd5e1",
                },
                {
                  key: "expired",
                  label: t("admin.overview.charts.familyCoverage.expired"),
                  value: overview.familyCoverageBreakdown.expired,
                  color: "#94a3b8",
                },
              ]}
            />
          </div>

          <AdminOverviewMetricsPanel overview={overview} familyManagerOnly />
        </>
      )}

      {overview && showSystemAdministratorDashboard && (
        <>
          <div className={styles["admin-overview-stats"]}>
            <DashboardStatCard
              label={t("admin.overview.stats.totalFamilies")}
              value={overview.totalFamilies}
              icon="families"
              accent
            />
            <DashboardStatCard
              label={t("admin.overview.stats.hiddenFamilies")}
              value={overview.hiddenFamilies}
              icon="hidden"
            />
            <DashboardStatCard
              label={t("admin.overview.stats.partiallySponsoredFamilies")}
              value={overview.partiallySponsoredFamilies}
              icon="partial"
            />
            <DashboardStatCard
              label={t("admin.overview.stats.fullyCoveredFamilies")}
              value={overview.fullyCoveredFamilies}
              icon="covered"
            />
          </div>

          <div className={styles["admin-overview-charts"]}>
            <AdminBarChart
              title={t("admin.overview.charts.sponsorTypes.title")}
              subtitle={t("admin.overview.charts.sponsorTypes.subtitle")}
              items={[
                {
                  key: "partial",
                  label: t("admin.overview.charts.sponsorTypes.partial"),
                  value: overview.sponsorshipTypeBreakdown.partial,
                  tone: "mint",
                },
                {
                  key: "full",
                  label: t("admin.overview.charts.sponsorTypes.full"),
                  value: overview.sponsorshipTypeBreakdown.full,
                  tone: "primary",
                },
              ]}
            />

            <AdminDonutChart
              title={t("admin.overview.charts.familyCoverage.title")}
              subtitle={t("admin.overview.charts.familyCoverage.subtitle")}
              centerCaption={t("admin.overview.charts.familyCoverage.centerCaption")}
              centerLabel={String(overview.totalFamilies)}
              segments={[
                {
                  key: "fullyCovered",
                  label: t("admin.overview.charts.familyCoverage.fullyCovered"),
                  value: overview.familyCoverageBreakdown.fullyCovered,
                  color: "#064e3b",
                },
                {
                  key: "partiallyCovered",
                  label: t("admin.overview.charts.familyCoverage.partiallyCovered"),
                  value: overview.familyCoverageBreakdown.partiallyCovered,
                  color: "#34d399",
                },
                {
                  key: "notCovered",
                  label: t("admin.overview.charts.familyCoverage.notCovered"),
                  value: overview.familyCoverageBreakdown.notCovered,
                  color: "#cbd5e1",
                },
                {
                  key: "expired",
                  label: t("admin.overview.charts.familyCoverage.expired"),
                  value: overview.familyCoverageBreakdown.expired,
                  color: "#94a3b8",
                },
              ]}
            />

            <AdminBarChart
              title={t("admin.overview.charts.sponsorshipPipeline.title")}
              subtitle={t("admin.overview.charts.sponsorshipPipeline.subtitle")}
              items={[
                {
                  key: "requested",
                  label: t("admin.overview.charts.sponsorshipPipeline.requested"),
                  value: overview.sponsorshipStatusBreakdown.requested,
                  tone: "striped",
                },
                {
                  key: "active",
                  label: t("admin.overview.charts.sponsorshipPipeline.active"),
                  value: overview.sponsorshipStatusBreakdown.active,
                  tone: "primary",
                },
                {
                  key: "paused",
                  label: t("admin.overview.charts.sponsorshipPipeline.paused"),
                  value: overview.sponsorshipStatusBreakdown.paused,
                  tone: "muted",
                },
                {
                  key: "completed",
                  label: t("admin.overview.charts.sponsorshipPipeline.completed"),
                  value: overview.sponsorshipStatusBreakdown.completed,
                  tone: "mint",
                },
              ]}
            />
          </div>

          <AdminOverviewMetricsPanel overview={overview} systemAdministratorOnly />

          <div className={styles["admin-dashboard-panels"]}>
            <AdminTopDonorsTable donors={overview.topDonors} />
          </div>
        </>
      )}

      {overview &&
        !showChatModeratorDashboard &&
        !showFamilyManagerDashboard &&
        !showTransferProofReviewerDashboard &&
        !showSystemAdministratorDashboard && (
        <>
          <div className={styles["admin-overview-stats"]}>
            <DashboardStatCard
              label={t("admin.overview.stats.totalFamilies")}
              value={overview.totalFamilies}
              icon="families"
              accent
            />
            <DashboardStatCard
              label={t("admin.overview.stats.hiddenFamilies")}
              value={overview.hiddenFamilies}
              icon="hidden"
            />
            <DashboardStatCard
              label={t("admin.overview.stats.partiallySponsoredFamilies")}
              value={overview.partiallySponsoredFamilies}
              icon="partial"
            />
            <DashboardStatCard
              label={t("admin.overview.stats.fullyCoveredFamilies")}
              value={overview.fullyCoveredFamilies}
              icon="covered"
            />
          </div>

          <div className={styles["admin-overview-charts"]}>
              <AdminBarChart
                title={t("admin.overview.charts.sponsorTypes.title")}
                subtitle={t("admin.overview.charts.sponsorTypes.subtitle")}
                items={[
                  {
                    key: "partial",
                    label: t("admin.overview.charts.sponsorTypes.partial"),
                    value: overview.sponsorshipTypeBreakdown.partial,
                    tone: "mint",
                  },
                  {
                    key: "full",
                    label: t("admin.overview.charts.sponsorTypes.full"),
                    value: overview.sponsorshipTypeBreakdown.full,
                    tone: "primary",
                  },
                ]}
              />

              <AdminDonutChart
                title={t("admin.overview.charts.familyCoverage.title")}
                subtitle={t("admin.overview.charts.familyCoverage.subtitle")}
                centerCaption={t(
                  "admin.overview.charts.familyCoverage.centerCaption",
                )}
                centerLabel={String(overview.totalFamilies)}
                segments={[
                  {
                    key: "fullyCovered",
                    label: t("admin.overview.charts.familyCoverage.fullyCovered"),
                    value: overview.familyCoverageBreakdown.fullyCovered,
                    color: "#064e3b",
                  },
                  {
                    key: "partiallyCovered",
                    label: t("admin.overview.charts.familyCoverage.partiallyCovered"),
                    value: overview.familyCoverageBreakdown.partiallyCovered,
                    color: "#34d399",
                  },
                  {
                    key: "notCovered",
                    label: t("admin.overview.charts.familyCoverage.notCovered"),
                    value: overview.familyCoverageBreakdown.notCovered,
                    color: "#cbd5e1",
                  },
                  {
                    key: "expired",
                    label: t("admin.overview.charts.familyCoverage.expired"),
                    value: overview.familyCoverageBreakdown.expired,
                    color: "#94a3b8",
                  },
                ]}
              />

              <AdminBarChart
                title={t("admin.overview.charts.sponsorshipPipeline.title")}
                subtitle={t("admin.overview.charts.sponsorshipPipeline.subtitle")}
                items={[
                  {
                    key: "requested",
                    label: t("admin.overview.charts.sponsorshipPipeline.requested"),
                    value: overview.sponsorshipStatusBreakdown.requested,
                    tone: "striped",
                  },
                  {
                    key: "active",
                    label: t("admin.overview.charts.sponsorshipPipeline.active"),
                    value: overview.sponsorshipStatusBreakdown.active,
                    tone: "primary",
                  },
                  {
                    key: "paused",
                    label: t("admin.overview.charts.sponsorshipPipeline.paused"),
                    value: overview.sponsorshipStatusBreakdown.paused,
                    tone: "muted",
                  },
                  {
                    key: "completed",
                    label: t("admin.overview.charts.sponsorshipPipeline.completed"),
                    value: overview.sponsorshipStatusBreakdown.completed,
                    tone: "mint",
                  },
                ]}
              />
          </div>

          <AdminOverviewMetricsPanel overview={overview} />

          <div className={styles["admin-dashboard-panels"]}>
            <AdminTopDonorsTable donors={overview.topDonors} />
            <AdminSubAdminsPanel subAdmins={overview.subAdmins} />
          </div>
        </>
      )}
    </>
  );
}
