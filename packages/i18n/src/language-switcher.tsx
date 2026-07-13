"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "./context";
import type { Locale } from "./types";
import "./language-switcher.css";

type LanguageSwitcherProps = {
  className?: string;
};

const localeOptions: Locale[] = ["en", "ar"];

function GlobeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const labels: Record<Locale, string> = {
    en: t("language.english"),
    ar: t("language.arabic"),
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const pickLocale = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`language-switcher${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        className="language-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="language-switcher__icon">
          <GlobeIcon />
        </span>
        <span className="language-switcher__label">{labels[locale]}</span>
        <span className="language-switcher__chevron">
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <ul
          id={listboxId}
          className="language-switcher__menu"
          role="listbox"
          aria-label={t("language.label")}
        >
          {localeOptions.map((value) => (
            <li key={value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={locale === value}
                className={`language-switcher__option${locale === value ? " is-active" : ""}`}
                onClick={() => pickLocale(value)}
              >
                {labels[value]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
