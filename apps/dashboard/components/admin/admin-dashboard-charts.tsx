"use client";

import { useI18n } from "@muakhah/i18n";
import styles from "../../app/dashboard/dashboard.module.css";

type BarChartItem = {
  key: string;
  label: string;
  value: number;
  tone?: "primary" | "mint" | "muted" | "striped";
};

export function AdminBarChart({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: BarChartItem[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className={`${styles.card} ${styles["card-wide"]} ${styles["admin-chart-card"]}`}>
      <div className={styles["admin-chart-card__header"]}>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className={styles["admin-bar-chart"]}>
        {items.map((item) => (
          <div key={item.key} className={styles["admin-bar-chart__item"]}>
            <div className={styles["admin-bar-chart__bar-wrap"]}>
              <div
                className={[
                  styles["admin-bar-chart__bar"],
                  item.tone ? styles[`admin-bar-chart__bar--${item.tone}`] : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ height: `${Math.max((item.value / max) * 100, 8)}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <span className={styles["admin-bar-chart__value"]}>{item.value}</span>
            <span className={styles["admin-bar-chart__label"]}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type DonutSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export function AdminDonutChart({
  title,
  subtitle,
  centerLabel,
  centerCaption,
  segments,
  formatSegmentValue,
}: {
  title: string;
  subtitle?: string;
  centerLabel: string;
  centerCaption?: string;
  segments: DonutSegment[];
  formatSegmentValue?: (value: number) => string;
}) {
  const { t } = useI18n();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const safeTotal = total > 0 ? total : 1;
  let offset = 0;
  const gradientParts = segments.map((segment) => {
    const pct = (segment.value / safeTotal) * 100;
    const start = offset;
    offset += pct;
    return `${segment.color} ${start}% ${offset}%`;
  });

  if (segments.every((segment) => segment.value === 0)) {
    gradientParts.push("#e5e7eb 0% 100%");
  }

  const caption =
    centerCaption ?? t("admin.overview.charts.totalCaption");

  return (
    <div className={`${styles.card} ${styles["card-wide"]} ${styles["admin-chart-card"]}`}>
      <div className={styles["admin-chart-card__header"]}>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className={styles["admin-donut-chart"]}>
        <div
          className={styles["admin-donut-chart__ring"]}
          style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
        >
          <div className={styles["admin-donut-chart__center"]}>
            <span className={styles["admin-donut-chart__center-caption"]}>
              {caption}
            </span>
            <strong className={styles["admin-donut-chart__center-value"]}>
              {centerLabel}
            </strong>
          </div>
        </div>
        <ul className={styles["admin-donut-chart__legend"]}>
          {segments.map((segment) => (
            <li key={segment.key}>
              <span
                className={styles["admin-donut-chart__swatch"]}
                style={{ background: segment.color }}
              />
              <span className={styles["admin-donut-chart__legend-label"]}>
                {segment.label}
              </span>
              <strong className={styles["admin-donut-chart__legend-value"]}>
                {formatSegmentValue
                  ? formatSegmentValue(segment.value)
                  : segment.value}
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
