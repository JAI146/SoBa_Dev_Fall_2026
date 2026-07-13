"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@muakhah/i18n";
import styles from "../../dashboard.module.css";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/admin">{t("common.admin")}</Link> /{" "}
        {t("admin.settings.title")}
      </div>
      <div className={styles["page-header"]}>
        <h1>{t("admin.settings.title")}</h1>
      </div>
      <div className={styles.tabs}>
        <Link
          href="/dashboard/admin/settings/config/s3"
          className={pathname?.includes("/config") ? styles.active : ""}
        >
          {t("admin.settings.config")}
        </Link>
      </div>
      {children}
    </>
  );
}
