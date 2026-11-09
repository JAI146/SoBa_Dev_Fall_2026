"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { DashboardUser } from "@/lib/auth";
import { SidebarNavGroup } from "./sidebar-nav-group";
import { SidebarNavLink } from "./sidebar-nav-link";
import { SidebarChevron, SidebarNavIcon, type SidebarNavIconName } from "./sidebar-nav-icons";
import { DashboardTopbar } from "./dashboard-topbar";
import styles from "../../app/dashboard/dashboard.module.css";

export type DashboardNavItem = {
  href: string;
  active: boolean;
  icon: SidebarNavIconName;
  label: string;
  group?: DashboardNavGroup;
};
export type DashboardNavGroup = {
  label: string;
  links: { href: string; label: string }[];
  sectionPath: string;
  keepQueryKeys: string[];
  defaultQuery: string;
};

type NavCategory = "People" | "Growth" | "Operations" | "Support";
const categoryOrder: NavCategory[] = ["People", "Growth", "Operations", "Support"];
const categoryIcons: Record<NavCategory, SidebarNavIconName> = {
  People: "users", Growth: "growth", Operations: "operations", Support: "support",
};
function navCategory(href: string): NavCategory | null {
  if (href === "/dashboard" || href === "/dashboard/settings") return null;
  if (["/dashboard/users", "/dashboard/manage-roles", "/dashboard/kyc"].some((p) => href === p || href.startsWith(`${p}/`))) return "People";
  if (["/dashboard/upgrade-intents", "/dashboard/incentives", "/dashboard/subscriptions"].some((p) => href === p || href.startsWith(`${p}/`))) return "Growth";
  if (["/dashboard/support-cases", "/dashboard/coaching"].some((p) => href === p || href.startsWith(`${p}/`))) return "Support";
  return "Operations";
}

