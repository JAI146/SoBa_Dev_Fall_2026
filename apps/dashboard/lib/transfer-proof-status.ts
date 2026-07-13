import styles from "@/app/dashboard/dashboard.module.css";
import type { TransferProofStatusValue } from "@muakhah/contracts";

export const TRANSFER_PROOF_ADMIN_STATUS_OPTIONS = [
  "pending",
  "accepted",
  "rejected",
  "clarification",
  "disputed",
] as const satisfies readonly TransferProofStatusValue[];

export function transferProofStatusClass(status: TransferProofStatusValue) {
  switch (status) {
    case "pending":
      return styles["status-badge--pending"];
    case "accepted":
      return styles["status-badge--approved"];
    case "rejected":
      return styles["status-badge--rejected"];
    case "clarification":
      return styles["status-badge--clarification"];
    case "disputed":
      return styles["status-badge--disputed"];
    default:
      return "";
  }
}

export const TRANSFER_PROOF_STATUS_FILTER_OPTIONS = [
  "",
  ...TRANSFER_PROOF_ADMIN_STATUS_OPTIONS,
] as const;
