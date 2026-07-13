"use client";

import { useId, useRef, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";

export type MediaUploadItem = {
  file: File;
  isSensitive: boolean;
};

type MediaUploadFieldProps = {
  items: MediaUploadItem[];
  onChange: (items: MediaUploadItem[]) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="8.5" cy="10" r="1.75" fill="currentColor" />
      <path
        d="M3 16l4.5-4.5a1.5 1.5 0 0 1 2.12 0L14 15.5M14 15.5l2.5-2.5a1.5 1.5 0 0 1 2.12 0L21 16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MediaUploadField({ items, onChange }: MediaUploadFieldProps) {
  const { t } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(incoming: FileList | File[]) {
    const next = Array.from(incoming)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((file) => ({ file, isSensitive: false }));
    if (next.length === 0) return;
    onChange([...items, ...next]);
  }

  function removeFile(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function toggleSensitivity(index: number) {
    onChange(
      items.map((item, i) =>
        i === index ? { ...item, isSensitive: !item.isSensitive } : item,
      ),
    );
  }

  return (
    <div className={styles["media-upload"]}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*,video/*"
        multiple
        className={styles["media-upload__input"]}
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        className={`${styles["media-upload__dropzone"]}${dragOver ? ` ${styles["media-upload__dropzone--active"]}` : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
          }
        }}
      >
        <span className={styles["media-upload__icon"]}>
          <MediaIcon />
        </span>
        <span className={styles["media-upload__title"]}>
          {t("families.form.mediaDropTitle")}
        </span>
        <span className={styles["media-upload__hint"]}>
          {t("families.form.mediaDropHint")}
        </span>
        <span className={styles["media-upload__browse"]}>
          {t("families.form.mediaBrowse")}
        </span>
      </div>

      {items.length > 0 && (
        <>
          <p className={styles["media-upload__hint"]}>
            {t("families.form.mediaVisibilityHint")}
          </p>
          <ul className={styles["media-upload__list"]}>
            {items.map((item, index) => {
              const { file, isSensitive } = item;
              const visibilityLabel = isSensitive
                ? t("families.form.mediaVisibilitySensitive")
                : t("families.form.mediaVisibilityPublic");
              return (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className={styles["media-upload__item"]}
                >
                  <div className={styles["media-upload__item-info"]}>
                    <span className={styles["media-upload__item-name"]}>
                      {file.name}
                    </span>
                    <span className={styles["media-upload__item-meta"]}>
                      {file.type.startsWith("video/")
                        ? t("families.form.mediaTypeVideo")
                        : t("families.form.mediaTypeImage")}{" "}
                      · {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${styles["media-upload__visibility"]}${
                      isSensitive
                        ? ` ${styles["media-upload__visibility--sensitive"]}`
                        : ""
                    }`}
                    onClick={() => toggleSensitivity(index)}
                    aria-label={t("families.form.mediaVisibilityToggle", {
                      name: file.name,
                      visibility: visibilityLabel,
                    })}
                  >
                    <span className={styles["media-upload__visibility-dot"]} />
                    {visibilityLabel}
                  </button>
                  <button
                    type="button"
                    className={styles["media-upload__remove"]}
                    onClick={() => removeFile(index)}
                    aria-label={t("families.form.mediaRemove", { name: file.name })}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
