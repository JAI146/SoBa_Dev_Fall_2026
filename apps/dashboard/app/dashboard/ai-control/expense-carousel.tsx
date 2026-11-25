"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AssistantControl } from "@purposemint/contracts";
import styles from "./ai-control.module.css";

export const dollars = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value > 0 && value < 1 ? 4 : 2,
  }).format(value);

const palette = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#4d7c0f",
  "#7c3aed",
];
const slides = ["Expense overview", "Expense by admin"];

export function ExpenseCarousel({ data }: { data: AssistantControl }) {
  const [slide, setSlide] = useState(0);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (
      hover ||
      focus ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timeout = window.setTimeout(
      () => setSlide((current) => (current + 1) % slides.length),
      3000,
    );
    return () => window.clearTimeout(timeout);
  }, [slide, hover, focus]);

  const spent = data.spend.reduce((sum, row) => sum + row.dollars, 0);
  const limit = data.budget.limitCents / 100;
  const daily = new Map(data.daily.map((row) => [row.day, row.dollars]));
  const today = new Date().toISOString().slice(0, 10);
  const days = today.startsWith(data.month)
    ? Number(today.slice(-2))
    : new Date().getUTCDate();
  let cumulative = 0;
  const timeline = Array.from({ length: days }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    cumulative += daily.get(data.month + "-" + day) ?? 0;
    return { day, dollars: cumulative };
  });
  const people = [
    ...data.spend,
    ...data.admins
      .filter((admin) => !data.spend.some((row) => row.id === admin.id))
      .map(({ id, name }) => ({ id, name, dollars: 0 })),
  ].map((row, index) => ({ ...row, color: palette[index % palette.length]! }));

  return (
    <section
      className={styles.carousel}
      aria-label="Assistant expense charts"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(event) => setFocus(event.target.matches(":focus-visible"))}
      onPointerDown={() => setFocus(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false);
      }}
    >
      <div className={styles.cardHeading}>
        <div>
          <p className={styles.kicker}>MONTHLY USAGE · UTC</p>
          <h2>{slides[slide]}</h2>
        </div>
        <div className={styles.dots} aria-label="Choose a chart">
          {slides.map((label, index) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={index === slide}
              onClick={() => setSlide(index)}
            />
          ))}
        </div>
      </div>
      <div key={slide} className={styles.slide}>
        {slide === 0 ? (
          <>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                  data={timeline}
                  margin={{ top: 15, right: 20, left: 3, bottom: 6 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    stroke="#e5eee9"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis
                    width={64}
                    domain={[0, Math.max(limit, spent, 0.01) * 1.12]}
                    tickFormatter={(n) => dollars(Number(n))}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(day) => data.month + "-" + day}
                    formatter={(value) => [
                      dollars(Number(value)),
                      "Cumulative spend",
                    ]}
                  />
                  <ReferenceLine
                    y={limit}
                    stroke="#b45309"
                    strokeDasharray="5 4"
                    label={{
                      value: "Overall limit",
                      position: "insideTopRight",
                      fill: "#92400e",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    dataKey="dollars"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={timeline.length === 1}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <dl className={styles.metrics}>
              <div>
                <dt>Used this month</dt>
                <dd>{dollars(spent)}</dd>
              </div>
              <div>
                <dt>Overall monthly limit</dt>
                <dd>{dollars(limit)}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{data.model}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className={styles.chart}>
              {spent > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart accessibilityLayer>
                    <Pie
                      data={people.filter((row) => row.dollars > 0)}
                      dataKey="dollars"
                      nameKey="name"
                      innerRadius="49%"
                      outerRadius="82%"
                      paddingAngle={1}
                      isAnimationActive={false}
                    >
                      {people
                        .filter((row) => row.dollars > 0)
                        .map((row) => (
                          <Cell key={row.id} fill={row.color} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => dollars(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.empty}>
                  No assistant spend this month.
                </div>
              )}
            </div>
            <div className={styles.legend}>
              <p className={styles.kicker}>SHARE OF {dollars(spent)} SPENT</p>
              {people.map((row) => (
                <div key={row.id}>
                  <span
                    className={styles.swatch}
                    style={{ background: row.color }}
                  />
                  <span>{row.name}</span>
                  <strong>
                    {spent ? ((row.dollars / spent) * 100).toFixed(1) : "0"}%
                  </strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
