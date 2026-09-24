import type { AdminUserDetailResponse } from "@purposemint/contracts";
import { formatMoney } from "@/lib/admin-format";

type Goal = AdminUserDetailResponse["goals"][number];

export function GoalStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
        isActive
          ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]"
          : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function GoalProgress({ goal }: { goal: Goal }) {
  if (goal.targetAmount <= 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Progress unavailable: no positive target.
      </p>
    );
  }
  return (
    <div className="min-w-32 space-y-2">
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {goal.progressPercent}% of target
      </p>
      <div
        role="progressbar"
        aria-label={`Savings progress for ${goal.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={goal.progressPercent}
        aria-valuetext={`${goal.progressPercent}% — ${formatMoney(goal.savedAmount)} saved toward ${formatMoney(goal.targetAmount)}`}
        className="h-3 overflow-hidden rounded-full bg-[var(--border)]"
      >
        <div
          className="h-full rounded-full bg-[var(--success-text)]"
          style={{ width: `${goal.progressPercent}%` }}
        />
      </div>
    </div>
  );
}

export function UserGoalSummary({ goals }: { goals: Goal[] }) {
  const goal = goals.find((item) => item.isFocus && item.isActive);
  return (
    <section
      aria-labelledby="current-goal-heading"
      className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--foreground)]"
    >
      <h2 id="current-goal-heading" className="text-xl font-semibold">
        Current goal
      </h2>
      {goal ? (
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-[var(--muted)]">Focus goal</p>
              <h3 className="break-words text-2xl font-semibold">
                {goal.title}
              </h3>
            </div>
            <GoalStatusBadge isActive={goal.isActive} />
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-[var(--muted)]">Saved</dt>
              <dd className="break-words text-xl font-semibold">
                {formatMoney(goal.savedAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted)]">Goal target</dt>
              <dd className="break-words text-xl font-semibold">
                {formatMoney(goal.targetAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted)]">Remaining</dt>
              <dd className="break-words text-xl font-semibold">
                {formatMoney(goal.remainingAmount)}
              </dd>
            </div>
          </dl>
          <GoalProgress goal={goal} />
        </div>
      ) : (
        <p className="mt-3 text-[var(--muted)]">
          {goals.length === 0
            ? "No goals recorded for this user yet."
            : "No active focus goal selected. All recorded goals are listed below."}
        </p>
      )}
    </section>
  );
}
