"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { BackLink } from "@/components/dashboard/back-link";
import { SponsorshipDetailView } from "@/components/sponsorship/sponsorship-detail-view";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useRefetchTriggers } from "@/lib/use-refetch-triggers";
import styles from "../../../dashboard.module.css";
import authStyles from "../../../../auth.module.css";

export default function FamilyDonorDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const sponsorshipId = params.id;
  const [sponsorship, setSponsorship] = useState<SponsorshipListItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSponsorship = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ sponsorship: SponsorshipListItem }>(
        `/family/sponsorships/${encodeURIComponent(sponsorshipId)}`,
        {},
        getToken(),
      );
      setSponsorship(data.sponsorship);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("family.donors.detail.loadFailed"),
      );
      setSponsorship(null);
    } finally {
      setLoading(false);
    }
  }, [sponsorshipId, t]);

  useEffect(() => {
    void loadSponsorship();
  }, [loadSponsorship]);

  useRefetchTriggers(() => {
    void loadSponsorship();
  });

  return (
    <>
      <div className={styles["page-top"]}>
        <BackLink href="/dashboard/family/donors">{t("common.back")}</BackLink>
      </div>

      {loading && (
        <div className={styles.card}>{t("family.donors.detail.loading")}</div>
      )}

      {!loading && (error || !sponsorship) && (
        <div className={styles.card}>
          {error && <div className={authStyles["error-banner"]}>{error}</div>}
        </div>
      )}

      {!loading && sponsorship && (
        <SponsorshipDetailView sponsorship={sponsorship} showDonor />
      )}
    </>
  );
}
