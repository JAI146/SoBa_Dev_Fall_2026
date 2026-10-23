"use client";

import {
  AdminPermission,
  SupportCaseStatus,
  SupportCaseType,
  adminMyPermissionsResponseSchema,
  adminUserDetailResponseSchema,
  hasAdminPermission,
  supportCaseDetailSchema,
  supportCaseHistoryResponseSchema,
  type SupportCaseDetail,
} from "@purposemint/contracts";
import Link from "next/link";
import { useState } from "react";
import { ConfirmModal } from "@/components/common/confirm-modal";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { formatAdminDateTime, formatEnum } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./support-cases.module.css";
import { CaseDialog, type CaseDialogKind } from "./case-dialogs";
import { CaseHistory } from "./case-history";
import { CustomerContext } from "./customer-context";
import {
  PriorityBadge,
  StatusBadge,
  TypeBadge,
  postCaseAction,
  useStaffOptions,
} from "./shared";

export function CaseDetailPage({ id }: { id: string }) {
  const caseQuery = useAdminQuery(
    `/admin/support-cases/${id}`,
    supportCaseDetailSchema,
  );
  if (caseQuery.error && !caseQuery.data)
    return (
      <DashboardError
        message={caseQuery.error}
        onRetry={() => void caseQuery.reload()}
      />
    );
  if (!caseQuery.data) return <DashboardLoading label="Loading case…" />;
  return (
    <CaseWorkspace caseItem={caseQuery.data} reloadCase={caseQuery.reload} />
  );
}

