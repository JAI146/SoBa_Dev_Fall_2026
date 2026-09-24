"use client";

import {
  adminSavingsCustomerDetailSchema,
  type AdminSavingsCustomerDetail,
} from "@purposemint/contracts";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "./goal-progress-modal.module.css";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const shortMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
type Goal = AdminSavingsCustomerDetail["goals"][number];
type Point = { id: string; time: number; amount: number; total: number };

function Status({
  label,
  enabled,
  icon,
  onText,
  offText,
  showTooltip = false,
}: {
  label: string;
  enabled: boolean;
  icon: ReactNode;
  onText: string;
  offText: string;
  showTooltip?: boolean;
}) {
  const description = enabled ? onText : offText;
  return (
    <span
      className={`${styles.status} ${enabled ? styles.positive : styles.negative}`}
      tabIndex={showTooltip ? 0 : undefined}
      aria-label={`${label}: ${description}`}
    >
      <span aria-hidden="true">{icon}</span> {label}
      {showTooltip && (
        <span className={styles.statusTooltip} role="tooltip">
          {description}
        </span>
      )}
    </span>
  );
}

function PathwayIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 18h5a5 5 0 0 0 5-5V7M12 18h5" />
    </svg>
  );
}

function SavingsChart({
  goal,
  kind,
}: {
  goal: Goal;
  kind: "total" | "entries";
}) {
  const points = useMemo<Point[]>(() => {
    let total = 0;
    return [...goal.entries]
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      )
      .map((entry) => {
        total += entry.amount;
        return {
          id: entry.id,
          time: Date.parse(entry.createdAt),
          amount: entry.amount,
          total,
        };
      });
  }, [goal.entries]);
  const isTotal = kind === "total";
  const maxValue = Math.max(
    isTotal ? goal.targetAmount : 0,
    ...points.map((point) => (isTotal ? point.total : point.amount)),
    1,
  );
  const upperBound = Math.ceil(maxValue * 1.12);
  const start = points[0]?.time ?? Date.now();
  const end = points.at(-1)?.time ?? start;
  const xDomain: [number, number] =
    start === end ? [start - 86_400_000, end + 86_400_000] : [start, end];

  return (
    <section
      className={styles.chartCard}
      aria-label={isTotal ? "Total savings timeline" : "Savings entry timeline"}
    >
      <div className={styles.chartHeading}>
        <div>
          <h3>{isTotal ? "Total savings timeline" : "Each savings entry"}</h3>
          <p>
            {isTotal
              ? "Running total recorded for this goal"
              : "How much was recorded at each point in time"}
          </p>
        </div>
        <strong>
          {isTotal
            ? money.format(goal.savedAmount)
            : `${points.length} entries`}
        </strong>
      </div>
      {points.length === 0 ? (
        <div className={styles.chartEmpty}>
          No savings entries have been recorded for this goal yet.
        </div>
      ) : (
        <div className={styles.chartCanvas}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 18, right: 20, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#e9eef0"
                strokeDasharray="3 4"
              />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={xDomain}
                padding={{ left: 20, right: 20 }}
                tickFormatter={(value: number) => date.format(new Date(value))}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, upperBound]}
                tickFormatter={(value: number) => shortMoney.format(value)}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                width={66}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(value) => date.format(new Date(Number(value)))}
                formatter={(value) => money.format(Number(value))}
                contentStyle={{
                  borderRadius: 10,
                  borderColor: "#d1d5db",
                  fontSize: 12,
                }}
              />
              {isTotal && goal.targetAmount > 0 && (
                <ReferenceLine
                  y={goal.targetAmount}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{
                    value: "Target",
                    position: "insideTopRight",
                    fill: "#92400e",
                    fontSize: 11,
                  }}
                />
              )}
              <Line
                type="linear"
                dataKey={isTotal ? "total" : "amount"}
                name={isTotal ? "Total saved" : "Entry amount"}
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#059669" }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function GoalProgressModal({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const query = useAdminQuery(
    `/admin/savings/customers/${customerId}`,
    adminSavingsCustomerDetailSchema,
  );
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const data = query.data;
  const goal =
    data?.goals.find((item) => item.id === selectedGoalId) ?? data?.goals[0];
  const percentage =
    goal && goal.targetAmount > 0
      ? (goal.savedAmount / goal.targetAmount) * 100
      : null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-dialog-title"
        ref={dialogRef}
      >
        <header className={styles.dialogHeader}>
          <div>
            <p>Customer goal progress</p>
            <h2 id="goal-dialog-title">{data?.name ?? "Loading customer…"}</h2>
            {data && <span>{data.email}</span>}
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close goal progress"
          >
            ×
          </button>
        </header>
        <div className={styles.dialogBody}>
          {query.error ? (
            <div className={styles.message} role="alert">
              {query.error}{" "}
              <button type="button" onClick={() => void query.reload()}>
                Retry
              </button>
            </div>
          ) : query.loading || !data ? (
            <div className={styles.message}>
              Loading goals and savings entries…
            </div>
          ) : data.goals.length === 0 ? (
            <div className={styles.message}>
              This customer has no goals yet.
            </div>
          ) : (
            goal && (
              <>
                <details className={styles.goalSelector} open>
                  <summary>
                    Choose a goal <span>{data.goals.length} goals</span>
                  </summary>
                  <div className={styles.goalTableWrap}>
                    <table className={styles.goalTable}>
                      <thead>
                        <tr>
                          <th>Goal</th>
                          <th>Completion</th>
                          <th>Pathway eligible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.goals.map((item) => (
                          <tr
                            key={item.id}
                            className={
                              item.id === goal.id
                                ? styles.selectedGoal
                                : undefined
                            }
                            tabIndex={0}
                            aria-label={`Select ${item.title}`}
                            onClick={() => setSelectedGoalId(item.id)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedGoalId(item.id);
                              }
                            }}
                          >
                            <td>
                              <button
                                type="button"
                                className={styles.goalButton}
                                onClick={() => setSelectedGoalId(item.id)}
                                aria-pressed={item.id === goal.id}
                              >
                                {item.title}
                              </button>
                            </td>
                            <td>
                              {item.targetAmount > 0
                                ? `${((item.savedAmount / item.targetAmount) * 100).toFixed(1)}%`
                                : "—"}
                            </td>
                            <td>{item.isPathwayEligible ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                <div className={styles.goalSummary}>
                  <div>
                    <p>Selected goal</p>
                    <h3>{goal.title}</h3>
                    <span>
                      {money.format(goal.savedAmount)} saved of{" "}
                      {money.format(goal.targetAmount)} target ·{" "}
                      {percentage === null
                        ? "No target"
                        : `${percentage.toFixed(1)}% complete`}
                    </span>
                  </div>
                  <div className={styles.statuses}>
                    <Status
                      label="Pathway"
                      enabled={goal.isPathwayEligible}
                      icon={<PathwayIcon />}
                      onText="Eligible"
                      offText="Ineligible"
                      showTooltip
                    />
                    <Status
                      label="Focus"
                      enabled={goal.isFocus}
                      icon="◎"
                      onText="Focus goal"
                      offText="Not focus goal"
                    />
                    <Status
                      label={goal.isActive ? "Active" : "Inactive"}
                      enabled={goal.isActive}
                      icon="●"
                      onText="Active"
                      offText="Inactive"
                    />
                  </div>
                </div>
                <div className={styles.charts}>
                  <SavingsChart goal={goal} kind="total" />
                  <SavingsChart goal={goal} kind="entries" />
                </div>
                <p className={styles.provenance}>
                  These figures are manually recorded savings entries, not a
                  verified bank balance. Pathway eligibility means this goal is
                  marked eligible; it does not establish financial readiness.
                </p>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
