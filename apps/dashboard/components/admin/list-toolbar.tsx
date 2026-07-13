"use client";

import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";
import { ExportIcon, RefreshIcon } from "@/components/dashboard/action-icons";

type ListToolbarProps = {
  onRefresh: () => void;
  onExport: () => void;
  refreshing?: boolean;
  exporting?: boolean;
  exportDisabled?: boolean;
  children?: React.ReactNode;
};

export function ListToolbar({
  onRefresh,
  onExport,
  refreshing = false,
  exporting = false,
  exportDisabled = false,
  children,
}: ListToolbarProps) {
  const { t } = useI18n();

  return (
    <div className={styles["page-actions-group"]}>
      <button
        type="button"
        className={styles["btn-toolbar-primary"]}
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshIcon spinning={refreshing} />
        {refreshing ? t("common.refreshing") : t("common.refresh")}
      </button>
      <button
        type="button"
        className={styles["btn-toolbar-primary"]}
        onClick={onExport}
        disabled={exportDisabled || exporting}
      >
        <ExportIcon />
        {exporting ? t("common.exporting") : t("common.exportCsv")}
      </button>
      {children}
    </div>
  );
}
