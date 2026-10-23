"use client";

/**
 * Single read-only view of the customer behind a case, in the order
 * Account → Purpose → Goal → Habit → Savings → Level → Subscription → Pathway.
 * Built from the existing admin user detail response; nothing here is edited.
 */
import Link from "next/link";
import type { AdminUserDetailResponse } from "@purposemint/contracts";
import {
  formatAdminDate,
  formatAdminDateTime,
  formatEnum,
  formatMoney,
  formatTier,
  statusBadgeClass,
} from "@/lib/admin-format";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./support-cases.module.css";

const SAVINGS_ENTRY_LIMIT = 10;

export function CustomerContext({ user }: { user: AdminUserDetailResponse }) {
  const tz = user.timeZone;
  const savingsEntries = user.goals
    .flatMap((goal) =>
      goal.entries.map((entry) => ({ ...entry, goalTitle: goal.title })),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const totalSaved = user.goals.reduce(
    (sum, goal) => sum + goal.savedAmount,
    0,
  );

  return (
    <article className={base.panel}>
      <div className={base["panel-heading"]}>
        <div>
          <h2>Customer context</h2>
          <p>
            Read-only.{" "}
            <Link
              className={base["inline-link"]}
              href={`/dashboard/users/${user.id}`}
            >
              Open full profile
            </Link>
          </p>
        </div>
      </div>

      <h3 className={styles["sub-heading"]}>Account</h3>
      <dl className={base["record-grid"]}>
        <div>
          <dt>Name</dt>
          <dd>
            {user.firstName} {user.lastName}
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Account status</dt>
          <dd>
            <span
              className={`${base.badge} ${base[statusBadgeClass(user.status)]}`}
            >
              {formatEnum(user.status)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Onboarding</dt>
          <dd>{formatEnum(user.onboardingStatus)}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{formatAdminDate(user.createdAt, tz)}</dd>
        </div>
        <div>
          <dt>Last seen in app</dt>
          <dd>{formatAdminDateTime(user.lastSeenAt, tz)}</dd>
        </div>
      </dl>

      <h3 className={styles["sub-heading"]}>Purpose</h3>
      {user.values.length ? (
        <span className={base["badge-list"]}>
          {user.values.map((value) => (
            <span key={value.key} className={base.badge}>
              {value.label}
            </span>
          ))}
        </span>
      ) : (
        <p className={styles.muted}>No purpose values selected.</p>
      )}

      <h3 className={styles["sub-heading"]}>Goals</h3>
      {user.goals.length ? (
        <div className={base["table-wrap"]}>
          <table className={base["data-table"]}>
            <thead>
              <tr>
                <th>Goal</th>
                <th>Saved</th>
                <th>Target</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {user.goals.map((goal) => (
                <tr key={goal.id}>
                  <td>
                    <strong>{goal.title}</strong>
                    <span>
                      {goal.isFocus
                        ? "Focus goal"
                        : goal.isActive
                          ? "Active"
                          : "Inactive"}
                    </span>
                  </td>
                  <td>{formatMoney(goal.savedAmount)}</td>
                  <td>{formatMoney(goal.targetAmount)}</td>
                  <td>{goal.progressPercent.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.muted}>No goals yet.</p>
      )}

      <h3 className={styles["sub-heading"]}>Habits</h3>
      {user.habits.length ? (
        <div className={base["table-wrap"]}>
          <table className={base["data-table"]}>
            <thead>
              <tr>
                <th>Habit</th>
                <th>Frequency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {user.habits.map((habit) => (
                <tr key={habit.id}>
                  <td>
                    <strong>{habit.title}</strong>
                    <span>{formatEnum(habit.category)}</span>
                  </td>
                  <td>{formatEnum(habit.frequency)}</td>
                  <td>{habit.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.muted}>No habits yet.</p>
      )}

      <h3 className={styles["sub-heading"]}>Savings</h3>
      <p className={styles.muted}>
        {formatMoney(totalSaved)} saved across{" "}
        {user.activityCounts.savingsEntries.toLocaleString()} entries. Manually
        recorded, not verified bank balances.
      </p>
      {savingsEntries.length ? (
        <div className={base["table-wrap"]}>
          <table className={base["data-table"]}>
            <thead>
              <tr>
                <th>Goal</th>
                <th>Amount</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {savingsEntries.slice(0, SAVINGS_ENTRY_LIMIT).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.goalTitle}</td>
                  <td>{formatMoney(entry.amount)}</td>
                  <td>{formatAdminDate(entry.createdAt, tz)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h3 className={styles["sub-heading"]}>Level</h3>
      <dl className={base["record-grid"]}>
        <div>
          <dt>Current level</dt>
          <dd>
            {user.currentLevel === null
              ? "Not assigned"
              : `Level ${user.currentLevel}`}
          </dd>
        </div>
      </dl>

      <h3 className={styles["sub-heading"]}>Subscription</h3>
      <dl className={base["record-grid"]}>
        <div>
          <dt>Membership</dt>
          <dd>{formatTier(user.tier)}</dd>
        </div>
      </dl>

      <h3 className={styles["sub-heading"]}>Pathway</h3>
      {user.pathwayApplications.length ? (
        <div className={base["table-wrap"]}>
          <table className={base["data-table"]}>
            <thead>
              <tr>
                <th>Pathway</th>
                <th>Status</th>
                <th>Checklist</th>
              </tr>
            </thead>
            <tbody>
              {user.pathwayApplications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <Link
                      className={base["table-link"]}
                      href={`/dashboard/pathway-applications/${application.id}`}
                    >
                      {application.pathway.title}
                    </Link>
                  </td>
                  <td>{formatEnum(application.status)}</td>
                  <td>
                    {application.checklistProgress.completed} of{" "}
                    {application.checklistProgress.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.muted}>No pathway applications.</p>
      )}
    </article>
  );
}
