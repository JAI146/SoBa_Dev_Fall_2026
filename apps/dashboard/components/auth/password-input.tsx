"use client";

import { useState } from "react";
import { useI18n } from "@muakhah/i18n";
import { FormIcon } from "../forms/form-icons";
import iconStyles from "../forms/icon-field.module.css";
import styles from "../../app/auth.module.css";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
  value?: string;
  onChange?: (value: string) => void;
  variant?: "auth" | "dashboard";
  hideLabel?: boolean;
};

export function PasswordInput({
  id,
  name,
  label,
  minLength,
  required,
  autoComplete = "current-password",
  value,
  onChange,
  variant = "auth",
  hideLabel = false,
}: PasswordInputProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles["form-group"]}>
      {!hideLabel && <label htmlFor={id}>{label}</label>}
      <div
        className={[
          styles["password-field"],
          iconStyles["icon-field"],
          iconStyles["icon-field--with-toggle"],
          variant === "dashboard" ? iconStyles["icon-field--dashboard"] : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={iconStyles["icon-field__icon"]}>
          <FormIcon name="lock" />
        </span>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          minLength={minLength}
          required={required}
          autoComplete={autoComplete}
          className={iconStyles["icon-field__control"]}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
        <button
          type="button"
          className={styles["password-toggle"]}
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible ? t("auth.password.hide") : t("auth.password.show")
          }
          aria-pressed={visible}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  );
}
