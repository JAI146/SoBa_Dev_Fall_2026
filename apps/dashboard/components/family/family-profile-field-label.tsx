"use client";

import { FormIcon, type FormIconName } from "@/components/forms/form-icons";
import styles from "@/app/dashboard/dashboard.module.css";

type FamilyProfileFieldLabelProps = {
  icon: FormIconName;
  children: React.ReactNode;
};

export function FamilyProfileFieldLabel({
  icon,
  children,
}: FamilyProfileFieldLabelProps) {
  return (
    <span className={styles["family-detail-row__label"]}>
      <span className={styles["family-detail-row__icon"]}>
        <FormIcon name={icon} />
      </span>
      {children}
    </span>
  );
}
