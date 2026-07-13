"use client";

import type { FamilyFundingAmounts } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";

type FamilyFundingProgressProps = {
  family: FamilyFundingAmounts;
  compact?: boolean;
};

export function FamilyFundingProgress({
  family,
  compact = false,
}: FamilyFundingProgressProps) {
  const { t } = useI18n();

  const required = family.monthlyRequiredAmount;
  if (required <= 0) return null;

  const covered = family.monthlyCoveredAmount;
  const remaining = family.monthlyRemainingAmount;
  const percent = Math.min(100, Math.round((covered / required) * 100));

  return (
    <div
      className={
        compact
          ? styles["family-funding-progress--compact"]
          : styles["family-funding-progress"]
      }
    >
      <div className={styles["family-funding-progress__header"]}>
        <span className={styles["family-funding-progress__label"]}>
          {t("visitor.families.fundingSection")}
        </span>
        <span className={styles["family-funding-progress__percent"]}>
          {percent}%
        </span>
      </div>
      <div className={styles["family-coverage-bar"]}>
        <div
          className={styles["family-coverage-bar__fill"]}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className={styles["family-funding-progress__amounts"]}>
        <span>
          {t("visitor.families.monthlyCovered")}: ${covered.toFixed(2)}
        </span>
        <span>
          {t("visitor.families.monthlyRemainingLabel")}: ${remaining.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
