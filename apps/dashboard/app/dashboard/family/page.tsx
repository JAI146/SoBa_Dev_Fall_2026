"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type {
  FamilyDashboardOverview,
  TransferProofListItem,
} from "@muakhah/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useRefetchTriggers } from "@/lib/use-refetch-triggers";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import {
  FamilyDashboardPanels,
  sumTransferAmounts,
} from "@/components/family/family-dashboard-panels";
import { formatTransferAmount } from "@/lib/transfer-proof-display";
import styles from "../dashboard.module.css";
import authStyles from "../../auth.module.css";

function formatMoney(amount: number, perMonth: string) {
  return (
    <>
      ${amount.toFixed(2)}
      <span className={styles["dashboard-stat-card__suffix"]}>{perMonth}</span>
    </>
  );
}

export default function FamilyDashboardPage() {
  const { t } = useI18n();
  const [overview, setOverview] = useState<FamilyDashboardOverview | null>(null);
  const [transferProofs, setTransferProofs] = useState<TransferProofListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalTransferred = useMemo(
    () => sumTransferAmounts(transferProofs),
    [transferProofs],
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
        const [dashboardData, transferProofsData] = await Promise.all([
          apiRequest<{ overview: FamilyDashboardOverview }>(
            "/family/dashboard",
            {},
            getToken(),
          ),
          apiRequest<{
            transferProofs: TransferProofListItem[];
            approvedCount: number;
          }>("/family/transfer-proofs", {}, getToken()),
        ]);
        setOverview(dashboardData.overview);
        setTransferProofs(transferProofsData.transferProofs);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("family.loadFailed"),
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
    return <div className={styles.card}>{t("family.loading")}</div>;
  }

  return (
    <>
      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("family.title")}</h1>
          <p>{t("family.description")}</p>
          {overview && (
            <p className={styles["page-description"]} style={{ marginTop: "0.35rem" }}>
              {overview.publicCode}
            </p>
          )}
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

      {overview && (
        <div className={styles["dashboard-bento"]}>
          <DashboardStatCard
            label={t("family.stats.donated")}
            value={formatTransferAmount(totalTransferred)}
            icon="money"
            accent
          />
          <DashboardStatCard
            label={t("family.stats.required")}
            value={formatMoney(overview.monthlyRequiredAmount, t("family.stats.perMonth"))}
            icon="money"
          />
          <DashboardStatCard
            label={t("family.stats.remaining")}
            value={formatMoney(overview.monthlyRemainingAmount, t("family.stats.perMonth"))}
            icon="remaining"
          />
          <DashboardStatCard
            label={t("family.stats.totalDonors")}
            value={overview.totalDonors}
            icon="donors"
          />
        </div>
      )}

      <FamilyDashboardPanels transferProofs={transferProofs} />
    </>
  );
}
