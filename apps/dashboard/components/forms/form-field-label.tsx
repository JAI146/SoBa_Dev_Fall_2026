"use client";

import { FormIcon, type FormIconName } from "./form-icons";
import styles from "./form-field-label.module.css";

type FormFieldLabelProps = {
  icon: FormIconName;
  children: React.ReactNode;
};

export function FormFieldLabel({ icon, children }: FormFieldLabelProps) {
  return (
    <span className={styles["form-field-label"]}>
      <span className={styles["form-field-label__icon"]} aria-hidden>
        <FormIcon name={icon} />
      </span>
      {children}
    </span>
  );
}
