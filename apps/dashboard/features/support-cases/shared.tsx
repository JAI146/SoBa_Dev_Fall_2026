"use client";

/**
 * Labels, badges, and the small request helper shared by the case list and
 * case detail screens.
 */
import {
  SupportCasePriority,
  SupportCaseStatus,
  SupportCaseType,
  adminStaffResponseSchema,
  supportCaseDetailSchema,
  type SupportCaseDetail,
  type SupportCasePriorityValue,
  type SupportCaseStatusValue,
  type SupportCaseTypeValue,
} from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatEnum } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./support-cases.module.css";

export const STAFF_PATH = "/admin/staff?pageSize=100";

export const PRIORITY_RANK: Record<SupportCasePriorityValue, number> = {
  [SupportCasePriority.LOW]: 0,
  [SupportCasePriority.NORMAL]: 1,
  [SupportCasePriority.HIGH]: 2,
  [SupportCasePriority.URGENT]: 3,
};

const TONE = {
  info: base["badge-invited"] ?? "",
  good: base["badge-active"] ?? "",
  neutral: base["badge-inactive"] ?? "",
  danger: styles["badge-danger"] ?? "",
};

const STATUS_TONE: Record<SupportCaseStatusValue, string> = {
  [SupportCaseStatus.NEW]: TONE.info,
  [SupportCaseStatus.ASSIGNED]: TONE.info,
  [SupportCaseStatus.IN_PROGRESS]: TONE.good,
  [SupportCaseStatus.WAITING_FOR_USER]: TONE.neutral,
  [SupportCaseStatus.ESCALATED]: TONE.danger,
  [SupportCaseStatus.RESOLVED]: TONE.good,
  [SupportCaseStatus.CLOSED]: TONE.neutral,
};

const PRIORITY_TONE: Record<SupportCasePriorityValue, string> = {
  [SupportCasePriority.LOW]: TONE.neutral,
  [SupportCasePriority.NORMAL]: TONE.neutral,
  [SupportCasePriority.HIGH]: TONE.info,
  [SupportCasePriority.URGENT]: TONE.danger,
};

export function StatusBadge({ status }: { status: SupportCaseStatusValue }) {
  return (
    <span className={`${base.badge} ${STATUS_TONE[status]}`}>
      {formatEnum(status)}
    </span>
  );
}

export function PriorityBadge({
  priority,
}: {
  priority: SupportCasePriorityValue;
}) {
  return (
    <span className={`${base.badge} ${PRIORITY_TONE[priority]}`}>
      {formatEnum(priority)}
    </span>
  );
}

export function TypeBadge({ type }: { type: SupportCaseTypeValue }) {
  return (
    <span
      className={`${base.badge} ${type === SupportCaseType.COMPLAINT ? TONE.danger : TONE.neutral}`}
    >
      {formatEnum(type)}
    </span>
  );
}

/** Active staff for assignee pickers. Reuses the staff list endpoint. */
export function useStaffOptions() {
  const query = useAdminQuery(STAFF_PATH, adminStaffResponseSchema);
  const staff = (query.data?.items ?? [])
    .filter((member) => member.status === "active")
    .map((member) => ({
      id: member.id,
      name: `${member.firstName} ${member.lastName}`.trim(),
    }));
  return { staff, error: query.error };
}

/** POST to a case action endpoint and return the updated case. */
export function postCaseAction(
  caseId: string,
  action: string,
  body: unknown,
): Promise<SupportCaseDetail> {
  return apiRequest(
    `/admin/support-cases/${caseId}/${action}`,
    { method: "POST", body: JSON.stringify(body) },
    getToken(),
    supportCaseDetailSchema,
  );
}
