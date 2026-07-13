"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FamilyMediaItemView } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import styles from "@/app/dashboard/dashboard.module.css";

type FamilyMediaGalleryModalProps = {
  open: boolean;
  items: FamilyMediaItemView[];
  initialIndex?: number;
  onClose: () => void;
};

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
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
      {direction === "left" ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

export function FamilyMediaGalleryModal({
  open,
  items,
  initialIndex = 0,
  onClose,
}: FamilyMediaGalleryModalProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)));
    }
  }, [open, initialIndex, items.length]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (items.length <= 1) return;
      if (e.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + items.length) % items.length);
      }
      if (e.key === "ArrowRight") {
        setIndex((current) => (current + 1) % items.length);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, items.length, onClose]);

  if (!open) return null;

  const current = items[index];
  const hasMultiple = items.length > 1;

  function goPrev() {
    setIndex((current) => (current - 1 + items.length) % items.length);
  }

  function goNext() {
    setIndex((current) => (current + 1) % items.length);
  }

  return createPortal(
    <div
      className={`${styles["modal-overlay"]} ${styles["family-media-gallery-overlay"]}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`${styles["modal-card"]} ${styles["family-media-gallery-modal"]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-media-gallery-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles["family-media-gallery-header"]}>
          <div>
            <h2 id="family-media-gallery-title" className={styles["modal-title"]}>
              {t("visitor.families.mediaGalleryTitle")}
            </h2>
            {items.length > 0 && (
              <p className={styles["family-media-gallery-counter"]}>
                {t("visitor.families.mediaGalleryCounter", {
                  current: String(index + 1),
                  total: String(items.length),
                })}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles["modal-btn-cancel"]}
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        </div>

        {items.length === 0 || !current ? (
          <p className={styles["form-hint"]}>{t("visitor.families.noMedia")}</p>
        ) : (
          <div className={styles["family-media-carousel"]}>
            {hasMultiple && (
              <button
                type="button"
                className={`${styles["family-media-carousel-nav"]} ${styles["family-media-carousel-nav--prev"]}`}
                onClick={goPrev}
                aria-label={t("visitor.families.mediaGalleryPrev")}
              >
                <ChevronIcon direction="left" />
              </button>
            )}

            <div className={styles["family-media-carousel-stage"]}>
              {current.locked ? (
                current.blurredUrl ? (
                  <img
                    key={current.blurredUrl}
                    src={current.blurredUrl}
                    alt=""
                    className={`${styles["family-media-carousel-media"]} ${styles["family-media-blur"]}`}
                  />
                ) : (
                  <div
                    className={`${styles["family-media-carousel-media"]} ${styles["family-media-locked-placeholder"]}`}
                  />
                )
              ) : current.kind === "video" ? (
                <video
                  key={current.url!}
                  src={current.url!}
                  controls
                  playsInline
                  preload="metadata"
                  className={styles["family-media-carousel-media"]}
                />
              ) : (
                <img
                  key={current.url!}
                  src={current.url!}
                  alt=""
                  className={styles["family-media-carousel-media"]}
                />
              )}
              <span className={styles["family-media-badge"]}>
                {current.kind === "video"
                  ? t("visitor.families.mediaVideo")
                  : t("visitor.families.mediaPhoto")}
              </span>
              {current.locked && (
                <span
                  className={`${styles["family-media-privacy"]} ${styles["family-media-privacy--action"]}`}
                >
                  {t("visitor.families.mediaSponsorToUnlock")}
                </span>
              )}
            </div>

            {hasMultiple && (
              <button
                type="button"
                className={`${styles["family-media-carousel-nav"]} ${styles["family-media-carousel-nav--next"]}`}
                onClick={goNext}
                aria-label={t("visitor.families.mediaGalleryNext")}
              >
                <ChevronIcon direction="right" />
              </button>
            )}
          </div>
        )}

        {hasMultiple && (
          <div className={styles["family-media-carousel-dots"]}>
            {items.map((item, dotIndex) => (
              <button
                key={`${item.url ?? item.blurredUrl ?? "locked"}-${dotIndex}`}
                type="button"
                className={`${styles["family-media-carousel-dot"]} ${
                  dotIndex === index ? styles["family-media-carousel-dot--active"] : ""
                }`}
                onClick={() => setIndex(dotIndex)}
                aria-label={t("visitor.families.mediaGalleryGoTo", {
                  number: String(dotIndex + 1),
                })}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
