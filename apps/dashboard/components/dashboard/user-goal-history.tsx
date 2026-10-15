"use client";

import { useState } from "react";
import type {
  AdminUserDetailResponse,
  GoalHistoryState,
} from "@purposemint/contracts";
import { formatAdminDateTime, formatMoney } from "@/lib/admin-format";
import layout from "@/app/dashboard/dashboard.module.css";
import styles from "./user-progress.module.css";

const fields: { key: keyof GoalHistoryState; label: string }[] = [
  { key: "title", label: "Goal" },
  { key: "targetAmount", label: "Target" },
  { key: "savedAmount", label: "Saved" },
  { key: "isActive", label: "Status" },
  { key: "isFocus", label: "Focus goal" },
];
function value(state: GoalHistoryState, key: keyof GoalHistoryState) {
  if (key === "targetAmount" || key === "savedAmount")
    return formatMoney(state[key]);
  if (key === "isActive") return state[key] ? "Active" : "Inactive";
  if (key === "isFocus") return state[key] ? "Yes" : "No";
  return state[key];
}

export function UserGoalHistory({ user }: { user: AdminUserDetailResponse }) {
  const [goalId, setGoalId] = useState("all");
  const entries = user.goalHistory.filter(
    (entry) => goalId === "all" || entry.goalId === goalId,
  );
  return (
    <article className={layout.panel}>
      <div className={layout["panel-heading"]}>
        <div>
          <h2>Goal modification history</h2>
          <p>Recorded changes to goals and savings progress</p>
        </div>
      </div>
      <div className={styles.toolbar}>
        <label htmlFor="goal-history-filter">Show changes</label>
        <select
          id="goal-history-filter"
          value={goalId}
          onChange={(event) => setGoalId(event.target.value)}
        >
          <option value="all">All goals</option>
          {user.goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </div>
      {!entries.length ? (
        <p className={styles.note}>
          No changes recorded{goalId === "all" ? " yet" : " for this goal"}.
          Changes made before history tracking began are unavailable.
        </p>
      ) : (
        <ol className={styles.history}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className={styles.historyHeading}>
                <strong>{entry.current.title}</strong>
                <time dateTime={entry.occurredAt}>
                  {formatAdminDateTime(entry.occurredAt, user.timeZone)}
                </time>
              </div>
              <p className={styles.caption}>
                {entry.source === "demo"
                  ? "Development sample"
                  : "Customer action"}{" "}
                · {entry.previous ? "Updated" : "Created"}
              </p>
              <dl className={styles.changes}>
                {fields
                  .filter(
                    ({ key }) =>
                      !entry.previous ||
                      entry.previous[key] !== entry.current[key],
                  )
                  .map(({ key, label }) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>
                        {entry.previous ? (
                          <>
                            <span>{value(entry.previous, key)}</span>
                            <span aria-label="changed to"> → </span>
                          </>
                        ) : null}
                        <strong>{value(entry.current, key)}</strong>
                      </dd>
                    </div>
                  ))}
              </dl>
            </li>
          ))}
        </ol>
      )}
      {user.goalHistoryTruncated && (
        <p className={styles.note}>
          Showing the latest 100 recorded changes across this customer’s goals.
        </p>
      )}
    </article>
  );
}
