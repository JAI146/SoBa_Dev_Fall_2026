"use client";

import type { FamilyReceivingMethod } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";

type ReceivingMethodsNameSelectorProps = {
  methods: FamilyReceivingMethod[];
  selectedIndex: number | null;
  onChange: (index: number) => void;
};

export function ReceivingMethodsNameSelector({
  methods,
  selectedIndex,
  onChange,
}: ReceivingMethodsNameSelectorProps) {
  const { t } = useI18n();

  return (
    <div className={styles["receiving-methods-selector"]}>
      {methods.map((method, index) => {
        const selected = selectedIndex === index;
        return (
          <label
            key={`${method.method}-${index}`}
            className={`${styles["receiving-method-select-card"]} ${
              selected ? styles["receiving-method-select-card--selected"] : ""
            }`}
          >
            <input
              type="radio"
              name="receivingMethod"
              checked={selected}
              onChange={() => onChange(index)}
              className={styles["receiving-method-select-input"]}
            />
            <div className={styles["receiving-method-select-body"]}>
              <div className={styles["receiving-method-display-title"]}>
                {t(`families.receivingMethods.${method.method}`)}
              </div>
              <p className={styles["form-hint"]} style={{ margin: 0 }}>
                {t("sponsorships.receivingMethodNamesOnlyHint")}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
