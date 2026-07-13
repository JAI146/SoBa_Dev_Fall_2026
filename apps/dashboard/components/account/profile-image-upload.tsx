"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import styles from "../../app/auth.module.css";

function UploadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

type ProfileImageUploadProps = {
  currentImageUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  disabled?: boolean;
};

export function ProfileImageUpload({
  currentImageUrl,
  onUpload,
  uploading = false,
  disabled = false,
}: ProfileImageUploadProps) {
  const { t } = useI18n();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setPreview(currentImageUrl);
  }, [currentImageUrl]);

  async function assignFile(file: File | undefined) {
    if (!file || disabled || uploading) return;
    if (!file.type.startsWith("image/")) return;

    setFileName(file.name);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
    }

    try {
      await onUpload(file);
    } catch {
      setPreview(currentImageUrl);
      setFileName(null);
    }
  }

  return (
    <div className={styles["file-upload-group"]}>
      <span className={styles["file-upload-label"]}>
        {t("visitor.settings.profileImage")}
      </span>
      <input
        ref={fileInputRef}
        id={inputId}
        name="profileImage"
        type="file"
        accept="image/*"
        className={styles["file-input-hidden"]}
        disabled={disabled || uploading}
        onChange={(e) => void assignFile(e.target.files?.[0])}
      />
      <label
        htmlFor={inputId}
        className={`${styles["file-upload-zone"]} ${preview ? styles["has-file"] : ""} ${dragOver ? styles["drag-over"] : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void assignFile(e.dataTransfer.files[0]);
        }}
      >
        {preview ? (
          <div className={styles["file-preview-wrap"]}>
            <img
              src={preview}
              alt={t("visitor.settings.profilePreviewAlt")}
              className={styles["image-preview"]}
            />
            <div className={styles["file-preview-info"]}>
              <div className={styles["file-preview-name"]}>
                {fileName ?? t("visitor.settings.currentPhoto")}
              </div>
              <div className={styles["file-preview-change"]}>
                {uploading
                  ? t("visitor.settings.uploadingPhoto")
                  : t("visitor.settings.changePhoto")}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles["file-upload-icon"]}>
              <UploadIcon />
            </div>
            <div className={styles["file-upload-title"]}>
              {t("visitor.settings.uploadPhoto")}
            </div>
            <div className={styles["file-upload-hint"]}>
              {t("visitor.settings.uploadHint")}
            </div>
          </>
        )}
      </label>
    </div>
  );
}
