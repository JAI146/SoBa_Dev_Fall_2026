"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import type { DashboardNavGroup, DashboardNavItem } from "./dashboard-shell";
import { SidebarNavLink } from "./sidebar-nav-link";
import { SidebarChevron } from "./sidebar-nav-icons";
import styles from "../../app/dashboard/dashboard.module.css";

/**
 * A sidebar item with an indented list of pages under it. The item's text is
 * an ordinary link; a separate chevron button opens and closes the list. The
 * list stays open while one of its pages is showing, and those pages keep
 * their query (such as the date range) as you move between them.
 */
export function SidebarNavGroup({
  item,
  group,
}: {
  item: DashboardNavItem;
  group: DashboardNavGroup;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const inSection =
    pathname === group.sectionPath ||
    pathname.startsWith(`${group.sectionPath}/`);
  const [toggled, setToggled] = useState(false);
  // Every other page starts with the list closed.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setToggled(false);
  }
  const open = inSection || toggled;

  const kept = new URLSearchParams();
  if (inSection) {
    for (const key of group.keepQueryKeys) {
      const value = searchParams.get(key);
      if (value !== null) kept.set(key, value);
    }
  }
  const query = kept.toString() || group.defaultQuery;

  return (
    <div className={styles["sidebar-group"]}>
      <div className={styles["sidebar-group-row"]}>
        <SidebarNavLink
          href={item.href}
          active={item.active}
          sectionActive={inSection}
          icon={item.icon}
        >
          {item.label}
        </SidebarNavLink>
        <button
          type="button"
          className={styles["sidebar-group-toggle"]}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${open ? "Hide" : "Show"} ${group.label.toLowerCase()}`}
          // While one of its pages is showing, the list stays open.
          disabled={inSection}
          onClick={() => setToggled((value) => !value)}
        >
          <SidebarChevron className={styles["sidebar-nav-chevron"]} />
        </button>
      </div>
      <div
        id={listId}
        role="group"
        aria-label={group.label}
        className={styles["sidebar-subnav"]}
        hidden={!open}
      >
        {group.links.map((link) => (
          <SidebarNavLink
            key={link.href}
            href={`${link.href}?${query}`}
            active={pathname === link.href}
          >
            {link.label}
          </SidebarNavLink>
        ))}
      </div>
    </div>
  );
}
