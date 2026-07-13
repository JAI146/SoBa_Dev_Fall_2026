import Link from "next/link";
import { BackIcon } from "./action-icons";
import styles from "@/app/dashboard/dashboard.module.css";

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={styles["btn-back"]}>
      <BackIcon className={styles["btn-back__icon"]} />
      {children}
    </Link>
  );
}
