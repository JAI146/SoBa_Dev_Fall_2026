"use client";

import Link from "next/link";
import { useI18n } from "@muakhah/i18n";
import type { StoredUser } from "@/lib/auth";
import { SidebarNavLink } from "./sidebar-nav-link";
import type { SidebarNavIconName } from "./sidebar-nav-icons";
import { DashboardTopbar } from "./dashboard-topbar";
import styles from "../../app/dashboard/dashboard.module.css";

export type DashboardNavItem = {
  href: string;
  active: boolean;
  icon: SidebarNavIconName;
  label: string;
};

type DashboardShellProps = {
  brandHref?: string;
  brandLabel: string;
  navItems: DashboardNavItem[];
  user: StoredUser;
  onLogout: () => void;
  logoutLabel: string;
  messagesHref?: string;
  notificationsHref?: string;
  children: React.ReactNode;
};

export function DashboardShell({
  brandHref,
  brandLabel,
  navItems,
  user,
  onLogout,
  logoutLabel,
  messagesHref,
  notificationsHref,
  children,
}: DashboardShellProps) {
  const { t } = useI18n();

  const brandContent = (
    <>
      <span className={styles["sidebar-brand-logo"]} aria-hidden>
        M
      </span>
      <span className={styles["sidebar-brand-text"]}>
        Mu<span>akhah</span> {brandLabel}
      </span>
    </>
  );

  return (
    <div className={styles["dashboard-layout"]}>
      <aside className={styles.sidebar}>
        {brandHref ? (
          <Link href={brandHref} className={styles["sidebar-brand"]}>
            {brandContent}
          </Link>
        ) : (
          <div className={styles["sidebar-brand"]}>{brandContent}</div>
        )}

        <p className={styles["sidebar-nav-section-label"]}>{t("dashboard.nav.menu")}</p>
        <nav className={styles["sidebar-nav"]}>
          {navItems.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              active={item.active}
              icon={item.icon}
            >
              {item.label}
            </SidebarNavLink>
          ))}
        </nav>

        <div className={styles["sidebar-footer"]}>
          <p className={styles["sidebar-nav-section-label"]}>{t("dashboard.nav.general")}</p>
          <button
            type="button"
            className={styles["sidebar-logout"]}
            onClick={onLogout}
          >
            {logoutLabel}
          </button>
        </div>
      </aside>

      <div className={styles["main-content"]}>
        <DashboardTopbar
          user={user}
          messagesHref={messagesHref}
          notificationsHref={notificationsHref}
        />
        {children}
      </div>
    </div>
  );
}
