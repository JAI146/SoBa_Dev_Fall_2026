"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@muakhah/i18n";
import type { FamilyPublicProfile } from "@muakhah/contracts";
import { FamilyPublicCard } from "@/components/donor/family-public-card";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useRefetchTriggers } from "@/lib/use-refetch-triggers";
import { SearchIcon } from "@/components/dashboard/action-icons";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { buildLandingUrl } from "@/lib/landing-links";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

export default function MyFamiliesPage() {
  const { t } = useI18n();
  const [families, setFamilies] = useState<FamilyPublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFamilies = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await apiRequest<{ families: FamilyPublicProfile[] }>(
          "/donor/my-families",
          {},
          getToken(),
        );
        setFamilies(data.families);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("visitor.myFamilies.loadFailed"),
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
    void loadFamilies();
  }, [loadFamilies]);

  useRefetchTriggers(() => {
    void loadFamilies({ silent: true });
  });

  return (
    <>
      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("visitor.myFamilies.title")}</h1>
          <p>{t("visitor.myFamilies.description")}</p>
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
            disabled={loading}
            onClick={() => void loadFamilies({ silent: true })}
          />
        </div>
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading && !refreshing && (
        <div className={styles.card}>{t("visitor.myFamilies.loading")}</div>
      )}

      {!loading && !error && families.length === 0 && (
        <div className={`${styles.card} ${styles["empty-state"]}`}>
          <p>{t("visitor.myFamilies.empty")}</p>
          <Link
            href={buildLandingUrl()}
            className={styles["btn-primary-inline"]}
            style={{ marginTop: "1rem" }}
          >
            <SearchIcon />
            {t("visitor.dashboard.browseFamilies")}
          </Link>
        </div>
      )}

      {!loading && families.length > 0 && (
          <div className={styles["family-public-grid"]}>
          {families.map((family) => (
            <FamilyPublicCard key={family.publicCode} family={family} />
          ))}
        </div>
      )}
    </>
  );
}
