"use client";

import { adminUpgradeIntentsResponseSchema } from "@purposemint/contracts";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { formatAdminDateTime } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../dashboard.module.css";

const PAGE_SIZE = 20;

export default function UpgradeIntentsPage() {
  const [page, setPage] = useState(1);
  const path = useMemo(
    () => `/admin/upgrade-intents?page=${page}&pageSize=${PAGE_SIZE}`,
    [page],
  );
  const query = useAdminQuery(path, adminUpgradeIntentsResponseSchema);

  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading upgrade intents…" />;
  const data = query.data;

  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Membership demand</p>
          <h1>Upgrade intents</h1>
          <p>Customer interest recorded before paid plans open.</p>
        </div>
      </div>
      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Upgrade intents by plan"
      >
        {data.groups.map((group, index) => (
          <DashboardStatCard
            key={group.key}
            label={group.label}
            value={group.count.toLocaleString()}
            icon="accounts"
            accent={index === 1}
          />
        ))}
      </section>
      <section className={`${styles["crud-card"]} ${styles["section-spaced"]}`}>
        <div className={styles["table-wrap"]}>
          <table className={styles["data-table"]}>
            <thead>
              <tr>
                <th>User</th>
                <th>Requested plan</th>
                <th>Requested</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((intent) => (
                <tr key={intent.id}>
                  <td>
                    <strong>{intent.user.name}</strong>
                    <span>{intent.user.email}</span>
                  </td>
                  <td>{intent.planName}</td>
                  <td>
                    {formatAdminDateTime(
                      intent.createdAt,
                      intent.user.timeZone,
                    )}
                  </td>
                  <td>
                    <Link
                      className={styles["table-link"]}
                      href={`/dashboard/users/${intent.user.id}`}
                    >
                      View user
                    </Link>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    No upgrade intents recorded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <span>{data.total.toLocaleString()} intents</span>
          <div>
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
