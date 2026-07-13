"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@muakhah/i18n";
import styles from "../../../dashboard.module.css";

export default function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <>
      <div className={styles.tabs}>
        <Link
          href="/dashboard/admin/settings/config/s3"
          className={pathname?.endsWith("/s3") ? styles.active : ""}
        >
          {t("admin.settings.s3Tab")}
        </Link>
        <Link
          href="/dashboard/admin/settings/config/smtp"
          className={pathname?.endsWith("/smtp") ? styles.active : ""}
        >
          {t("admin.settings.smtpTab")}
        </Link>
      </div>
      {children}
    </>
  );
}
