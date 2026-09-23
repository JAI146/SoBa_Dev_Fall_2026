"use client";

import {
  ChecklistCategory,
  adminChecklistItemSchema,
  adminPathwayApplicationDetailResponseSchema,
  type AdminChecklistItem,
  type ChecklistCategoryValue,
} from "@purposemint/contracts";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import {
  formatAdminDateTime,
  formatEnum,
  formatMoney,
} from "@/lib/admin-format";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../../dashboard.module.css";

const categoryOrder = Object.values(ChecklistCategory);

export default function PathwayApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useAdminQuery(
    `/admin/pathway-applications/${id}`,
    adminPathwayApplicationDetailResponseSchema,
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading application details…" />;
  const application = query.data;

  const updateChecklist = async (itemId: string, isComplete: boolean) => {
    setUpdatingId(itemId);
    setUpdateError(null);
    try {
      await apiRequest(
        `/admin/pathway-checklist-items/${itemId}`,
        { method: "PATCH", body: JSON.stringify({ isComplete }) },
        getToken(),
        adminChecklistItemSchema,
      );
      await query.reload();
    } catch (cause) {
      setUpdateError(
        cause instanceof Error
          ? cause.message
          : "The checklist item could not be updated.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className={styles["dashboard-page"]}>
      <Link
        className={styles["back-link"]}
        href="/dashboard/pathway-applications"
      >
        Back to pathway applications
      </Link>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Application review</p>
          <h1>{application.pathway.title}</h1>
          <p>
            {application.applicant.name} · {application.applicant.email}
          </p>
        </div>
        <span className={styles.badge}>{formatEnum(application.status)}</span>
      </div>

      <section className={styles["overview-grid"]}>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Application details</h2>
              <p>Applicant and submission record</p>
            </div>
          </div>
          <dl className={styles["record-grid"]}>
            <div>
              <dt>Applicant</dt>
              <dd>
                <Link
                  className={styles["inline-link"]}
                  href={`/dashboard/users/${application.applicant.id}`}
                >
                  {application.applicant.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Pathway minimum</dt>
              <dd>{formatMoney(application.pathway.minimumAmount)}</dd>
            </div>
            <div>
              <dt>Self-attested savings</dt>
              <dd>{formatMoney(application.attestedAmount)}</dd>
            </div>
            <div>
              <dt>Verification method</dt>
              <dd>{formatEnum(application.verificationMethod)}</dd>
            </div>
            <div>
              <dt>Attestation accepted</dt>
              <dd>
                {formatAdminDateTime(
                  application.attestationAcceptedAt,
                  application.applicant.timeZone,
                )}
              </dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>
                {formatAdminDateTime(
                  application.submittedAt,
                  application.applicant.timeZone,
                )}
              </dd>
            </div>
            <div>
              <dt>Applicant timezone</dt>
              <dd>{application.applicant.timeZone ?? "Not set"}</dd>
            </div>
          </dl>
          <p className={styles["provenance-note"]}>
            The savings amount was reported by the applicant. It has not been
            bank-verified.
          </p>
        </article>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Selected partners</h2>
              <p>Organizations selected by the applicant</p>
            </div>
          </div>
          <div className={styles["partner-list"]}>
            {application.selectedPartners.map((partner) => (
              <section key={partner.id} className={styles["partner-card"]}>
                <h3>{partner.name}</h3>
                <p>
                  {partner.partnerType} · {partner.locationLabel}
                </p>
                <p>{partner.description}</p>
                <div className={styles["tag-list"]}>
                  {partner.capabilityTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p className={styles["data-gap"]}>
                  Contact details are not stored for this partner.
                </p>
              </section>
            ))}
            {application.selectedPartners.length === 0 ? (
              <p className={styles["panel-empty"]}>No partners selected.</p>
            ) : null}
          </div>
        </article>
      </section>

      <section className={styles["stacked-panels"]}>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Readiness checklist</h2>
              <p>Shared progress for the applicant and coordinator</p>
            </div>
            <span>
              {
                application.checklistItems.filter((item) => item.isComplete)
                  .length
              }{" "}
              of {application.checklistItems.length} complete
            </span>
          </div>
          {updateError ? (
            <div className={styles["inline-error"]} role="alert">
              {updateError}
            </div>
          ) : null}
          <div className={styles["checklist-groups"]}>
            {categoryOrder.map((category) => (
              <ChecklistGroup
                key={category}
                category={category}
                items={application.checklistItems.filter(
                  (item) => item.category === category,
                )}
                updatingId={updatingId}
                onUpdate={updateChecklist}
                timeZone={application.applicant.timeZone}
              />
            ))}
          </div>
          {application.checklistItems.length === 0 ? (
            <p className={styles["panel-empty"]}>
              No checklist items are available for this application.
            </p>
          ) : null}
        </article>
      </section>
    </main>
  );
}

function ChecklistGroup({
  category,
  items,
  updatingId,
  onUpdate,
  timeZone,
}: {
  category: ChecklistCategoryValue;
  items: AdminChecklistItem[];
  updatingId: string | null;
  onUpdate: (id: string, complete: boolean) => Promise<void>;
  timeZone: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section className={styles["checklist-group"]}>
      <h3>{formatEnum(category)}</h3>
      <div>
        {items.map((item) => (
          <label key={item.id} className={styles["checklist-row"]}>
            <input
              type="checkbox"
              checked={item.isComplete}
              disabled={updatingId !== null}
              onChange={(event) => void onUpdate(item.id, event.target.checked)}
            />
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
              {item.completedAt ? (
                <small>
                  Completed {formatAdminDateTime(item.completedAt, timeZone)}
                </small>
              ) : null}
            </span>
            {updatingId === item.id ? <em>Saving…</em> : null}
          </label>
        ))}
      </div>
    </section>
  );
}
