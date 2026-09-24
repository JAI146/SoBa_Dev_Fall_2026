import type { ReactNode } from "react";
import {
  DashboardStatIcon,
  type DashboardStatIconName,
} from "./dashboard-stat-icons";
import styles from "../../app/dashboard/dashboard.module.css";

type DashboardStatCardProps = {
  label: string;
  value: ReactNode;
  // Optional decoration: incentive totals omit icons that could look like unused actions.
  icon?: DashboardStatIconName;
  accent?: boolean;
};

export function DashboardStatCard({
  label,
  value,
  icon,
  accent,
}: DashboardStatCardProps) {
  const cardClass = [
    styles["dashboard-stat-card"],
    accent ? styles["dashboard-stat-card--accent"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className={styles["dashboard-stat-card__head"]}>
        <span className={styles["dashboard-stat-card__label"]}>{label}</span>
        {icon ? (
          <span className={styles["dashboard-stat-card__icon"]} aria-hidden>
            <DashboardStatIcon name={icon} />
          </span>
        ) : null}
      </div>
      <span className={styles["dashboard-stat-card__value"]}>{value}</span>
    </div>
  );
}
