"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  AdminUserDetailResponse,
  SavingsConsistency,
} from "@purposemint/contracts";
import { formatMoney } from "@/lib/admin-format";
import layout from "@/app/dashboard/dashboard.module.css";
import styles from "./user-savings-progress.module.css";

function Rating({
  percent,
  rating,
}: {
  percent: number | null;
  rating: SavingsConsistency["rating"];
}) {
  return (
    <span className={`${styles.badge} ${styles[rating]}`}>
      {percent === null
        ? "No elapsed periods"
        : `${rating === "green" ? "Green · Consistent" : rating === "yellow" ? "Yellow · Some gaps" : "Red · Frequent gaps"} · ${percent}%`}
    </span>
  );
}
function dateLabel(day: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
function Chart({
  data,
  cumulative,
}: {
  data: SavingsConsistency;
  cumulative: boolean;
}) {
  const id = useId();
  const periods = data.periods;
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(260, Math.round(entry.contentRect.width)));
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const height = 250,
    left = 65,
    right = 20,
    top = 18,
    bottom = 48;
  const max = Math.max(
    1,
    ...periods.map((p) => (cumulative ? p.cumulativeRecorded : p.amount)),
  );
  const x = (i: number) =>
    left + ((i + 0.5) * (width - left - right)) / Math.max(1, periods.length);
  const y = (amount: number) =>
    height - bottom - (amount / max) * (height - top - bottom);
  const points = periods
    .map((p, i) => `${x(i)},${y(cumulative ? p.cumulativeRecorded : p.amount)}`)
    .join(" ");
  return (
    <div className={styles.chart} ref={container}>
      <h3>
        {cumulative ? "Recorded savings over time" : "Contributions by period"}
      </h3>
      {!periods.length ? (
        <p>No savings periods available yet.</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
        >
          <title id={`${id}-title`}>
            {cumulative
              ? "Cumulative recorded contributions"
              : "Recorded contributions per period"}
          </title>
          <desc id={`${id}-desc`}>
            Amounts and contribution gaps are listed in the accessible period
            table below. The current period is unfinished.
          </desc>
          {[0, 0.5, 1].map((r) => (
            <g key={r}>
              <line
                x1={left}
                x2={width - right}
                y1={y(max * r)}
                y2={y(max * r)}
                className={styles.gridLine}
              />
              <text
                x={left - 8}
                y={y(max * r) + 4}
                textAnchor="end"
                className={styles.axis}
              >
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(max * r)}
              </text>
            </g>
          ))}
          {cumulative && <polyline points={points} className={styles.line} />}
          {periods.map((p, i) => (
            <g key={p.start}>
              {cumulative ? (
                <circle
                  cx={x(i)}
                  cy={y(p.cumulativeRecorded)}
                  r={4}
                  className={styles.dot}
                >
                  <title>{`${dateLabel(p.start)}: ${formatMoney(p.cumulativeRecorded)} cumulative recorded`}</title>
                </circle>
              ) : (
                <rect
                  x={
                    x(i) -
                    Math.min(
                      17,
                      ((width - left - right) / periods.length) * 0.3,
                    )
                  }
                  y={y(p.amount) - (p.amount === 0 ? 3 : 0)}
                  width={Math.min(
                    34,
                    ((width - left - right) / periods.length) * 0.6,
                  )}
                  height={Math.max(3, height - bottom - y(p.amount))}
                  rx={3}
                  className={styles[p.status]}
                >
                  <title>{`${dateLabel(p.start)}: ${formatMoney(p.amount)} · ${p.status.replace("_", " ")}`}</title>
                </rect>
              )}
              {(i % Math.ceil(periods.length / (width < 450 ? 3 : 6)) === 0 ||
                i === periods.length - 1) && (
                <text
                  x={x(i)}
                  y={height - 17}
                  textAnchor="middle"
                  className={styles.axis}
                >
                  {dateLabel(p.start)}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function UserSavingsProgress({
  user,
}: {
  user: AdminUserDetailResponse;
}) {
  const initial =
    user.goals.find((g) => g.isFocus && g.isActive)?.id ??
    user.goals[0]?.id ??
    "";
  const [goalId, setGoalId] = useState(initial);
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const goal = user.goals.find((g) => g.id === goalId);
  const progress = user.savingsProgress.find((p) => p.goalId === goalId);
  const data = progress?.[frequency];
  const overall = user.overallProgress;
  return (
    <article className={`${layout.panel} ${styles.panel}`}>
      <div className={layout["panel-heading"]}>
        <div>
          <h2>Overall progress & savings consistency</h2>
          <p>
            Summary across all active goals; use the selector below to review
            one goal.
          </p>
        </div>
      </div>
      <div className={styles.metrics}>
        <div>
          <span>All active goals · progress</span>
          <strong>
            {overall.goalProgressPercent === null
              ? "—"
              : `${overall.goalProgressPercent}%`}
          </strong>
          <small>
            {formatMoney(overall.activeSavedAmount)} of{" "}
            {formatMoney(overall.activeTargetAmount)}
          </small>
        </div>
        <div>
          <span>All active goals · weekly consistency</span>
          <strong>
            {overall.weeklySavingsPercent === null
              ? "—"
              : `${overall.weeklySavingsPercent}%`}
          </strong>
          <Rating
            percent={overall.weeklySavingsPercent}
            rating={overall.weeklySavingsRating}
          />
        </div>
        <div>
          <span>All active goals · monthly consistency</span>
          <strong>
            {overall.monthlySavingsPercent === null
              ? "—"
              : `${overall.monthlySavingsPercent}%`}
          </strong>
          <Rating
            percent={overall.monthlySavingsPercent}
            rating={overall.monthlySavingsRating}
          />
        </div>
        <div>
          <span>Habit consistency · 30 days</span>
          <strong>
            {overall.habitConsistencyPercent === null
              ? "—"
              : `${overall.habitConsistencyPercent}%`}
          </strong>
          <small>
            Completed / eligible elapsed periods for selected scheduled habits
          </small>
        </div>
      </div>
      <div className={styles.toolbar}>
        <label htmlFor="savings-goal">Goal</label>
        <select
          id="savings-goal"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          disabled={!user.goals.length}
        >
          {!user.goals.length && <option value="">No goals recorded</option>}
          {user.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
              {!g.isActive ? " (inactive)" : ""}
            </option>
          ))}
        </select>
        <label htmlFor="savings-frequency">View</label>
        <select
          id="savings-frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as "weekly" | "monthly")}
        >
          <option value="weekly">Weekly · latest 12 weeks</option>
          <option value="monthly">Monthly · latest 6 months</option>
        </select>
      </div>
      {data && progress && goal ? (
        <>
          <div className={styles.goalHeading}>
            <div>
              <p className={styles.description}>
                Selected goal · {frequency === "weekly" ? "weekly" : "monthly"}{" "}
                view
              </p>
              <h3>{goal.title}</h3>
            </div>
            <Rating percent={data.percent} rating={data.rating} />
          </div>
          <p className={styles.description}>
            {data.contributedPeriods} of {data.eligiblePeriods} elapsed{" "}
            {frequency === "weekly" ? "weeks" : "months"} had contributions ·{" "}
            <strong>{data.missedPeriods} with no contribution</strong>.{" "}
            {goal.isActive
              ? ""
              : "Inactive goal: excluded from the overall consistency scores."}
          </p>
          {Math.abs(progress.recordedAmount - progress.displayedSavedAmount) >
            0.005 && (
            <p className={styles.notice}>
              The displayed saved balance is{" "}
              {formatMoney(progress.displayedSavedAmount)}, but available
              contribution records total {formatMoney(progress.recordedAmount)}.
              Charts use recorded entries only; missing history is not
              estimated.
            </p>
          )}
          <div className={styles.charts}>
            <Chart data={data} cumulative />
            <Chart data={data} cumulative={false} />
          </div>
          <p className={styles.legend}>
            <span>Teal: contributed</span>
            <span>Red: no contribution</span>
            <span>Gold: current period</span>
            <span>Gray: partial starting period</span>
          </p>
          <details className={styles.details}>
            <summary>
              View contributions and missed{" "}
              {frequency === "weekly" ? "weeks" : "months"}
            </summary>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Contributions</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((p) => (
                    <tr key={p.start}>
                      <td>
                        {dateLabel(p.start)} – {dateLabel(p.end)},{" "}
                        {p.end.slice(0, 4)}
                      </td>
                      <td>{p.contributionCount}</td>
                      <td>{formatMoney(p.amount)}</td>
                      <td>
                        {p.status === "missed"
                          ? "No contribution recorded"
                          : p.status === "in_progress"
                            ? "Current period · unfinished"
                            : p.status === "partial"
                              ? "Partial starting period · excluded"
                              : "Contributed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          {!progress.recordedCount && (
            <p className={styles.notice}>
              No contribution entries are available for this goal. Gaps indicate
              missing recorded contributions, not proof that the customer failed
              to save.
            </p>
          )}
        </>
      ) : (
        <p className={styles.description}>
          No goals recorded for this user yet.
        </p>
      )}
      <details className={styles.description}>
        <summary>How savings consistency is calculated</summary>
        <p>
          Weekly periods run Monday–Sunday; monthly periods are calendar months
          in the customer’s timezone. Only whole elapsed periods after creation
          enter the score. Green ≥80%, yellow 50–79%, red &lt;50%. Overall
          savings scores combine eligible goal-periods across currently active
          goals; habits are shown separately. These are observed patterns, not
          scheduled payment obligations. Weekly and monthly percentages use
          different periods, so they may differ substantially.
        </p>
      </details>
    </article>
  );
}
