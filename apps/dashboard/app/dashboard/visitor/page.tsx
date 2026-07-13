"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type {
  DonorDashboardOverview,
  SponsorshipListItem,
  TransferProofListItem,
} from "@muakhah/contracts";
import { apiRequest } from "@/lib/api-client";
import { getStoredUser, getToken } from "@/lib/auth";
import { useRefetchTriggers } from "@/lib/use-refetch-triggers";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { SearchIcon } from "@/components/dashboard/action-icons";
import { DonorDashboardPanels } from "@/components/donor/donor-dashboard-panels";
import { buildLandingUrl } from "@/lib/landing-links";
import styles from "../dashboard.module.css";
import authStyles from "../../auth.module.css";

export default function VisitorDashboardPage() {
  const { t } = useI18n();
  const user = getStoredUser();
  const [overview, setOverview] = useState<DonorDashboardOverview | null>(null);
  const [sponsorships, setSponsorships] = useState<SponsorshipListItem[]>([]);
  const [transferProofs, setTransferProofs] = useState<TransferProofListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const welcomeMessage = useMemo(() => {
    const name = user?.firstName?.trim();
    if (name) {
      return t("visitor.dashboard.welcome", { name });
    }
    return t("visitor.dashboard.welcomeGuest");
  }, [t, user?.firstName]);

  const loadDashboard = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [dashboardData, sponsorshipsData, transferProofsData] =
          await Promise.all([
            apiRequest<{ overview: DonorDashboardOverview }>(
              "/donor/dashboard",
              {},
              getToken(),
            ),
            apiRequest<{ sponsorships: SponsorshipListItem[] }>(
              "/donor/sponsorships",
              {},
              getToken(),
            ),
            apiRequest<{ transferProofs: TransferProofListItem[] }>(
              "/donor/transfer-proofs",
              {},
              getToken(),
            ),
          ]);
        setOverview(dashboardData.overview);
        setSponsorships(sponsorshipsData.sponsorships);
        setTransferProofs(transferProofsData.transferProofs);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("visitor.dashboard.loadFailed"),
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
    return <div className={styles.card}>{t("visitor.dashboard.loading")}</div>;
  }

  return (
    <>
      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{welcomeMessage}</h1>
          <p className={styles["page-description"]}>{t("visitor.description")}</p>
        </div>
        <div className={styles["page-actions-group"]}>
          <Link
            href={buildLandingUrl()}
            className={styles["btn-primary-inline"]}
          >
            <SearchIcon />
            {t("visitor.dashboard.browseFamilies")}
          </Link>
          <RefreshButton
            refreshing={refreshing}
            onClick={() => void loadDashboard({ silent: true })}
          />
        </div>
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {overview && (
        <>
          <div className={styles["dashboard-bento"]}>
            <DashboardStatCard
              label={t("visitor.dashboard.stats.activeSponsorships")}
              value={overview.activeSponsorships}
              icon="sponsorships"
              accent
            />
            <DashboardStatCard
              label={t("visitor.dashboard.stats.familiesSponsored")}
              value={overview.familiesSponsored}
              icon="families"
            />
            <DashboardStatCard
              label={t("visitor.dashboard.stats.partialSponsorships")}
              value={overview.partialSponsorships}
              icon="partial"
            />
            <DashboardStatCard
              label={t("visitor.dashboard.stats.completedSponsorships")}
              value={overview.completedSponsorships}
              icon="completed"
            />
          </div>

          <DonorDashboardPanels
            sponsorships={sponsorships}
            transferProofs={transferProofs}
          />
        </>
      )}
    </>
  );
}
