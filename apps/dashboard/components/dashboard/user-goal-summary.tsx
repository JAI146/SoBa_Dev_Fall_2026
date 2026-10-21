import type { AdminUserDetailResponse } from "@purposemint/contracts";
import styles from "./user-goal-summary.module.css";
import { formatMoney } from "@/lib/admin-format";

type Goal = AdminUserDetailResponse["goals"][number];

export function GoalStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`${styles.badge} ${isActive ? styles.active : styles.inactive}`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function GoalProgress({ goal }: { goal: Goal }) {
  if (goal.targetAmount <= 0) {
    return (
      <p className={styles.muted}>Progress unavailable: no positive target.</p>
    );
  }
  return (
    <div className={styles.progress}>
      <p className={styles.progressLabel}>{goal.progressPercent}% of target</p>
      <div
        role="progressbar"
        aria-label={`Savings progress for ${goal.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={goal.progressPercent}
        aria-valuetext={`${goal.progressPercent}% — ${formatMoney(goal.savedAmount)} saved toward ${formatMoney(goal.targetAmount)}`}
        className={styles.track}
      >
        <div
          className={styles.fill}
          style={{ width: `${goal.progressPercent}%` }}
        />
      </div>
    </div>
  );
}

export function UserGoalSummary({ goals }: { goals: Goal[] }) {
  const goal = goals.find((item) => item.isFocus && item.isActive);
  return (
    <section aria-labelledby="current-goal-heading" className={styles.card}>
      <h2 id="current-goal-heading" className={styles.heading}>
        Current goal
      </h2>
      {goal ? (
        <div className={styles.content}>
          <div className={styles.goalHeading}>
            <div className={styles.titleGroup}>
              <p className={styles.muted}>Focus goal</p>
              <h3 className={styles.title}>{goal.title}</h3>
            </div>
            <GoalStatusBadge isActive={goal.isActive} />
          </div>
          <dl className={styles.amounts}>
            <div>
              <dt className={styles.muted}>Saved</dt>
              <dd className={styles.amount}>{formatMoney(goal.savedAmount)}</dd>
            </div>
            <div>
              <dt className={styles.muted}>Goal target</dt>
              <dd className={styles.amount}>
                {formatMoney(goal.targetAmount)}
              </dd>
            </div>
            <div>
              <dt className={styles.muted}>Remaining</dt>
              <dd className={styles.amount}>
                {formatMoney(goal.remainingAmount)}
              </dd>
            </div>
          </dl>
          <GoalProgress goal={goal} />
        </div>
      ) : (
        <p className={styles.empty}>
          {goals.length === 0
            ? "No goals recorded for this user yet."
            : "No active focus goal selected. All recorded goals are listed below."}
        </p>
      )}
    </section>
  );
}
