/**
 * Pure status rules for support cases, kept apart from the service so they can
 * be tested without a database. Assignment, escalation, resolution and closure
 * each have their own endpoint; this decides which of those a status allows.
 */
import {
  SupportCaseStatus,
  type SupportCaseStatusValue,
} from '@purposemint/contracts';

const S = SupportCaseStatus;

const OPEN_STATUSES: readonly SupportCaseStatusValue[] = [
  S.NEW,
  S.ASSIGNED,
  S.IN_PROGRESS,
  S.WAITING_FOR_USER,
  S.ESCALATED,
];

/** Targets of the generic status endpoint, per current status. */
const MANUAL_TRANSITIONS: Record<
  SupportCaseStatusValue,
  readonly SupportCaseStatusValue[]
> = {
  [S.NEW]: [S.IN_PROGRESS, S.WAITING_FOR_USER],
  [S.ASSIGNED]: [S.IN_PROGRESS, S.WAITING_FOR_USER],
  [S.IN_PROGRESS]: [S.WAITING_FOR_USER],
  [S.WAITING_FOR_USER]: [S.IN_PROGRESS],
  [S.ESCALATED]: [S.IN_PROGRESS, S.WAITING_FOR_USER],
  // Reopening a resolved case is the only way back from resolved.
  [S.RESOLVED]: [S.IN_PROGRESS],
  [S.CLOSED]: [],
};

export function isClosed(status: SupportCaseStatusValue): boolean {
  return status === S.CLOSED;
}

export function canChangeStatus(
  from: SupportCaseStatusValue,
  to: SupportCaseStatusValue,
): boolean {
  return MANUAL_TRANSITIONS[from].includes(to);
}

/** Escalate a case that is still being worked, and not one already escalated. */
export function canEscalate(status: SupportCaseStatusValue): boolean {
  return OPEN_STATUSES.includes(status) && status !== S.ESCALATED;
}

export function canResolve(status: SupportCaseStatusValue): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Closing is final, so a case must be resolved first. */
export function canClose(status: SupportCaseStatusValue): boolean {
  return status === S.RESOLVED;
}

/** Status after (un)assigning. Only untouched cases move on assignment. */
export function statusAfterAssignment(
  status: SupportCaseStatusValue,
  assigneeId: string | null,
): SupportCaseStatusValue {
  if (assigneeId && status === S.NEW) return S.ASSIGNED;
  if (!assigneeId && status === S.ASSIGNED) return S.NEW;
  return status;
}
