"use client";

import type { FamilyReceivingMethod } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import { getReceivingMethodDetailRows } from "@/lib/receiving-method-display";
import styles from "@/app/dashboard/dashboard.module.css";

type ReceivingMethodsDisplayProps = {
  methods: FamilyReceivingMethod[];
  variant?: "detail" | "card";
};

export function ReceivingMethodsDisplay({
  methods,
  variant = "detail",
}: ReceivingMethodsDisplayProps) {
  const { t } = useI18n();

  if (methods.length === 0) {
    return null;
  }

  return (
    <div
      className={
        variant === "card"
          ? styles["receiving-methods-display--card"]
          : styles["receiving-methods-display"]
      }
    >
      {methods.map((method, index) => {
        const rows = getReceivingMethodDetailRows(method);
        return (
          <div
            key={`${method.method}-${index}`}
            className={styles["receiving-method-display-card"]}
          >
            <div className={styles["receiving-method-display-title"]}>
              {t(`families.receivingMethods.${method.method}`)}
            </div>
            {rows.length > 0 ? (
              <dl className={styles["receiving-method-display-rows"]}>
                {rows.map((row) => (
                  <div key={row.labelKey} className={styles["receiving-method-display-row"]}>
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
        );
      })}
    </div>
  );
}
