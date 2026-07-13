"use client";

import type { Locale } from "@muakhah/i18n";
import type { FormIconName } from "@/components/forms/form-icons";
import { IconInput, IconTextarea } from "@/components/forms/icon-field";
import styles from "@/app/dashboard/dashboard.module.css";

type BilingualFieldProps = {
  lang: Locale;
  icon: FormIconName;
  label: string;
  baseId: string;
  required?: boolean;
  multiline?: boolean;
  full?: boolean;
  enValue: string;
  arValue: string;
  onEnChange: (value: string) => void;
  onArChange: (value: string) => void;
  enPlaceholder?: string;
  arPlaceholder?: string;
};

/**
 * Renders a single input bound to the active form language. Both English and
 * Arabic values are kept in state; the toggle only switches which one is edited.
 */
export function BilingualField({
  lang,
  icon,
  label,
  baseId,
  required,
  multiline,
  full,
  enValue,
  arValue,
  onEnChange,
  onArChange,
  enPlaceholder,
  arPlaceholder,
}: BilingualFieldProps) {
  const isArabic = lang === "ar";
  const value = isArabic ? arValue : enValue;
  const onChange = isArabic ? onArChange : onEnChange;
  const placeholder = isArabic ? arPlaceholder : enPlaceholder;
  const id = `${baseId}${isArabic ? "Ar" : ""}`;
  const dir = isArabic ? "rtl" : "ltr";

  return (
    <div
      className={`${styles["form-field"]} ${full ? styles.full : ""}`.trim()}
    >
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <IconTextarea
          icon={icon}
          variant="dashboard"
          id={id}
          dir={dir}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <IconInput
          icon={icon}
          variant="dashboard"
          id={id}
          type="text"
          dir={dir}
          required={required && !isArabic}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
