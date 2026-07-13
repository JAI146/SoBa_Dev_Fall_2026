"use client";

import Link from "next/link";
import { useI18n } from "@muakhah/i18n";
import type { SubAdminListItem } from "@muakhah/contracts";
import styles from "../../app/dashboard/dashboard.module.css";

function formatAdminRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminSubAdminsPanel({
  subAdmins,
}: {
  subAdmins: SubAdminListItem[];
}) {
  const { t } = useI18n();

  return (
    <div className={`${styles.card} ${styles["card-wide"]} ${styles["admin-panel-card"]}`}>
      <div className={styles["admin-panel-card__header"]}>
        <div>
          <h3>{t("admin.overview.subAdmins.title")}</h3>
          <p>{t("admin.overview.subAdmins.subtitle")}</p>
        </div>
        <Link href="/dashboard/admin/sub-admins" className={styles["btn-secondary-inline"]}>
          {t("admin.overview.subAdmins.manage")}
        </Link>
      </div>

      {subAdmins.length === 0 ? (
        <p className={styles["empty-state"]}>{t("admin.overview.subAdmins.empty")}</p>
      ) : (
        <ul className={styles["admin-team-list"]}>
          {subAdmins.map((admin) => (
            <li key={admin.id} className={styles["admin-team-list__item"]}>
              <span className={styles["admin-team-list__avatar"]}>
                {admin.firstName.slice(0, 1)}
                {admin.lastName.slice(0, 1)}
              </span>
              <div className={styles["admin-team-list__body"]}>
                <strong>
                  {admin.firstName} {admin.lastName}
                </strong>
                <span>{admin.email}</span>
                <span className={styles["admin-team-list__role"]}>
                  {formatAdminRole(admin.adminRole)}
                </span>
              </div>
              <span
                className={`${styles["status-badge"]} ${
                  admin.status === "active"
                    ? styles["status-badge--approved"]
                    : styles["status-badge--rejected"]
                }`}
              >
                {admin.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
