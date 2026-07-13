"use client";

import Link from "next/link";
import { LanguageSwitcher, useI18n } from "@muakhah/i18n";
import type { StoredUser } from "@/lib/auth";
import { BellIcon, MailIcon } from "./dashboard-stat-icons";
import styles from "../../app/dashboard/dashboard.module.css";

function UserAvatar({ user, alt }: { user: StoredUser; alt: string }) {
  if (user.profileImageUrl) {
    return (
      <img
        src={user.profileImageUrl}
        alt={alt}
        className={styles["topbar-avatar"]}
      />
    );
  }

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  return (
    <span className={styles["topbar-avatar-fallback"]} aria-hidden>
      {initials || "?"}
    </span>
  );
}

type DashboardTopbarProps = {
  user: StoredUser;
  messagesHref?: string;
  notificationsHref?: string;
};

export function DashboardTopbar({
  user,
  messagesHref,
  notificationsHref,
}: DashboardTopbarProps) {
  const { t } = useI18n();

  return (
    <header className={styles["dashboard-topbar"]}>
      <div className={styles["topbar-right"]}>
        <div className={styles["topbar-language"]}>
          <LanguageSwitcher className={styles["topbar-language-switcher"]} />
        </div>

        {(messagesHref || notificationsHref) && (
          <div className={styles["topbar-actions"]}>
            {messagesHref && (
              <Link
                href={messagesHref}
                className={styles["topbar-icon-btn"]}
                aria-label={t("dashboard.topbar.messages")}
              >
                <MailIcon className={styles["topbar-icon-btn__svg"]} />
              </Link>
            )}
            {notificationsHref && (
              <Link
                href={notificationsHref}
                className={styles["topbar-icon-btn"]}
                aria-label={t("dashboard.topbar.notifications")}
              >
                <BellIcon className={styles["topbar-icon-btn__svg"]} />
              </Link>
            )}
          </div>
        )}

        <div className={styles["topbar-user"]}>
          <UserAvatar user={user} alt={t("common.profileAlt")} />
          <div className={styles["topbar-user-text"]}>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
