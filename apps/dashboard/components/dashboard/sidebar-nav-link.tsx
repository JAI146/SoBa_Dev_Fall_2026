import Link from "next/link";
import { SidebarNavIcon, type SidebarNavIconName } from "./sidebar-nav-icons";
import styles from "../../app/dashboard/dashboard.module.css";

export function SidebarNavLink({
  href,
  active,
  icon,
  children,
  groupActive,
  expanded,
  controls,
  onClick,
  trailing,
}: {
  href: string;
  active: boolean;
  /** A group parent whose section holds the current page: a quieter style. */
  groupActive?: boolean;
  /** Omitted for links nested in a group, which are indented instead. */
  icon?: SidebarNavIconName;
  children: React.ReactNode;
  /** Set on a group's parent link to expose its open state. */
  expanded?: boolean;
  controls?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? styles.active
          : groupActive
            ? styles["sidebar-group-active"]
            : undefined
      }
      aria-current={active ? "page" : undefined}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
    >
      {icon ? (
        <SidebarNavIcon name={icon} className={styles["sidebar-nav-icon"]} />
      ) : null}
      <span>{children}</span>
      {trailing}
    </Link>
  );
}
