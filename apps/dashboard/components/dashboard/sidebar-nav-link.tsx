import Link from "next/link";
import { SidebarNavIcon, type SidebarNavIconName } from "./sidebar-nav-icons";
import styles from "../../app/dashboard/dashboard.module.css";

export function SidebarNavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: SidebarNavIconName;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={active ? styles.active : undefined}>
      <SidebarNavIcon name={icon} className={styles["sidebar-nav-icon"]} />
      <span>{children}</span>
    </Link>
  );
}
