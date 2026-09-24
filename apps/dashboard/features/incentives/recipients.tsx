"use client";

/**
 * Lists filtered, paginated benefits with simple balances and detail links.
 * Table actions open new or existing eligibility reviews and refresh after saving.
 */
import { useState } from "react";
import { useAdminQuery } from "@/lib/use-admin-query";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./incentives.module.css";
import Link from "next/link";
import {
  incentiveBenefitsSchema,
  type IncentiveBenefit,
  type IncentiveProgram,
} from "@purposemint/contracts";
import { label, money } from "./shared";
import { EligibilityReview } from "./eligibility-review";
export function Recipients({
  params,
  page,
  setPage,
  program,
}: {
  params: string;
  page: number;
  setPage: (p: number) => void;
  program: IncentiveProgram;
}) {
  const [review, setReview] = useState<IncentiveBenefit | "new" | null>(null);
  const query = useAdminQuery(
    `/admin/incentives/benefits?${params}`,
    incentiveBenefitsSchema,
  );
  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading benefit records…" />;
  return (
    <section className={base["crud-card"]}>
      <div className={`${styles.heading} ${styles.tableToolbar}`}>
        <h2>Recipients</h2>
        <button
          className={base["btn-toolbar-primary"]}
          onClick={() => setReview("new")}
        >
          New review
        </button>
      </div>
      <div className={base["table-wrap"]}>
        <table className={base["data-table"]}>
          <thead>
            <tr>
              <th>User</th>
              <th>Eligibility</th>
              <th>Earned</th>
              <th>Received</th>
              <th>Goals</th>
              <th>Withdrawn</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {query.data.items.map((benefit) => (
              <tr key={benefit.id}>
                <td>
                  <Link href={`/dashboard/users/${benefit.userId}`}>
                    <strong>{benefit.userName}</strong>
                  </Link>
                  <span className={styles.cellSecondary}>{benefit.email}</span>
                </td>
                <td>{benefit.eligible ? "Eligible" : "Not eligible"}</td>
                <td>{money(benefit.earnedCents)}</td>
                <td>{money(benefit.distributedCents)}</td>
                <td>{benefit.goalTitles.join(", ") || "Not allocated"}</td>
                <td>
                  {benefit.withdrawalStatus === "not_confirmed"
                    ? "Not confirmed"
                    : money(benefit.withdrawnCents)}
                </td>
                <td>{money(benefit.remainingCents)}</td>
                <td>
                  <span className={styles.status}>{label(benefit.status)}</span>
                </td>
                <td>
                  <div className={styles.tableActions}>
                    <button
                      className={styles.buttonLink}
                      onClick={() => setReview(benefit)}
                      aria-label={`Review for ${benefit.userName}`}
                    >
                      Review
                    </button>
                    <Link
                      className={base["table-link"]}
                      href={`/dashboard/incentives/${benefit.id}`}
                    >
                      Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!query.data.items.length ? (
              <tr>
                <td colSpan={9} className={base.empty}>
                  No recipients found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className={base.pagination}>
        <span>{query.data.total} records</span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {query.data.totalPages}
          </span>
          <button
            disabled={page >= query.data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {review ? (
        <EligibilityReview
          program={program}
          benefit={review === "new" ? undefined : review}
          onClose={() => setReview(null)}
          onSaved={() => {
            setReview(null);
            void query.reload();
          }}
        />
      ) : null}
    </section>
  );
}
