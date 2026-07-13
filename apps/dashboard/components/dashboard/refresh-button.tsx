"use client";

import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";
import { RefreshIcon } from "./action-icons";

type RefreshButtonProps = {
  refreshing?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function RefreshButton({
  refreshing = false,
  disabled = false,
  onClick,
}: RefreshButtonProps) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      className={styles["btn-toolbar-primary"]}
      onClick={onClick}
      disabled={disabled || refreshing}
    >
      <RefreshIcon spinning={refreshing} />
      {refreshing ? t("common.refreshing") : t("common.refresh")}
    </button>
  );
}
