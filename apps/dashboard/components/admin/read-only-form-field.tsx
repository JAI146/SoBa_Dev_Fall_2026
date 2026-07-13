"use client";

import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";

type ReadOnlyFormFieldProps = {
  label: string;
  value?: string | null;
  multiline?: boolean;
  full?: boolean;
  hint?: string;
};

export function ReadOnlyFormField({
  label,
  value,
  multiline,
  full,
  hint,
}: ReadOnlyFormFieldProps) {
  const { t } = useI18n();
  const displayValue = value?.trim() ? value : t("common.empty");

  return (
    <div className={`${styles["form-field"]} ${full ? styles.full : ""}`.trim()}>
      <label>{label}</label>
      {hint && <p className={styles["form-hint"]}>{hint}</p>}
      <p
        className={`${styles["form-readonly-value"]}${
          multiline ? ` ${styles["form-readonly-value--multiline"]}` : ""
        }`}
      >
        {displayValue}
      </p>
    </div>
  );
}
