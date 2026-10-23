"use client";

import { useState } from "react";
import type { AdminUserDetailResponse } from "@purposemint/contracts";
import { formatAdminDate, formatEnum } from "@/lib/admin-format";
import layout from "@/app/dashboard/dashboard.module.css";
import styles from "./user-progress.module.css";

type Habit = AdminUserDetailResponse["habits"][number];
const statuses = [
  "active",
  "completed",
  "missed",
  "paused",
  "recovering",
  "inactive",
] as const;

function periodLabel(count: number, unit: string | null) {
  const singular = unit === "weeks" ? "week" : "day";
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function UserBehaviorProgress({
  habits,
  timeZone,
}: {
  habits: Habit[];
  timeZone: string | null;
}) {
  const [filter, setFilter] = useState("all");
  const visible = habits.filter(
    (habit) => filter === "all" || habit.progress.status === filter,
  );
  return (
    <article className={layout.panel}>
      <div className={layout["panel-heading"]}>
        <div>
          <h2>Habit & behavioral progress</h2>
          <p>Completions, missed periods, pauses, recovery, and consistency</p>
        </div>
      </div>
      <div className={styles.counts} aria-label="Habit status counts">
        {statuses.map((status) => (
          <div key={status}>
            <span>{formatEnum(status)}</span>
            <strong>
              {
                habits.filter((habit) => habit.progress.status === status)
                  .length
              }
            </strong>
          </div>
        ))}
      </div>
      <div className={styles.toolbar}>
        <label htmlFor="habit-status-filter">Show habits</label>
        <select
          id="habit-status-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All habits</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {formatEnum(status)}
            </option>
          ))}
        </select>
      </div>
      <div className={layout["table-wrap"]}>
        <table className={`${layout["data-table"]} ${styles.habitTable}`}>
          <thead>
            <tr>
              <th>Habit</th>
              <th>Status</th>
              <th>Activity</th>
              <th>Current streak</th>
              <th>Consistency · 30 days</th>
              <th>Last completed</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((habit) => {
              const progress = habit.progress;
              return (
                <tr key={habit.id}>
                  <td>
                    <strong>{habit.title}</strong>
                    <span>
                      {formatEnum(habit.frequency)} ·{" "}
                      {formatEnum(habit.category)}
                    </span>
                    <span className={styles.caption}>
                      Created {formatAdminDate(habit.createdAt, timeZone)}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span
                      className={`${styles.badge} ${styles[progress.status]}`}
                    >
                      {formatEnum(progress.status)}
                    </span>
                  </td>
                  <td data-label="Activity">
                    {progress.completionCount}{" "}
                    {progress.completionCount === 1
                      ? "completion"
                      : "completions"}
                    <span className={styles.caption}>
                      {progress.missedPeriods === null
                        ? habit.frequency === "as_needed"
                          ? "No scheduled periods"
                          : "Missed periods unavailable"
                        : `${periodLabel(progress.missedPeriods, progress.streakUnit)} missed · 30 days`}
                    </span>
                  </td>
                  <td data-label="Current streak">
                    {progress.streak === null
                      ? "Not available"
                      : periodLabel(progress.streak, progress.streakUnit)}
                  </td>
                  <td data-label="Consistency · 30 days">
                    {progress.consistencyPercent === null ? (
                      "Not available"
                    ) : (
                      <div className={styles.consistency}>
                        <strong>{progress.consistencyPercent}%</strong>
                        <progress
                          max={100}
                          value={progress.consistencyPercent}
                          aria-label={`Consistency for ${habit.title}`}
                        />
                        <span className={styles.caption}>
                          {progress.completedPeriods} of{" "}
                          {progress.eligiblePeriods} elapsed periods
                        </span>
                      </div>
                    )}
                  </td>
                  <td data-label="Last completed">
                    {progress.lastCompletedOn
                      ? formatAdminDate(
                          `${progress.lastCompletedOn}T12:00:00Z`,
                          "UTC",
                        )
                      : "Never"}
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={6} className={layout.empty}>
                  {habits.length
                    ? "No habits match this filter."
                    : "No habits recorded."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <details className={styles.rules}>
        <summary>How these figures are calculated</summary>
        <p>
          Daily habits require one completion per day; weekly habits require one
          per Monday–Sunday week, in the customer’s timezone. The current
          unfinished period is never counted as missed. Consistency counts
          elapsed periods within the last 30 calendar days, excluding recorded
          pauses.
        </p>
        <p>
          Recovering means the customer completed the current period after
          missing their previous eligible period. As-needed habits have
          completion records but no scheduled missed periods or streak. Each
          habit appears in exactly one status count. Recovering habits have
          completed their current period but are shown separately from
          Completed.
        </p>
        {habits.some((habit) => habit.progress.historyLimited) && (
          <p>
            Older habits may lack past pause or selection history. Their figures
            assume the initial recorded selection remained in effect until a
            recorded change. Inactive habits without selection history do not
            receive an estimated missed count or consistency score.
          </p>
        )}
      </details>
    </article>
  );
}
