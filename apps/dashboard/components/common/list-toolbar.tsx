"use client";

import styles from "@/app/dashboard/dashboard.module.css";
import { ExportIcon, RefreshIcon } from "@/components/dashboard/action-icons";

export function ListToolbar({
  onRefresh,
  onExport,
  exportDisabled = false,
}: {
  onRefresh: () => void;
  onExport: () => void;
  exportDisabled?: boolean;
}) {
  return (
    <div className={styles["page-actions-group"]}>
      <button
        type="button"
        className={styles["btn-toolbar-primary"]}
        onClick={onRefresh}
      >
        <RefreshIcon />
        Reset demo data
      </button>
      <button
        type="button"
        className={styles["btn-toolbar-primary"]}
        onClick={onExport}
        disabled={exportDisabled}
      >
        <ExportIcon />
        Export CSV
      </button>
    </div>
  );
}
