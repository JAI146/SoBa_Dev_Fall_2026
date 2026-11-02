"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
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
  /** Pages listed under this item in an expandable group. */
  group?: DashboardNavGroup;
};

export type DashboardNavGroup = {
  /** Names the list and its toggle, e.g. "Reports". */
  label: string;
  links: { href: string; label: string }[];
  /** Pages under this path keep the list open. */
  sectionPath: string;
  /** Query keys carried between the group's pages, e.g. the date range. */
  keepQueryKeys: string[];
  /** Query used when arriving from outside the group. */
  defaultQuery: string;
};

// PM_UI_V2: navigation sections; the route and permissions remain owned by layout.tsx.
type NavCategory = "People" | "Growth" | "Operations" | "Support";
const categoryOrder: NavCategory[] = ["People", "Growth", "Operations", "Support"];
function navCategory(href: string): NavCategory | null {
  if (href === "/dashboard" || href === "/dashboard/settings") return null;
  if (["/dashboard/users", "/dashboard/manage-roles", "/dashboard/kyc"].some((p) => href === p || href.startsWith(`${p}/`))) return "People";
  if (["/dashboard/upgrade-intents", "/dashboard/incentives", "/dashboard/subscriptions"].some((p) => href === p || href.startsWith(`${p}/`))) return "Growth";
  if (["/dashboard/support-cases", "/dashboard/coaching"].some((p) => href === p || href.startsWith(`${p}/`))) return "Support";
  return "Operations";
}
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
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] = useState<Partial<Record<NavCategory, boolean>>>({});
  const displayLabel = (item: DashboardNavItem) => ({
    "/dashboard/manage-roles": "Roles",
    "/dashboard/kyc": "Verification",
    "/dashboard/upgrade-intents": "Upgrades",
    "/dashboard/incentives": "Rewards",
    "/dashboard/subscriptions": "Billing",
    "/dashboard/audit": "Compliance",
    "/dashboard/system-health": "Health",
    "/dashboard/support-cases": "Support Cases",
  } as Record<string, string>)[item.href] ?? item.label;
  const renderNavItem = (item: DashboardNavItem) => {
    const link = (
      <SidebarNavLink key={item.href} href={item.href} active={item.active} icon={item.icon}>
        {displayLabel(item)}
      </SidebarNavLink>
    );
    return item.group ? (
      <Suspense key={item.href} fallback={link}>
        <SidebarNavGroup item={item} group={item.group} />
      </Suspense>
    ) : link;
  };
  return (
    <div className={styles["dashboard-layout"]}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles["sidebar-brand"]}>
          <span className={styles["sidebar-brand-logo"]} aria-hidden>
            P
          </span>
          <span className={styles["sidebar-brand-text"]}>PurposeMint</span>
        </Link>
        <nav className={styles["sidebar-nav"]} aria-label="Main navigation">
          {navItems.filter((item) => item.href === "/dashboard").map(renderNavItem)}
          {categoryOrder.map((category) => {
            const items = navItems.filter((item) => navCategory(item.href) === category);
            if (items.length === 0) return null;
            const active = items.some((item) => item.active ||
              (item.group && (pathname === item.group.sectionPath || pathname.startsWith(`${item.group.sectionPath}/`))));
            return (
              <details key={category} className={styles["sidebar-category"]}
                open={expandedCategories[category] ?? active}
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open;
                  setExpandedCategories((previous) => previous[category] === isOpen ? previous : { ...previous, [category]: isOpen });
                }}>
                <summary className={styles["sidebar-category-title"]}>
                  <span>{category}</span>
                  <span className={styles["sidebar-category-indicator"]} aria-hidden="true">⌄</span>
                </summary>
                <div className={styles["sidebar-category-links"]}>{items.map(renderNavItem)}</div>
              </details>
            );
          })}
          {navItems.filter((item) => item.href === "/dashboard/settings").map(renderNavItem)}
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