function CaseWorkspace({
  caseItem,
  reloadCase,
}: {
  caseItem: SupportCaseDetail;
  reloadCase: () => Promise<void>;
}) {
  const history = useAdminQuery(
    `/admin/support-cases/${caseItem.id}/history`,
    supportCaseHistoryResponseSchema,
  );
  const user = useAdminQuery(
    `/admin/users/${caseItem.customer.id}`,
    adminUserDetailResponseSchema,
  );
  const permissions = useAdminQuery(
    "/admin/me/permissions",
    adminMyPermissionsResponseSchema,
  );
  const { staff } = useStaffOptions();
  const [dialog, setDialog] = useState<CaseDialogKind | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // UX only; the API enforces support_cases.edit on every mutation.
  const canEdit = permissions.data
    ? hasAdminPermission(
        null,
        AdminPermission.SUPPORT_CASES_EDIT,
        permissions.data.permissions,
      )
    : false;
  const status = caseItem.status;
  const isClosed = status === SupportCaseStatus.CLOSED;
  const isResolved = status === SupportCaseStatus.RESOLVED;
  const isOpen = !isClosed && !isResolved;
  const tz = caseItem.customer.timeZone;
  const staffNames = new Map(staff.map((member) => [member.id, member.name]));
  if (caseItem.assignee)
    staffNames.set(caseItem.assignee.id, caseItem.assignee.name);

  async function refresh() {
    await Promise.all([reloadCase(), history.reload()]);
  }

  async function runAction(action: string, body: unknown) {
    setBusy(true);
    setActionError(null);
    try {
      await postCaseAction(caseItem.id, action, body);
      await refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "That action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={base["dashboard-page"]}>
      <Link className={base["back-link"]} href="/dashboard/support-cases">
        Back to cases
      </Link>
      <div className={base["page-header"]}>
        <div>
          <p className={base.eyebrow}>
            {caseItem.type === SupportCaseType.COMPLAINT
              ? "Complaint"
              : "Support case"}{" "}
            #{caseItem.caseNumber}
          </p>
          <h1>{caseItem.subject}</h1>
          <p>
            {caseItem.customer.name} · {caseItem.customer.email}
          </p>
        </div>
      </div>

      {canEdit && !isClosed ? (
        <div className={styles["action-bar"]}>
          <button
            type="button"
            className={base["btn-toolbar-primary"]}
            onClick={() => setDialog("assign")}
          >
            {caseItem.assignee ? "Reassign" : "Assign"}
          </button>
          <button
            type="button"
            className={base["btn-toolbar-primary"]}
            onClick={() => setDialog("classify")}
          >
            Edit classification
          </button>
          {isOpen || isResolved ? (
            <button
              type="button"
              className={base["btn-toolbar-primary"]}
              disabled={busy}
              onClick={() =>
                void runAction("status", {
                  status:
                    status === SupportCaseStatus.IN_PROGRESS
                      ? SupportCaseStatus.WAITING_FOR_USER
                      : SupportCaseStatus.IN_PROGRESS,
                })
              }
            >
              {isResolved
                ? "Reopen"
                : status === SupportCaseStatus.IN_PROGRESS
                  ? "Mark waiting for user"
                  : "Mark in progress"}
            </button>
          ) : null}
          <button
            type="button"
            className={base["btn-toolbar-primary"]}
            onClick={() => setDialog("note")}
          >
            Add note
          </button>
          <button
            type="button"
            className={base["btn-toolbar-primary"]}
            onClick={() => setDialog("message")}
          >
            Email customer
          </button>
          {isOpen && status !== SupportCaseStatus.ESCALATED ? (
            <button
              type="button"
              className={base["btn-toolbar-primary"]}
              onClick={() => setDialog("escalate")}
            >
              Escalate
            </button>
          ) : null}
          {isOpen ? (
            <button
              type="button"
              className={base["btn-primary"]}
              onClick={() => setDialog("resolve")}
            >
              Resolve
            </button>
          ) : null}
          {isResolved ? (
            <button
              type="button"
              className={base["btn-primary"]}
              onClick={() => setConfirmClose(true)}
            >
              Close case
            </button>
          ) : null}
        </div>
      ) : null}
      {actionError ? (
        <div className={base["inline-error"]} role="alert">
          {actionError}
        </div>
      ) : null}

      <div className={styles["case-layout"]}>
        <div className={styles["case-column"]}>
          <article className={base.panel}>
            <div className={base["panel-heading"]}>
              <div>
                <h2>Case details</h2>
                <p>Opened {formatAdminDateTime(caseItem.createdAt, tz)}</p>
              </div>
            </div>
            <dl className={base["record-grid"]}>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={caseItem.status} />
                </dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>
                  <PriorityBadge priority={caseItem.priority} />
                </dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>
                  <TypeBadge type={caseItem.type} />
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{caseItem.category.label}</dd>
              </div>
              <div>
                <dt>Assignee</dt>
                <dd>{caseItem.assignee?.name ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt>Opened by</dt>
                <dd>{caseItem.createdBy?.name ?? "Unknown"}</dd>
              </div>
            </dl>
            <h3 className={styles["sub-heading"]}>Description</h3>
            <p className={styles["text-block"]}>{caseItem.description}</p>
            {caseItem.escalationReason ? (
              <>
                <h3 className={styles["sub-heading"]}>
                  Escalated {formatAdminDateTime(caseItem.escalatedAt, tz)}
                </h3>
                <p className={styles["text-block"]}>
                  {caseItem.escalationReason}
                </p>
              </>
            ) : null}
            {caseItem.resolution ? (
              <>
                <h3 className={styles["sub-heading"]}>
                  {formatEnum(isClosed ? "closed" : "resolved")}{" "}
                  {formatAdminDateTime(
                    caseItem.closedAt ?? caseItem.resolvedAt,
                    tz,
                  )}
                </h3>
                <p className={styles["text-block"]}>{caseItem.resolution}</p>
              </>
            ) : null}
          </article>

          {history.error && !history.data ? (
            <div className={base["inline-error"]} role="alert">
              {history.error}
            </div>
          ) : (
            <CaseHistory
              items={history.data?.items ?? []}
              staffNames={staffNames}
              timeZone={tz}
            />
          )}
        </div>

        <div className={styles["case-column"]}>
          {user.error && !user.data ? (
            <article className={base.panel}>
              <div className={base["panel-heading"]}>
                <div>
                  <h2>Customer context</h2>
                  <p>Could not be loaded</p>
                </div>
              </div>
              <div className={base["inline-error"]} role="alert">
                {user.error}
              </div>
              <button
                type="button"
                className={base["btn-toolbar-primary"]}
                onClick={() => void user.reload()}
              >
                Try again
              </button>
            </article>
          ) : user.data ? (
            <CustomerContext user={user.data} />
          ) : (
            <article className={base.panel}>
              <p className={styles.muted}>Loading customer context…</p>
            </article>
          )}
        </div>
      </div>

      <CaseDialog
        kind={dialog}
        caseItem={caseItem}
        onClose={() => setDialog(null)}
        onDone={() => {
          setDialog(null);
          void refresh();
        }}
      />
      <ConfirmModal
        open={confirmClose}
        title="Close this case?"
        message="A closed case is read-only. Notes, emails, and status changes are no longer allowed."
        confirmLabel="Close case"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          void runAction("close", {});
        }}
      />
    </main>
  );
}
