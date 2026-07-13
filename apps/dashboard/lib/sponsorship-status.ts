import type { SponsorshipListItem } from "@muakhah/contracts";
import styles from "@/app/dashboard/dashboard.module.css";

export const SPONSORSHIP_CORE_STATUSES = [
  "requested",
  "active",
  "paused",
  "completed",
  "cancelled",
  "disputed",
] as const;

export type SponsorshipStatusTarget = (typeof SPONSORSHIP_CORE_STATUSES)[number];

export const SPONSORSHIP_STATUS_FILTER_OPTIONS = [
  "requested",
  "need_clarification",
  ...SPONSORSHIP_CORE_STATUSES.filter((status) => status !== "requested"),
  "stopped",
] as const;

export function normalizeSponsorshipStatus(status: string): SponsorshipStatusTarget | null {
  if (status === "stopped") return "completed";
  if (SPONSORSHIP_CORE_STATUSES.includes(status as SponsorshipStatusTarget)) {
    return status as SponsorshipStatusTarget;
  }
  return null;
}

export function sponsorshipStatusKey(
  item: Pick<SponsorshipListItem, "status" | "needsClarification">,
): string {
  if (item.status === "requested" && item.needsClarification) {
    return "need_clarification";
  }
  return item.status;
}

export function sponsorshipStatusClass(status: string) {
  if (status === "active" || status === "approved") {
    return styles["status-badge--approved"];
  }
  if (status === "cancelled" || status === "rejected") {
    return styles["status-badge--rejected"];
  }
  if (status === "stopped") return styles["status-badge--stopped"];
  if (status === "paused") return styles["status-badge--paused"];
  if (status === "completed") return styles["status-badge--completed"];
  if (status === "disputed") return styles["status-badge--disputed"];
  if (status === "need_clarification") return styles["status-badge--clarification"];
  return styles["status-badge--pending"];
}

export function canReviewSponsorship(status: string) {
  return status === "requested";
}

export function canPauseSponsorship(status: string) {
  return status === "active";
}

export function canResumeSponsorship(status: string) {
  return status === "paused";
}

export function canCompleteSponsorship(status: string) {
  return status === "active" || status === "paused";
}

export function canCancelSponsorship(status: string) {
  return (
    status === "requested" || status === "active" || status === "paused"
  );
}

export function canDisputeSponsorship(status: string) {
  return status === "active" || status === "paused";
}

/** @deprecated Use canCompleteSponsorship */
export function canStopSponsorship(status: string) {
  return canCompleteSponsorship(status);
}

export function canChatSponsorship(status: string) {
  return status === "active";
}

export function needsSponsorshipClarification(
  item: Pick<SponsorshipListItem, "status" | "needsClarification">,
) {
  return item.status === "requested" && item.needsClarification;
}

export function getSponsorshipStatusTargets(
  currentStatus: string,
  role: "admin" | "donor",
): SponsorshipStatusTarget[] {
  const normalized = normalizeSponsorshipStatus(currentStatus);
  if (!normalized) return [];

  const allExceptCurrent = SPONSORSHIP_CORE_STATUSES.filter(
    (status) => status !== normalized,
  );

  if (role === "admin") {
    return [...allExceptCurrent];
  }

  switch (normalized) {
    case "requested":
      return ["cancelled"];
    case "active":
      return ["paused", "completed", "cancelled", "disputed"];
    case "paused":
      return ["completed", "cancelled", "disputed"];
    default:
      return [];
  }
}

export function statusTargetToLifecycleAction(
  currentStatus: string,
  target: SponsorshipStatusTarget,
): "approve" | "pause" | "resume" | "complete" | "cancel" | "dispute" | null {
  const normalized = normalizeSponsorshipStatus(currentStatus);
  if (!normalized || normalized === target) return null;

  if (normalized === "requested" && target === "active") return "approve";
  if (normalized === "paused" && target === "active") return "resume";
  if (target === "paused") return "pause";
  if (target === "completed") return "complete";
  if (target === "cancelled") return "cancel";
  if (target === "disputed") return "dispute";
  if (target === "requested") return null;
  return null;
}

export function canDonorSetStatusTarget(
  currentStatus: string,
  target: SponsorshipStatusTarget,
): boolean {
  return getSponsorshipStatusTargets(currentStatus, "donor").includes(target);
}
