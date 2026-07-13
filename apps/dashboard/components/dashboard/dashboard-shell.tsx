"use client";

import Link from "next/link";
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

export function DashboardShell({
  navItems,
  user,
  onLogout,
  children,
}: {
  navItems: DashboardNavItem[];
  user: StoredUser;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles["dashboard-layout"]}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles["sidebar-brand"]}>
          <span className={styles["sidebar-brand-logo"]} aria-hidden>
            P
          </span>
          <span className={styles["sidebar-brand-text"]}>PurposeMint</span>
        </Link>
        <p className={styles["sidebar-nav-section-label"]}>Menu</p>
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
          <p className={styles["sidebar-nav-section-label"]}>General</p>
          <button
            type="button"
            className={styles["sidebar-logout"]}
            onClick={onLogout}
          >
            Sign Out
          </button>
        </div>
      </aside>
      <div className={styles["main-content"]}>
        <DashboardTopbar user={user} />
        {children}
      </div>
    </div>
  );
}
