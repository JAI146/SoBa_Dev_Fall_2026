"use client";

import type { FamilyReceivingMethod } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";

type ReceivingMethodsDisplayProps = {
  methods: FamilyReceivingMethod[];
};

const METHOD_FIELDS: Record<
  FamilyReceivingMethod["method"],
  Array<{ key: keyof FamilyReceivingMethod; labelKey: string; multiline?: boolean }>
> = {
  bank_of_palestine: [
    { key: "accountHolder", labelKey: "families.receivingFields.accountHolder" },
    { key: "accountNumber", labelKey: "families.receivingFields.accountNumber" },
    { key: "branch", labelKey: "families.receivingFields.branch" },
    { key: "notes", labelKey: "families.receivingFields.notes", multiline: true },
  ],
  usdt: [
    { key: "usdtNetwork", labelKey: "families.receivingFields.usdtNetwork" },
    { key: "walletAddress", labelKey: "families.receivingFields.walletAddress" },
    { key: "notes", labelKey: "families.receivingFields.notes", multiline: true },
  ],
  iban: [
    { key: "bankName", labelKey: "families.receivingFields.bankName" },
    { key: "accountHolder", labelKey: "families.receivingFields.accountHolder" },
    { key: "iban", labelKey: "families.receivingFields.iban" },
    { key: "swiftBic", labelKey: "families.receivingFields.swiftBic" },
    { key: "country", labelKey: "families.receivingFields.country" },
    { key: "notes", labelKey: "families.receivingFields.notes", multiline: true },
  ],
  bank_transfer: [
    { key: "bankName", labelKey: "families.receivingFields.bankName" },
    { key: "accountNumber", labelKey: "families.receivingFields.accountNumber" },
    { key: "accountHolder", labelKey: "families.receivingFields.accountHolder" },
    { key: "notes", labelKey: "families.receivingFields.notes", multiline: true },
  ],
  personal_pickup: [
    { key: "receiverName", labelKey: "families.receivingFields.receiverName" },
    {
      key: "receiverRelationship",
      labelKey: "families.receivingFields.receiverRelationship",
    },
    { key: "generalArea", labelKey: "families.receivingFields.generalArea" },
    { key: "notes", labelKey: "families.receivingFields.notes", multiline: true },
  ],
  digital_wallet: [
    { key: "walletProvider", labelKey: "families.receivingFields.walletProvider" },
    { key: "walletId", labelKey: "families.receivingFields.walletId" },
    { key: "notes", labelKey: "families.receivingFields.notes", multiline: true },
  ],
  other: [
    { key: "methodName", labelKey: "families.receivingFields.methodName" },
    {
      key: "methodDescription",
      labelKey: "families.receivingFields.methodDescription",
      multiline: true,
    },
    {
      key: "receivingDetails",
      labelKey: "families.receivingFields.receivingDetails",
      multiline: true,
    },
    { key: "notes", labelKey: "families.receivingFields.notes", multiline: true },
  ],
};

export function ReceivingMethodsDisplay({ methods }: ReceivingMethodsDisplayProps) {
  const { t } = useI18n();

  if (methods.length === 0) {
    return (
      <p className={styles["receiving-methods-empty"]}>
        {t("families.form.receivingMethodsEmpty")}
      </p>
    );
  }

  return (
    <div className={styles["receiving-methods"]}>
      {methods.map((method, index) => {
        const fields = METHOD_FIELDS[method.method] ?? [];

        return (
          <div key={`${method.method}-${index}`} className={styles["receiving-method-card"]}>
            <div className={styles["receiving-method-header"]}>
              <strong>
                {t("families.form.receivingMethodNumber", { number: String(index + 1) })}
                {": "}
                {t(`families.receivingMethods.${method.method}`)}
              </strong>
            </div>
            <p className={styles["receiving-method-details-label"]}>
              {t("families.form.receivingMethodDetails")}
            </p>
            <dl className={styles["family-detail-list"]}>
              {fields.map(({ key, labelKey, multiline }) => {
                const value = method[key];
                if (typeof value !== "string" || !value.trim()) {
                  return null;
                }

                return (
                  <div
                    key={String(key)}
                    className={
                      multiline
                        ? `${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`
                        : styles["family-detail-row"]
                    }
                  >
                    <dt>{t(labelKey)}</dt>
                    <dd>{value}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