export function DashboardShell({ navItems, user, onLogout, children }: {
  navItems: DashboardNavItem[];
  user: DashboardUser;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Partial<Record<NavCategory, boolean>>>({});
  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem("purposemint-sidebar-collapsed") === "true"); } catch { /* Storage may be disabled. */ }
  }, []);
  const toggleSidebar = () => setCollapsed((current) => {
    try { window.localStorage.setItem("purposemint-sidebar-collapsed", String(!current)); } catch { /* Storage may be disabled. */ }
    return !current;
  });
  const displayLabel = (item: DashboardNavItem) => ({
    "/dashboard/manage-roles": "Roles", "/dashboard/kyc": "Verification",
    "/dashboard/upgrade-intents": "Upgrades", "/dashboard/incentives": "Rewards",
    "/dashboard/subscriptions": "Billing", "/dashboard/audit": "Compliance",
    "/dashboard/system-health": "Health", "/dashboard/support-cases": "Support Cases",
  } as Record<string, string>)[item.href] ?? item.label;
  const renderNavItem = (item: DashboardNavItem) => {
    const link = <SidebarNavLink key={item.href} href={item.href} active={item.active} icon={item.icon}>{displayLabel(item)}</SidebarNavLink>;
    return item.group ? (
      <Suspense key={item.href} fallback={link}>
        <SidebarNavGroup item={item} group={item.group} />
      </Suspense>
    ) : link;
  };
  const expandCategory = (category: NavCategory) => {
    if (collapsed) setCollapsed(false);
    setExpandedCategories((previous) => ({ ...previous, [category]: !(previous[category] ?? navItems.some((item) => navCategory(item.href) === category && item.active)) }));
  };
  return (
    <div className={`${styles["dashboard-layout"]} ${collapsed ? styles["dashboard-layout--collapsed"] : ""}`}>
      <aside className={styles.sidebar} aria-label="Sidebar">
        <div className={styles["sidebar-brand-row"]}>
          <Link href="/dashboard" className={styles["sidebar-brand"]} title={collapsed ? "PurposeMint dashboard" : undefined}>
            <span className={styles["sidebar-brand-logo"]} aria-hidden>P</span>
            <span className={styles["sidebar-brand-text"]}>PurposeMint</span>
          </Link>
          <button type="button" className={styles["sidebar-collapse-toggle"]} onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <SidebarNavIcon name="menu" className={styles["sidebar-nav-icon"]} />
          </button>
        </div>
        <nav className={styles["sidebar-nav"]} aria-label="Main navigation">
          <div className={styles["sidebar-dashboard-entry"]} title={collapsed ? "Dashboard" : undefined}>
            {navItems.filter((item) => item.href === "/dashboard").map((item) => (
              <div key={item.href} className={styles["sidebar-dashboard-group"]}>
                <div className={styles["sidebar-dashboard-row"]}>
                  <div className={styles["sidebar-dashboard-link"]}>
                    <SidebarNavLink href={item.href} active={pathname === "/dashboard"} icon={item.icon}>Dashboard</SidebarNavLink>
                  </div>
                  {item.group && !collapsed && (
                    <button type="button" className={styles["sidebar-dashboard-toggle"]}
                      onClick={() => setDashboardOpen((open) => !open)}
                      aria-label={dashboardOpen ? "Collapse Dashboard menu" : "Expand Dashboard menu"}
                      aria-expanded={dashboardOpen} aria-controls="dashboard-submenu">
                      <SidebarChevron className={`${styles["sidebar-nav-chevron"]} ${dashboardOpen ? styles["sidebar-chevron-open"] : ""}`} />
                    </button>
                  )}
                </div>
                {!collapsed && dashboardOpen && item.group && (
                  <div id="dashboard-submenu" className={styles["sidebar-dashboard-subnav"]}>
                    {item.group.links.map((link) => (
                      <SidebarNavLink key={link.href} href={`${link.href}?${item.group!.defaultQuery}`} active={pathname === link.href}>
                        {link.label}
                      </SidebarNavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {categoryOrder.map((category) => {
            const items = navItems.filter((item) => navCategory(item.href) === category);
            if (!items.length) return null;
            const active = items.some((item) => item.active || (item.group && (pathname === item.group.sectionPath || pathname.startsWith(`${item.group.sectionPath}/`))));
            const open = expandedCategories[category] ?? active;
            return (
              <div key={category} className={styles["sidebar-category"]}>
                <button type="button" className={`${styles["sidebar-category-title"]} ${active ? styles["sidebar-category-active"] : ""}`}
                  onClick={() => expandCategory(category)} aria-expanded={!collapsed && open}
                  title={collapsed ? category : undefined}>
                  <SidebarNavIcon name={categoryIcons[category]} className={styles["sidebar-nav-icon"]} />
                  <span className={styles["sidebar-category-name"]}>{category}</span>
                  <SidebarChevron className={`${styles["sidebar-nav-chevron"]} ${open ? styles["sidebar-chevron-open"] : ""}`} />
                </button>
                {!collapsed && open && <div className={styles["sidebar-category-links"]}>{items.map(renderNavItem)}</div>}
              </div>
            );
          })}
        </nav>
        <div className={styles["sidebar-footer"]}>
          <p className={styles["sidebar-nav-section-label"]}>General</p>
          {navItems.filter((item) => item.href === "/dashboard/settings").map((item) => (
            <div key={item.href} title={collapsed ? "Settings" : undefined}>{renderNavItem(item)}</div>
          ))}
          <button type="button" className={styles["sidebar-logout"]} onClick={onLogout} title={collapsed ? "Sign Out" : undefined}>
            <SidebarNavIcon name="logout" className={styles["sidebar-nav-icon"]} /><span>Sign Out</span>
          </button>
        </div>
      </aside>
      <div className={styles["main-content"]}>
<DashboardTopbar user={user} onLogout={onLogout} />
<div className={styles["dashboard-content"]}>{children}</div>
      </div>
    </div>
  );
}
