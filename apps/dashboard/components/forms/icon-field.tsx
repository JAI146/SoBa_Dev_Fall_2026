import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { FormIcon, type FormIconName } from "./form-icons";
import styles from "./icon-field.module.css";

type FieldVariant = "auth" | "dashboard";

type BaseProps = {
  icon: FormIconName;
  variant?: FieldVariant;
};

function wrapperClass(
  variant: FieldVariant,
  extra?: string,
) {
  return [
    styles["icon-field"],
    variant === "dashboard" ? styles["icon-field--dashboard"] : "",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function IconInput({
  icon,
  variant = "auth",
  className,
  ...props
}: BaseProps &
  InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <div className={wrapperClass(variant)}>
      <span className={styles["icon-field__icon"]}>
        <FormIcon name={icon} />
      </span>
      <input
        className={[styles["icon-field__control"], className].filter(Boolean).join(" ")}
        {...props}
      />
    </div>
  );
}

export function IconSelect({
  icon,
  variant = "auth",
  className,
  children,
  ...props
}: BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <div className={wrapperClass(variant, styles["icon-field--select"])}>
      <span className={styles["icon-field__icon"]}>
        <FormIcon name={icon} />
      </span>
      <select
        className={[styles["icon-field__control"], className].filter(Boolean).join(" ")}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function IconTextarea({
  icon,
  variant = "auth",
  className,
  ...props
}: BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <div className={wrapperClass(variant, styles["icon-field--textarea"])}>
      <span className={styles["icon-field__icon"]}>
        <FormIcon name={icon} />
      </span>
      <textarea
        className={[styles["icon-field__control"], className].filter(Boolean).join(" ")}
        {...props}
      />
    </div>
  );
}
