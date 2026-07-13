"use client";

import { useI18n } from "@muakhah/i18n";
import type { Locale } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";

type FormLanguageToggleProps = {
  value: Locale;
  onChange: (lang: Locale) => void;
  hint?: string;
  arabicDisabled?: boolean;
  arabicDisabledTitle?: string;
};

export function FormLanguageToggle({
  value,
  onChange,
  hint,
  arabicDisabled,
  arabicDisabledTitle,
}: FormLanguageToggleProps) {
  const { t } = useI18n();

  return (
    <div className={styles["form-language-toggle"]}>
      <div className={styles["tab-buttons"]} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={value === "en"}
          className={value === "en" ? styles.active : ""}
          onClick={() => onChange("en")}
        >
          {t("language.english")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === "ar"}
          disabled={arabicDisabled}
          title={arabicDisabled ? arabicDisabledTitle : undefined}
          className={value === "ar" ? styles.active : ""}
          onClick={() => onChange("ar")}
        >
          {t("language.arabic")}
        </button>
      </div>
      {hint && <p className={styles["form-hint"]}>{hint}</p>}
    </div>
  );
}
