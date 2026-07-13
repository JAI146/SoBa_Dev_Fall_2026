"use client";

import Link from "next/link";
import { useI18n } from "@muakhah/i18n";
import type { AdminTopDonorItem } from "@muakhah/contracts";
import styles from "../../app/dashboard/dashboard.module.css";

export function AdminTopDonorsTable({
  donors,
}: {
  donors: AdminTopDonorItem[];
}) {
  const { t } = useI18n();

  return (
    <div className={`${styles.card} ${styles["card-wide"]} ${styles["admin-panel-card"]}`}>
      <div className={styles["admin-panel-card__header"]}>
        <div>
          <h3>{t("admin.overview.topDonors.title")}</h3>
          <p>{t("admin.overview.topDonors.subtitle")}</p>
        </div>
        <Link href="/dashboard/admin/donors" className={styles["btn-secondary-inline"]}>
          {t("admin.overview.topDonors.viewAll")}
        </Link>
      </div>

      {donors.length === 0 ? (
        <p className={styles["empty-state"]}>{t("admin.overview.topDonors.empty")}</p>
      ) : (
        <div className={styles["table-shell"]}>
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("admin.overview.topDonors.donor")}</th>
                  <th>{t("admin.overview.topDonors.monthlyTotal")}</th>
                  <th>{t("admin.overview.topDonors.activeSponsorships")}</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((donor, index) => (
                  <tr key={donor.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className={styles["admin-donor-cell"]}>
                        {donor.profileImageUrl ? (
                          <img
                            src={donor.profileImageUrl}
                            alt=""
                            className={styles["admin-donor-cell__avatar"]}
                          />
                        ) : (
                          <span className={styles["admin-donor-cell__avatar-fallback"]}>
                            {donor.fullName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <strong>{donor.fullName}</strong>
                          <span>{donor.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>${donor.totalMonthlyAmount.toFixed(2)}</td>
                    <td>{donor.activeSponsorships}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
