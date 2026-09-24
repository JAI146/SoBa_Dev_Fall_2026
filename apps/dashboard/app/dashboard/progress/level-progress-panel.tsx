"use client";

/* eslint-disable react/prop-types -- Recharts injects label geometry into its render callback. */

import {
  adminProgressLevelsResponseSchema,
  adminProgressLevelUsersResponseSchema,
} from "@purposemint/contracts";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../dashboard.module.css";
import progressStyles from "./progress.module.css";

const levels = [
  {
    level: 1,
    title: "Stash Your First Dollar",
    color: "#6ee7b7",
    hoverColor: "#f0abfc",
  },
  {
    level: 2,
    title: "Hit Your Next $500",
    color: "#34d399",
    hoverColor: "#e879f9",
  },
  {
    level: 3,
    title: "Keep a Streak Alive",
    color: "#10b981",
    hoverColor: "#d946ef",
  },
  {
    level: 4,
    title: "Grow the Buffer",
    color: "#059669",
    hoverColor: "#c026d3",
  },
  {
    level: 5,
    title: "Unlock a Pathway",
    color: "#047857",
    hoverColor: "#86198f",
  },
] as const;

export function LevelProgressPanel() {
  const query = useAdminQuery(
    "/admin/progress/levels",
    adminProgressLevelsResponseSchema,
  );
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const closeLevel = useCallback(() => setSelectedLevel(null), []);
  const chartData = useMemo(
    () =>
      [...levels].reverse().map((level) => ({
        ...level,
        label: `Level ${level.level}`,
        count:
          query.data?.levels.find((item) => item.level === level.level)
            ?.count ?? 0,
      })),
    [query.data],
  );

  return (
    <div className={progressStyles.levelPanel}>
      <p className={progressStyles.demoNote}>
        Demo assignments only. Level rules and historical progression are not
        implemented yet.
      </p>
      {query.error ? (
        <p className={progressStyles.levelMessage} role="alert">
          {query.error}{" "}
          <button type="button" onClick={() => void query.reload()}>
            Retry
          </button>
        </p>
      ) : query.loading || !query.data ? (
        <p className={progressStyles.levelMessage}>
          Loading level distribution…
        </p>
      ) : (
        <>
          <div
            className={progressStyles.levelChart}
            aria-label="Demo customer counts by PurposeMint level, from Level 5 at top to Level 1 at bottom"
            onMouseLeave={() => setHoveredLevel(null)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 12, right: 40, bottom: 10, left: 8 }}
                barSize={42}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="#eef1f2"
                  strokeDasharray="3 4"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, (max: number) => Math.max(2, max + 2)]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={74}
                  tick={{ fontSize: 12, fill: "#374151", fontWeight: 650 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={false}
                  offset={28}
                  formatter={(value) => [`${value} users`, "Customers"]}
                  labelFormatter={(label) =>
                    `${label} — ${chartData.find((item) => item.label === label)?.title ?? ""}`
                  }
                  contentStyle={{
                    borderRadius: 10,
                    borderColor: "#d1d5db",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 9, 9, 0]}
                  cursor="pointer"
                  isAnimationActive={false}
                  onMouseEnter={(_, index) =>
                    setHoveredLevel(chartData[index]?.level ?? null)
                  }
                  onClick={(_, index) => {
                    const chosen = chartData[index];
                    if (chosen) setSelectedLevel(chosen.level);
                  }}
                >
                  {chartData.map((item) => (
                    <Cell
                      key={item.level}
                      fill={item.color}
                      style={
                        {
                          "--level-color": item.color,
                          "--level-hover-color": item.hoverColor,
                        } as CSSProperties
                      }
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    content={(props) => {
                      const index = (props as typeof props & { index?: number })
                        .index;
                      const item =
                        index === undefined ? undefined : chartData[index];
                      const box = props.viewBox;
                      if (
                        !item ||
                        !box ||
                        !("x" in box) ||
                        !("width" in box) ||
                        box.width < 65
                      )
                        return <g />;
                      return (
                        <text
                          x={box.x + box.width / 2}
                          y={box.y + box.height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={item.level <= 2 ? "#4a044e" : "#fff"}
                          fontSize={12}
                          fontWeight={700}
                          pointerEvents="none"
                          opacity={item.level === hoveredLevel ? 1 : 0}
                        >
                          Click me
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className={progressStyles.chartHint}>
            Select a bar to view its customers. {query.data.unassignedCount}{" "}
            customers have no demo level.
          </p>
          {selectedLevel !== null && (
            <LevelUsersTable
              key={selectedLevel}
              level={selectedLevel}
              onClose={closeLevel}
            />
          )}
        </>
      )}
    </div>
  );
}

function LevelUsersTable({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const query = useAdminQuery(
    `/admin/progress/levels/${level}/users?page=${page}&pageSize=10`,
    adminProgressLevelUsersResponseSchema,
  );
  const definition = levels.find((item) => item.level === level);
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
        "button:not([disabled]), [href]",
      );
      const first = focusable?.[0];
      const last = focusable?.[focusable.length - 1];
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

  return (
    <div
      className={progressStyles.levelBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={progressStyles.levelDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-users-title"
        ref={dialogRef}
      >
        <div className={progressStyles.levelUsersHeading}>
          <div>
            <h3 id="level-users-title">
              Level {level} · {definition?.title}
            </h3>
            <p>Customers assigned to this demo level</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close level users"
            ref={closeRef}
          >
            ×
          </button>
        </div>
        <div className={progressStyles.levelDialogBody}>
          {query.error ? (
            <p className={progressStyles.levelMessage} role="alert">
              {query.error}{" "}
              <button type="button" onClick={() => void query.reload()}>
                Retry
              </button>
            </p>
          ) : query.loading || !query.data ? (
            <p className={progressStyles.levelMessage}>Loading customers…</p>
          ) : (
            <>
              <div className={styles["table-wrap"]}>
                <table className={styles["data-table"]}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Assigned</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <Link
                            className={styles["table-link"]}
                            href={`/dashboard/users/${user.id}`}
                          >
                            {user.name}
                          </Link>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          {new Date(user.assignedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </td>
                        <td>{user.source === "mock" ? "Demo" : user.source}</td>
                      </tr>
                    ))}
                    {query.data.items.length === 0 && (
                      <tr>
                        <td colSpan={4} className={styles.empty}>
                          No customers are assigned to this level.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span>{query.data.total} customers</span>
                <div>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {query.data.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= query.data.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
