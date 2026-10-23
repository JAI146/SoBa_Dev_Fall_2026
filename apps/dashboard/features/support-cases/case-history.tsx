"use client";

import type { SupportCaseHistoryItem } from "@purposemint/contracts";
import { formatAdminDateTime, formatEnum } from "@/lib/admin-format";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./support-cases.module.css";

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Turns an audit event into a one-line summary plus an optional text block. */
function describe(
  item: SupportCaseHistoryItem,
  staffName: (id: unknown) => string,
): { title: string; body: string | null } {
  const m = item.metadata ?? {};
  switch (item.action) {
    case "admin.support_case_created":
      return { title: "Case opened", body: str(m.subject) };
    case "admin.support_case_updated": {
      const changes = (m.changes ?? {}) as Record<
        string,
        { from: unknown; to: unknown }
      >;
      const parts = Object.entries(changes)
        .filter(([field]) => field !== "categoryId")
        .map(
          ([field, change]) =>
            `${formatEnum(field)}: ${formatEnum(String(change.from))} → ${formatEnum(String(change.to))}`,
        );
      if ("categoryId" in changes) parts.push("Category changed");
      return { title: "Case updated", body: parts.join("\n") || null };
    }
    case "admin.support_case_assigned":
      return {
        title: m.assigneeId
          ? `Assigned to ${staffName(m.assigneeId)}`
          : "Unassigned",
        body: null,
      };
    case "admin.support_case_status_changed":
      return {
        title: `Status: ${formatEnum(String(m.previousStatus))} → ${formatEnum(String(m.status))}`,
        body: null,
      };
    case "admin.support_case_note_added":
      return { title: "Internal note", body: str(m.body) };
    case "admin.support_case_escalated":
      return { title: "Escalated", body: str(m.reason) };
    case "admin.support_case_resolved":
      return { title: "Resolved", body: str(m.resolution) };
    case "admin.support_case_closed":
      return { title: "Closed", body: str(m.note) };
    case "admin.support_case_email_sent":
      return {
        title: `Email sent to customer: ${str(m.subject) ?? ""}`,
        body: str(m.body),
      };
    case "admin.support_case_email_failed":
      return {
        title: `Email could not be sent: ${str(m.subject) ?? ""}`,
        body: null,
      };
    default:
      return {
        title: formatEnum(item.action.replace(/^admin\./, "")),
        body: null,
      };
  }
}

export function CaseHistory({
  items,
  staffNames,
  timeZone,
}: {
  items: SupportCaseHistoryItem[];
  staffNames: Map<string, string>;
  timeZone: string | null;
}) {
  const staffName = (id: unknown) =>
    (typeof id === "string" ? staffNames.get(id) : undefined) ??
    "a staff member";
  return (
    <article className={base.panel}>
      <div className={base["panel-heading"]}>
        <div>
          <h2>History</h2>
          <p>Every change, note, and email on this case</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className={styles.muted}>No activity recorded yet.</p>
      ) : (
        <ol className={styles.timeline}>
          {items.map((item) => {
            const { title, body } = describe(item, staffName);
            return (
              <li key={item.id} className={styles["timeline-item"]}>
                <div className={styles["timeline-head"]}>
                  <strong>{title}</strong>
                  <span className={styles["timeline-meta"]}>
                    {item.actor?.name ?? "System"} ·{" "}
                    {formatAdminDateTime(item.createdAt, timeZone)}
                  </span>
                </div>
                {body ? (
                  <p className={styles["timeline-body"]}>{body}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
