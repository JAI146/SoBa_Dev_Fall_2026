"use client";

import { useState } from "react";
import { adminSubscriptionDetailSchema } from "@purposemint/contracts";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { useAdminQuery } from "@/lib/use-admin-query";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatMoney, formatEnum } from "@/lib/admin-format";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./subscription-management.module.css";
import { apiRoot, dateLabel } from "./shared";
import {
  SubscriptionEditor,
  type SubscriptionEditorAction,
} from "./subscription-editor";

export function SubscriptionDetail({
  id,
  onBack,
  onChanged,
}: {
  id: string;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const query = useAdminQuery(
    `${apiRoot}/subscriptions/${id}`,
    adminSubscriptionDetailSchema,
  );
  const [action, setAction] = useState<SubscriptionEditorAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading subscription…" />;
  const { subscription: row, history, billingRecords } = query.data;
  async function refresh() {
    await query.reload();
    await onChanged();
  }
  async function clearPending() {
    setSaving(true);
    setError(null);
    try {
      await apiRequest(
        `${apiRoot}/subscriptions/${id}/remove-scheduled-change`,
        {
          method: "POST",
          body: JSON.stringify({ expectedVersion: row.version }),
        },
        getToken(),
        adminSubscriptionDetailSchema,
      );
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The scheduled change could not be removed.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className={styles.detail}>
      <div className={styles.actions}>
        <button onClick={onBack}>Back to subscriptions</button>
        <button
          disabled={saving || Boolean(row.pendingChange)}
          onClick={() => setAction("change")}
        >
          {row.status === "cancelled"
            ? "Reactivate / change plan"
            : "Change plan or cycle"}
        </button>
        {row.status !== "cancelled" && (
          <>
            <button
              className={styles.danger}
              disabled={saving || Boolean(row.pendingChange)}
              onClick={() => setAction("cancel")}
            >
              Cancel subscription
            </button>
            {row.billing.regularAmountCents > 0 && (
              <button disabled={saving} onClick={() => setAction("payment")}>
                Record payment outcome
              </button>
            )}
          </>
        )}
        <button disabled={saving} onClick={() => void query.reload()}>
          Refresh details
        </button>
      </div>
      {error && (
        <p className={base["inline-error"]} role="alert">
          {error}
        </p>
      )}
      <section className={base.panel}>
        <div className={base["panel-heading"]}>
          <div>
            <h2>{row.userName}</h2>
            <p>{row.userEmail}</p>
          </div>
        </div>
        <dl className={styles.details}>
          <div>
            <dt>Current plan</dt>
            <dd>{row.planName}</dd>
          </div>
          <div>
            <dt>Subscription status</dt>
            <dd>{formatEnum(row.status)}</dd>
          </div>
          <div>
            <dt>Billing cycle</dt>
            <dd>{formatEnum(row.billing.cycle)}</dd>
          </div>
          <div>
            <dt>Agreed price</dt>
            <dd>{formatMoney(row.billing.amountCents / 100)}</dd>
          </div>
          <div>
            <dt>Agreed regular price</dt>
            <dd>{formatMoney(row.billing.regularAmountCents / 100)}</dd>
          </div>
          <div>
            <dt>Payment status</dt>
            <dd>{formatEnum(row.paymentStatus)}</dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd>{dateLabel(row.startedAt)}</dd>
          </div>
          <div>
            <dt>Renewal</dt>
            <dd>{dateLabel(row.renewalAt)}</dd>
          </div>
          <div>
            <dt>Cancellation</dt>
            <dd>
              {row.cancelledAt
                ? dateLabel(row.cancelledAt)
                : row.pendingChange?.action === "cancel"
                  ? `Scheduled for ${dateLabel(row.pendingChange.effectiveAt)}`
                  : "None"}
            </dd>
          </div>
          <div>
            <dt>Failed payments</dt>
            <dd>{row.failedPayments}</dd>
          </div>
          <div>
            <dt>Pathways access / limit</dt>
            <dd>
              {row.entitlements.pathways
                ? `Included · ${row.limits.pathwayApplications ?? "Unlimited"}`
                : "Not included"}
            </dd>
          </div>
          <div>
            <dt>Community challenge access / limit</dt>
            <dd>
              {row.entitlements.communityChallenges
                ? `Included · ${row.limits.challengeParticipations ?? "Unlimited"}`
                : "Not included"}
            </dd>
          </div>
        </dl>
        {row.pendingChange && (
          <div className={styles.notice}>
            <p>
              {row.pendingChange.action === "cancel"
                ? "Cancellation"
                : `Change to ${row.pendingChange.terms?.planName} (${row.pendingChange.terms?.cycle})`}{" "}
              scheduled for {dateLabel(row.pendingChange.effectiveAt)}.
            </p>
            <button
              className={base["table-link"]}
              disabled={saving}
              onClick={() => void clearPending()}
            >
              Remove scheduled change
            </button>
          </div>
        )}
      </section>
      <section className={base["crud-card"]}>
        <div className={styles.toolbar}>
          <h2>Subscription history</h2>
        </div>
        <div className={base["table-wrap"]}>
          <table className={`${base["data-table"]} ${styles["compact-table"]}`}>
            <thead>
              <tr>
                <th>Action</th>
                <th>Plan change</th>
                <th>Billing terms</th>
                <th>Effective</th>
                <th>Administrator</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {history.map((event) => (
                <tr key={event.id}>
                  <td>{formatEnum(event.action)}</td>
                  <td>
                    {event.previousBilling?.planName ??
                      event.previousPlanKey ??
                      "None"}{" "}
                    → {event.newBilling?.planName ?? event.newPlanKey ?? "None"}
                  </td>
                  <td>
                    {event.previousBilling
                      ? `${formatMoney(event.previousBilling.amountCents / 100)} / ${event.previousBilling.cycle}`
                      : "None"}{" "}
                    →{" "}
                    {event.newBilling
                      ? `${formatMoney(event.newBilling.amountCents / 100)} / ${event.newBilling.cycle}`
                      : "None"}
                  </td>
                  <td>{dateLabel(event.effectiveAt)}</td>
                  <td className={styles["identifier-cell"]}>
                    {event.authorizedBy ?? "System"}
                  </td>
                  <td>{dateLabel(event.recordedAt)}</td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <td colSpan={6} className={base.empty}>
                    No subscription changes have been recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className={base["crud-card"]}>
        <div className={styles.toolbar}>
          <h2>Billing records</h2>
        </div>
        <div className={base["table-wrap"]}>
          <table className={`${base["data-table"]} ${styles["compact-table"]}`}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Occurred</th>
                <th>Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {billingRecords.map((record) => (
                <tr key={record.id}>
                  <td>{formatEnum(record.status)}</td>
                  <td>{formatMoney(record.amountCents / 100)}</td>
                  <td>
                    <strong>{record.reference}</strong>
                    <span>{record.note}</span>
                  </td>
                  <td>{dateLabel(record.occurredAt)}</td>
                  <td className={styles["identifier-cell"]}>
                    {record.authorizedBy}
                  </td>
                </tr>
              ))}
              {!billingRecords.length && (
                <tr>
                  <td colSpan={5} className={base.empty}>
                    No payments have been recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {action && (
        <SubscriptionEditor
          action={action}
          subscription={row}
          onClose={() => setAction(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
