import Link from "next/link";
import { SidebarNavIcon, type SidebarNavIconName } from "./sidebar-nav-icons";
import styles from "../../app/dashboard/dashboard.module.css";

export function SidebarNavLink({
  href,
  active,
  sectionActive,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  /** A page in this link's group is open: a quieter style. */
  sectionActive?: boolean;
  /** Omitted for links nested in a group, which are indented instead. */
  icon?: SidebarNavIconName;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? styles.active
          : sectionActive
            ? styles["sidebar-section-active"]
            : undefined
      }
      aria-current={active ? "page" : undefined}
    >
      {icon ? (
        <SidebarNavIcon name={icon} className={styles["sidebar-nav-icon"]} />
      ) : null}
      <span>{children}</span>
    </Link>
  );
}
