"use client";

import Link from "next/link";
import { Suspense } from "react";
import type { DashboardUser } from "@/lib/auth";
import { SidebarNavGroup } from "./sidebar-nav-group";
import { SidebarNavLink } from "./sidebar-nav-link";
import type { SidebarNavIconName } from "./sidebar-nav-icons";
import { DashboardTopbar } from "./dashboard-topbar";
import styles from "../../app/dashboard/dashboard.module.css";

export type DashboardNavItem = {
  href: string;
  active: boolean;
  icon: SidebarNavIconName;
  label: string;
  /** Child pages shown indented under this item as an expandable group. */
  children?: { href: string; label: string }[];
};

export function DashboardShell({
  navItems,
  user,
  onLogout,
  children,
}: {
  navItems: DashboardNavItem[];
  user: DashboardUser;
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
          {navItems.map((item) => {
            const link = (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                active={item.active}
                icon={item.icon}
              >
                {item.label}
              </SidebarNavLink>
            );
            const children = item.children;
            if (!children) return link;
            // Groups read the URL's query, which needs a Suspense boundary.
            return (
              <Suspense key={item.href} fallback={link}>
                <SidebarNavGroup item={{ ...item, children }} />
              </Suspense>
            );
          })}
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
