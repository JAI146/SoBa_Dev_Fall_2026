import Link from "next/link";
import { Fragment } from "react";
import { BackLink } from "@/components/dashboard/back-link";
import styles from "@/app/dashboard/dashboard.module.css";

export type DashboardBreadcrumbItem = {
  href?: string;
  label: string;
};

type DashboardBreadcrumbProps = {
  backHref: string;
  backLabel: string;
  items: DashboardBreadcrumbItem[];
};

export function DashboardBreadcrumb({
  backHref,
  backLabel,
  items,
}: DashboardBreadcrumbProps) {
  return (
    <>
      <div className={styles["page-top"]}>
        <BackLink href={backHref}>{backLabel}</BackLink>
      </div>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? " / " : null}
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span className={styles["breadcrumb__current"]}>{item.label}</span>
            )}
          </Fragment>
        ))}
      </nav>
    </>
  );
}
