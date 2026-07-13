export type Locale = "en" | "ar";

export const LOCALE_STORAGE_KEY = "muakhah_locale";

export const locales: Locale[] = ["en", "ar"];

export type TranslationParams = Record<string, string | number>;

export type TranslationTree = {
  [key: string]: string | TranslationTree;
};
