"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { DonorDetail } from "@muakhah/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "../../../dashboard.module.css";

export default function AdminDonorDetailPage() {
  const { t, te } = useI18n();
  const params = useParams<{ id: string }>();
  const [donor, setDonor] = useState<DonorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDonor = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<{ donor: DonorDetail }>(
        `/admin/donors/${params.id}`,
        {},
        getToken(),
      );
      setDonor(data.donor);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("donors.loadOneFailed"));
    } finally {
      setLoading(false);
    }
  }, [params.id, t]);

  useEffect(() => {
    void loadDonor();
  }, [loadDonor]);

  if (loading) {
    return <p>{t("donors.loadingOne")}</p>;
  }

  if (error || !donor) {
    return (
      <div className={styles.card}>
        <p style={{ color: "var(--error-text)" }}>
          {error ?? t("donors.notFound")}
        </p>
        <Link href="/dashboard/admin/donors" className={styles["btn-back"]}>
          {t("donors.backLink")}
        </Link>
      </div>
    );
  }

  const initials = `${donor.firstName.charAt(0)}${donor.lastName.charAt(0)}`.toUpperCase();

  return (
    <>
      <div className={styles["page-top"]}>
        <Link href="/dashboard/admin/donors" className={styles["btn-back"]}>
          {t("donors.backLink")}
        </Link>
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["detail-profile"]}>
          {donor.profileImageUrl ? (
            <img
              src={donor.profileImageUrl}
              alt={t("donors.profileAlt")}
              className={styles["donor-avatar"]}
            />
          ) : (
            <span
              className={`${styles["donor-avatar"]} ${styles["donor-avatar--placeholder"]}`}
            >
              {initials}
            </span>
          )}
          <div>
            <h2>
              {donor.fullName}
              {donor.accountRestricted && (
                <span className={styles["restricted-badge"]}>
                  {t("donors.restrictedBadge")}
                </span>
              )}
            </h2>
            <span>{donor.email}</span>
          </div>
        </div>

        <h3 className={styles["form-section"]} style={{ marginTop: 0 }}>
          <span style={{ fontSize: "1rem", fontWeight: 600 }}>
            {t("donors.detail.accountInfo")}
          </span>
        </h3>
        <div className={styles["detail-grid"]}>
          <div className={styles["detail-item"]}>
            <label>{t("donors.detail.firstName")}</label>
            <p>{donor.firstName}</p>
          </div>
          <div className={styles["detail-item"]}>
            <label>{t("donors.detail.lastName")}</label>
            <p>{donor.lastName}</p>
          </div>
          <div className={styles["detail-item"]}>
            <label>{t("donors.detail.email")}</label>
            <p>{donor.email}</p>
          </div>
          <div className={styles["detail-item"]}>
            <label>{t("donors.detail.userType")}</label>
            <p>{t(`donors.types.${donor.userType}` as "donors.types.visitor")}</p>
          </div>
          <div className={styles["detail-item"]}>
            <label>{t("donors.detail.status")}</label>
            <p>{te("accountStatus", donor.status)}</p>
          </div>
          <div className={styles["detail-item"]}>
            <label>{t("donors.detail.joined")}</label>
            <p>{new Date(donor.createdAt).toLocaleString()}</p>
          </div>
          <div className={styles["detail-item"]}>
            <label>{t("donors.detail.lastUpdated")}</label>
            <p>{new Date(donor.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </>
  );
}
