"use client";

import {
  PathwayApplicationStatus,
  adminPathwayApplicationsResponseSchema,
  type PathwayApplicationStatusValue,
} from "@purposemint/contracts";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import {
  formatAdminDateTime,
  formatEnum,
  formatMoney,
} from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../dashboard.module.css";

const PAGE_SIZE = 20;

export default function PathwayApplicationsPage() {
  const [page, setPage] = useState(1);
  const [pathwayKey, setPathwayKey] = useState("");
  const [status, setStatus] = useState<"" | PathwayApplicationStatusValue>(
    PathwayApplicationStatus.SUBMITTED,
  );
  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (pathwayKey) params.set("pathwayKey", pathwayKey);
    if (status) params.set("status", status);
    return `/admin/pathway-applications?${params.toString()}`;
  }, [page, pathwayKey, status]);
  const query = useAdminQuery(path, adminPathwayApplicationsResponseSchema);

  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading pathway applications…" />;
  const data = query.data;

  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Coordinator workspace</p>
          <h1>Pathway applications</h1>
          <p>Review submissions and update the shared readiness checklist.</p>
        </div>
      </div>
      <section className={styles["crud-card"]}>
        <div className={styles.filters}>
          <label className={styles["filter-field"]}>
            <span>Pathway</span>
            <select
              value={pathwayKey}
              onChange={(event) => {
                setPathwayKey(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All pathways</option>
              {data.pathways.map((pathway) => (
                <option key={pathway.key} value={pathway.key}>
                  {pathway.title}
                </option>
              ))}
            </select>
          </label>
          <label className={styles["filter-field"]}>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value as "" | PathwayApplicationStatusValue,
                );
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value={PathwayApplicationStatus.SUBMITTED}>
                Submitted
              </option>
              <option value={PathwayApplicationStatus.DRAFT}>Draft</option>
            </select>
          </label>
        </div>
        <div className={styles["table-wrap"]}>
          <table className={styles["data-table"]}>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Pathway</th>
                <th>Self-attested savings</th>
                <th>Selected partners</th>
                <th>Checklist</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((application) => (
                <tr key={application.id}>
                  <td>
                    <strong>{application.applicant.name}</strong>
                    <span>{application.applicant.email}</span>
                  </td>
                  <td>{application.pathway.title}</td>
                  <td>
                    {formatMoney(application.attestedAmount)}
                    <span>{formatEnum(application.verificationMethod)}</span>
                  </td>
                  <td>
                    {application.selectedPartners.length
                      ? application.selectedPartners
                          .map((partner) => partner.name)
                          .join(", ")
                      : "None selected"}
                  </td>
                  <td>
                    {application.checklistProgress.completed} of{" "}
                    {application.checklistProgress.total} complete
                  </td>
                  <td>
                    <span className={styles.badge}>
                      {formatEnum(application.status)}
                    </span>
                  </td>
                  <td>
                    {formatAdminDateTime(
                      application.submittedAt,
                      application.applicant.timeZone,
                    )}
                  </td>
                  <td>
                    <Link
                      className={styles["table-link"]}
                      href={`/dashboard/pathway-applications/${application.id}`}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    No pathway applications match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <span>{data.total.toLocaleString()} applications</span>
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
