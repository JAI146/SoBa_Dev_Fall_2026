import type { ReactNode } from "react";
import { AuthTitleIcon, type AuthTitleIconName } from "@/components/auth/auth-icons";
import styles from "@/app/auth.module.css";

export function AuthPageTitle({
  icon,
  children,
}: {
  icon: AuthTitleIconName;
  children: ReactNode;
}) {
  return (
    <h1 className={styles["auth-title"]}>
      <span className={styles["auth-title__icon"]}>
        <AuthTitleIcon name={icon} />
      </span>
      {children}
    </h1>
  );
}
