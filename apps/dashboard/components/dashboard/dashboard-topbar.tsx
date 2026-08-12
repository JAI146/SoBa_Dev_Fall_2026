import Image from "next/image";
import type { DashboardUser } from "@/lib/auth";
import styles from "../../app/dashboard/dashboard.module.css";

export function DashboardTopbar({ user }: { user: DashboardUser }) {
  const initials =
    (user.firstName?.charAt(0) ?? "") + (user.lastName?.charAt(0) ?? "");

  return (
    <header className={styles["dashboard-topbar"]}>
      <div className={styles["topbar-user"]}>
        {user.profileImageUrl ? (
          <Image
            src={user.profileImageUrl}
            alt="Profile"
            width={40}
            height={40}
            unoptimized
            className={styles["topbar-avatar"]}
          />
        ) : (
          <span className={styles["topbar-avatar-fallback"]} aria-hidden>
            {initials.toUpperCase() || "P"}
          </span>
        )}
        <div className={styles["topbar-user-text"]}>
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          <span>{user.email}</span>
        </div>
      </div>
    </header>
  );
}
