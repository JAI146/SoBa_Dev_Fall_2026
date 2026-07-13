"use client";

import type { FamilyReceivingMethod } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import { getReceivingMethodDetailRows } from "@/lib/receiving-method-display";
import styles from "@/app/dashboard/dashboard.module.css";

type ReceivingMethodsSelectorProps = {
  methods: FamilyReceivingMethod[];
  selectedIndices: number[];
  onChange: (indices: number[]) => void;
};

export function ReceivingMethodsSelector({
  methods,
  selectedIndices,
  onChange,
}: ReceivingMethodsSelectorProps) {
  const { t } = useI18n();

  function toggleIndex(index: number) {
    if (selectedIndices.includes(index)) {
      onChange(selectedIndices.filter((value) => value !== index));
      return;
    }
    onChange([...selectedIndices, index]);
  }

  return (
    <div className={styles["receiving-methods-selector"]}>
      {methods.map((method, index) => {
        const rows = getReceivingMethodDetailRows(method);
        const selected = selectedIndices.includes(index);

        return (
          <label
            key={`${method.method}-${index}`}
            className={`${styles["receiving-method-select-card"]} ${
              selected ? styles["receiving-method-select-card--selected"] : ""
            }`}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggleIndex(index)}
              className={styles["receiving-method-select-input"]}
            />
            <div className={styles["receiving-method-select-body"]}>
              <div className={styles["receiving-method-display-title"]}>
                {t(`families.receivingMethods.${method.method}`)}
              </div>
              {rows.length > 0 ? (
                <dl className={styles["receiving-method-display-rows"]}>
                  {rows.map((row) => (
                    <div
                      key={row.labelKey}
                      className={styles["receiving-method-display-row"]}
                    >
                      <dt>{t(row.labelKey)}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className={styles["form-hint"]} style={{ margin: 0 }}>
                  {t("visitor.families.noReceivingDetails")}
                </p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
