import type { ChatMessageStatusValue } from "@muakhah/contracts";
import styles from "@/app/dashboard/dashboard.module.css";

export const CHAT_MESSAGE_STATUS_TABS = [
  "pending",
  "approved",
  "rejected",
  "escalated",
] as const satisfies readonly ChatMessageStatusValue[];

export type ChatMessageStatusTab = (typeof CHAT_MESSAGE_STATUS_TABS)[number];

export function chatMessageStatusClass(status: ChatMessageStatusValue | string) {
  if (status === "approved") return styles["status-badge--approved"];
  if (status === "rejected") return styles["status-badge--rejected"];
  if (status === "edited") return styles["status-badge--edited"];
  if (status === "escalated") return styles["status-badge--escalated"];
  return styles["status-badge--pending"];
}
