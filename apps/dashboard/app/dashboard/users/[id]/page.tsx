"use client";

import { adminUserDetailResponseSchema } from "@purposemint/contracts";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import {
  formatAdminDate,
  formatAdminDateTime,
  formatEnum,
  formatMoney,
  formatTier,
} from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../../dashboard.module.css";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useAdminQuery(
    `/admin/users/${id}`,
    adminUserDetailResponseSchema,
  );
  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading user details…" />;
  const user = query.data;

  return (
    <main className={styles["dashboard-page"]}>
      <Link className={styles["back-link"]} href="/dashboard/users">
        Back to users
      </Link>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Customer account</p>
          <h1>{user.displayName ?? `${user.firstName} ${user.lastName}`}</h1>
          <p>{user.email}</p>
        </div>
      </div>

      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="User activity counts"
      >
        <DashboardStatCard
          label="Goals"
          value={user.activityCounts.goals}
          icon="goals"
        />
        <DashboardStatCard
          label="Habits"
          value={user.activityCounts.habits}
          icon="habits"
        />
        <DashboardStatCard
          label="Pathway applications"
          value={user.activityCounts.pathwayApplications}
          icon="accounts"
        />
        <DashboardStatCard
          label="Reflection entries · count only"
          value={user.activityCounts.reflections}
          icon="users"
        />
      </section>

      <section className={styles["overview-grid"]}>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Account details</h2>
              <p>Identity and account status</p>
            </div>
          </div>
          <dl className={styles["record-grid"]}>
            <div>
              <dt>Full name</dt>
              <dd>
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div>
              <dt>Display name</dt>
              <dd>{user.displayName ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Membership</dt>
              <dd>{formatTier(user.tier)}</dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>{formatEnum(user.status)}</dd>
            </div>
            <div>
              <dt>Onboarding status</dt>
              <dd>{formatEnum(user.onboardingStatus)}</dd>
            </div>
            <div>
              <dt>Purpose</dt>
              <dd>
                {user.values.length ? (
                  <span className={styles["badge-list"]}>
                    {user.values.map((value) => (
                      <span key={value.key} className={styles.badge}>
                        {value.label}
                      </span>
                    ))}
                  </span>
                ) : (
                  "Not selected"
                )}
              </dd>
            </div>
            <div>
              <dt>Email verification</dt>
              <dd>
                {user.emailVerifiedAt
                  ? `Verified ${formatAdminDate(user.emailVerifiedAt, user.timeZone)}`
                  : "Not verified"}
              </dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{user.timeZone ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>
                {[user.city, user.state, user.country]
                  .filter(Boolean)
                  .join(", ") || "Not set"}
              </dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatAdminDateTime(user.createdAt, user.timeZone)}</dd>
            </div>
            <div>
              <dt>Last login</dt>
              <dd>{formatAdminDateTime(user.lastLoginAt, user.timeZone)}</dd>
            </div>
          </dl>
        </article>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Activity summary</h2>
              <p>Counts only; reflection content is not available here</p>
            </div>
          </div>
          <dl className={styles["record-grid"]}>
            <div>
              <dt>Active goals</dt>
              <dd>{user.activityCounts.activeGoals}</dd>
            </div>
            <div>
              <dt>Active habits</dt>
              <dd>{user.activityCounts.activeHabits}</dd>
            </div>
            <div>
              <dt>Habit completions</dt>
              <dd>{user.activityCounts.habitCompletions}</dd>
            </div>
            <div>
              <dt>Savings entries</dt>
              <dd>{user.activityCounts.savingsEntries}</dd>
            </div>
            <div>
              <dt>Submitted pathway applications</dt>
              <dd>{user.activityCounts.submittedPathwayApplications}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className={styles["stacked-panels"]}>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Goals</h2>
              <p>Current and historical goals</p>
            </div>
          </div>
          <div className={styles["table-wrap"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Saved</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Created</th>
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
                          : goal.isPathwayEligible
                            ? "Pathway eligible"
                            : "Standard goal"}
                      </span>
                    </td>
                    <td>{formatMoney(goal.savedAmount)}</td>
                    <td>{formatMoney(goal.targetAmount)}</td>
                    <td>{goal.isActive ? "Active" : "Inactive"}</td>
                    <td>{formatAdminDate(goal.createdAt, user.timeZone)}</td>
                  </tr>
                ))}
                {user.goals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      No goals recorded.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Habits</h2>
              <p>Selected habit templates</p>
            </div>
          </div>
          <div className={styles["table-wrap"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>Habit</th>
                  <th>Frequency</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {user.habits.map((habit) => (
                  <tr key={habit.id}>
                    <td>
                      <strong>{habit.title}</strong>
                    </td>
                    <td>{formatEnum(habit.frequency)}</td>
                    <td>{formatEnum(habit.category)}</td>
                    <td>{habit.isActive ? "Active" : "Inactive"}</td>
                    <td>{formatAdminDate(habit.createdAt, user.timeZone)}</td>
                  </tr>
                ))}
                {user.habits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      No habits recorded.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Pathway applications</h2>
              <p>Submissions and coordinator review status</p>
            </div>
          </div>
          <div className={styles["table-wrap"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>Pathway</th>
                  <th>Self-attested savings</th>
                  <th>Checklist</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {user.pathwayApplications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <strong>{application.pathway.title}</strong>
                    </td>
                    <td>
                      {formatMoney(application.attestedAmount)}
                      <span>{formatEnum(application.verificationMethod)}</span>
                    </td>
                    <td>
                      {application.checklistProgress.completed} of{" "}
                      {application.checklistProgress.total} complete
                    </td>
                    <td>
                      <span className={styles.badge}>
                        {formatEnum(application.status)}
                      </span>
                    </td>
                    <td>
                      {formatAdminDateTime(
                        application.submittedAt,
                        user.timeZone,
                      )}
                    </td>
                  </tr>
                ))}
                {user.pathwayApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      No pathway applications recorded.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
