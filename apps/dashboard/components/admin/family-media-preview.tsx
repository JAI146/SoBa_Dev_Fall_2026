"use client";

import { useState } from "react";
import type { FamilyMediaItem } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";

type FamilyMediaPreviewProps = {
  items: FamilyMediaItem[];
  onToggleSensitivity?: (url: string, isSensitive: boolean) => Promise<void> | void;
};

export function FamilyMediaPreview({
  items,
  onToggleSensitivity,
}: FamilyMediaPreviewProps) {
  const { t } = useI18n();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className={styles["form-hint"]} style={{ margin: 0 }}>
        {t("visitor.families.noMedia")}
      </p>
    );
  }

  async function handleToggle(item: FamilyMediaItem) {
    if (!onToggleSensitivity || pendingUrl) return;
    setPendingUrl(item.url);
    try {
      await onToggleSensitivity(item.url, !item.isSensitive);
    } finally {
      setPendingUrl(null);
    }
  }

  return (
    <div className={styles["admin-family-media-grid"]}>
      {items.map((item, index) => {
        const visibilityLabel = item.isSensitive
          ? t("families.form.mediaVisibilitySensitive")
          : t("families.form.mediaVisibilityPublic");
        return (
          <div key={`${item.url}-${index}`} className={styles["admin-family-media-item"]}>
            {item.kind === "video" ? (
              <video src={item.url} controls className={styles["admin-family-media-thumb"]} />
            ) : (
              <img
                src={item.url}
                alt=""
                className={styles["admin-family-media-thumb"]}
              />
            )}
            <span className={styles["admin-family-media-meta"]}>
              {item.kind === "video"
                ? t("families.form.mediaTypeVideo")
                : t("families.form.mediaTypeImage")}
              {onToggleSensitivity && (
                <button
                  type="button"
                  className={`${styles["media-upload__visibility"]}${
                    item.isSensitive
                      ? ` ${styles["media-upload__visibility--sensitive"]}`
                      : ""
                  }`}
                  disabled={pendingUrl === item.url}
                  onClick={() => void handleToggle(item)}
                  aria-label={t("families.form.mediaVisibilityToggle", {
                    name: item.filename,
                    visibility: visibilityLabel,
                  })}
                >
                  <span className={styles["media-upload__visibility-dot"]} />
                  {visibilityLabel}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
