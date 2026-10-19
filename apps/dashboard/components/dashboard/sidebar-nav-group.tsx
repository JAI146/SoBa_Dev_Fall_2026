"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useId } from "react";
import type { DashboardNavItem } from "./dashboard-shell";
import { SidebarNavLink } from "./sidebar-nav-link";
import { SidebarChevron } from "./sidebar-nav-icons";
import styles from "../../app/dashboard/dashboard.module.css";

/**
 * A parent link with indented child links. The group is open on every page
 * under the parent, where the parent takes a quieter style and only the
 * current child is highlighted. Clicking the parent opens its own page, and
 * query parameters such as the analytics window carry across the group.
 */
export function SidebarNavGroup({
  item,
}: {
  item: DashboardNavItem & { children: { href: string; label: string }[] };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const open = pathname === item.href || pathname.startsWith(`${item.href}/`);

  const query = open ? searchParams.toString() : "";
  const withQuery = (href: string) => (query ? `${href}?${query}` : href);

  return (
    <div className={styles["sidebar-group"]}>
      <SidebarNavLink
        href={withQuery(item.href)}
        active={false}
        groupActive={open}
        icon={item.icon}
        expanded={open}
        controls={listId}
        trailing={<SidebarChevron className={styles["sidebar-nav-chevron"]} />}
      >
        {item.label}
      </SidebarNavLink>
      <div
        id={listId}
        role="group"
        aria-label={`${item.label} pages`}
        className={styles["sidebar-subnav"]}
        hidden={!open}
      >
        {item.children.map((child) => (
          <SidebarNavLink
            key={child.href}
            href={withQuery(child.href)}
            // Exact match, so the overview child is not active on its siblings.
            active={pathname === child.href}
          >
            {child.label}
          </SidebarNavLink>
        ))}
      </div>
    </div>
  );
}
