"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import { translate, translateEnum } from "./translate";
import {
  LOCALE_STORAGE_KEY,
  type Locale,
  type TranslationParams,
  type TranslationTree,
} from "./types";

const dictionaries: Record<Locale, TranslationTree> = { en, ar };

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
  te: (group: string, value: string) => string;
  dir: "ltr" | "rtl";
  isRtl: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "ar" ? "ar" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const tree = dictionaries[locale];
    return {
      locale,
      setLocale,
      t: (key, params) => translate(tree, key, params),
      te: (group, enumValue) => translateEnum(tree, group, enumValue),
      dir: locale === "ar" ? "rtl" : "ltr",
      isRtl: locale === "ar",
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function useOptionalI18n() {
  return useContext(I18nContext);
}
