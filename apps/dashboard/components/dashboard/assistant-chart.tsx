"use client";
import { useId, useRef, useState } from "react";
import { Maximize2, X, RotateCcw } from "lucide-react";
import type { AssistantChart as Chart } from "@purposemint/contracts";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  Legend,
} from "recharts";
import styles from "./assistant-launcher.module.css";
const colors = ["#17996b", "#71b9c4", "#dd86b4", "#c69b36", "#8c7dd1"];

function Plot({
  chart,
  expanded = false,
}: {
  chart: Chart;
  expanded?: boolean;
}) {
  const axes = (
    <>
      <CartesianGrid stroke="#e6eee9" vertical={false} />
      <XAxis
        dataKey="name"
        tick={{ fontSize: expanded ? 12 : 10 }}
        interval="preserveStartEnd"
        height={expanded ? 60 : 35}
        tickFormatter={(value: string) =>
          value.length > (expanded ? 24 : 12)
            ? value.slice(0, expanded ? 24 : 12) + "…"
            : value
        }
      />
      <YAxis
        width={expanded ? 85 : 55}
        tick={{ fontSize: expanded ? 12 : 10 }}
        tickFormatter={(value: number) =>
          Intl.NumberFormat("en", { notation: "compact" }).format(value)
        }
      />
      <Tooltip
        formatter={(value) => [
          value == null
            ? "Not available"
            : Number(value).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }),
          chart.valueLabel,
        ]}
        contentStyle={{ borderRadius: 10, borderColor: "#c9e2d4" }}
      />
      {expanded && <Legend />}
      {expanded && chart.data.length > 4 && (
        <Brush
          dataKey="name"
          height={28}
          stroke="#17996b"
          travellerWidth={10}
        />
      )}
    </>
  );
  const margin = { top: 15, right: 20, left: 0, bottom: 5 };
  return (
    <div
      className={expanded ? styles.expandedPlot : styles.cardPlot}
      aria-label={chart.title}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {chart.type === "pie" ? (
          <PieChart>
            <Pie
              data={chart.data.filter((point) => point.value !== null)}
              dataKey="value"
              nameKey="name"
              innerRadius={expanded ? "35%" : "30%"}
              outerRadius="70%"
              paddingAngle={2}
              label={
                expanded
                  ? ({ name, percent }) =>
                      String(name).slice(0, 24) +
                      " " +
                      ((percent ?? 0) * 100).toFixed(1) +
                      "%"
                  : false
              }
              isAnimationActive={false}
            >
              {chart.data
                .filter((point) => point.value !== null)
                .map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                Number(value).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              }
            />
            {expanded && chart.data.length <= 12 && <Legend />}
          </PieChart>
        ) : chart.type === "line" ? (
          <LineChart data={chart.data} margin={margin}>
            {axes}
            <Line
              dataKey="value"
              name={chart.valueLabel}
              stroke={colors[0]}
              strokeWidth={2.5}
              dot={expanded}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        ) : chart.type === "area" ? (
          <AreaChart data={chart.data} margin={margin}>
            {axes}
            <Area
              dataKey="value"
              name={chart.valueLabel}
              stroke={colors[0]}
              strokeWidth={2}
              fill="#b9e6d5"
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <BarChart data={chart.data} margin={margin}>
            {axes}
            <Bar
              dataKey="value"
              name={chart.valueLabel}
              fill={colors[0]}
              radius={[5, 5, 0, 0]}
              maxBarSize={60}
              isAnimationActive={false}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
function DataTable({ chart }: { chart: Chart }) {
  const grouped = chart.data.some((point) => point.sampleSize !== undefined);
  return (
    <div className={styles.chartTable}>
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>{chart.valueLabel}</th>
            {grouped && <th>Group size</th>}
          </tr>
        </thead>
        <tbody>
          {chart.data.map((point, index) => (
            <tr key={index}>
              <td>{point.name}</td>
              <td>
                {point.value?.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                }) ?? "Not available"}
              </td>
              {grouped && <td>{point.sampleSize ?? "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function AssistantChart({ chart }: { chart: Chart }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const maximize = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [zoomKey, setZoomKey] = useState(0);
  const missingValues = chart.data.filter(
    (point) => point.value === null,
  ).length;
  const coverageNote =
    "Based on the records retrieved for this request." +
    (missingValues
      ? ` Values are unavailable for ${missingValues} chart ${missingValues === 1 ? "entry" : "entries"}.`
      : "");
  return (
    <>
      <figure className={styles.chartCard}>
        <figcaption className={styles.chartCardHeading}>
          <strong>{chart.title}</strong>
          <button
            ref={maximize}
            type="button"
            onClick={() => {
              setVisible(true);
              dialog.current?.showModal();
            }}
            title="Expand chart"
            aria-label={"Expand " + chart.title}
            aria-haspopup="dialog"
          >
            <Maximize2 size={16} />
          </button>
        </figcaption>
        <Plot chart={chart} />
        <p className={styles.chartScope}>{coverageNote}</p>
        <details className={styles.chartDetails}>
          <summary>View chart data</summary>
          <DataTable chart={chart} />
        </details>
      </figure>
      <dialog
        ref={dialog}
        className={styles.chartDialog}
        aria-labelledby={titleId}
        onClose={() => {
          setVisible(false);
          maximize.current?.focus();
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <header className={styles.chartModalHeading}>
          <div>
            <span>PurposeMint insights</span>
            <h3 id={titleId}>{chart.title}</h3>
          </div>
          <button
            type="button"
            aria-label="Close expanded chart"
            onClick={() => dialog.current?.close()}
          >
            <X size={22} />
          </button>
        </header>
        {visible && (
          <>
            <div className={styles.chartToolbar}>
              <span>
                {chart.data.length} data points · Hover for exact values
                {chart.type !== "pie" && chart.data.length > 4
                  ? " · Drag the handles below to zoom"
                  : ""}
              </span>
              <button
                type="button"
                onClick={() => setZoomKey((key) => key + 1)}
              >
                <RotateCcw size={14} /> Reset view
              </button>
            </div>
            <Plot key={zoomKey} chart={chart} expanded />
            <p className={styles.chartScope}>{coverageNote}</p>
            <details className={styles.chartDetails}>
              <summary>View all values</summary>
              <DataTable chart={chart} />
            </details>
          </>
        )}
      </dialog>
    </>
  );
}
