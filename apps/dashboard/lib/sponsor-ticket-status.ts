import styles from "@/app/dashboard/dashboard.module.css";
import type { SponsorTicketStatusValue } from "@muakhah/contracts";

export const SPONSOR_TICKET_STATUS_OPTIONS = [
  "open",
  "in_progress",
  "resolved",
] as const satisfies readonly SponsorTicketStatusValue[];

export function sponsorTicketStatusClass(status: SponsorTicketStatusValue) {
  switch (status) {
    case "open":
      return styles["status-badge--pending"];
    case "in_progress":
      return styles["status-badge--clarification"];
    case "resolved":
      return styles["status-badge--approved"];
    default:
      return "";
  }
}
