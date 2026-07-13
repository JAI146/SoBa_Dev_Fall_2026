const LOCALE_TAGS: Record<string, string> = {
  en: "en-US",
  ar: "ar",
};

export function resolveDateLocale(locale?: string) {
  if (!locale) return undefined;
  return LOCALE_TAGS[locale] ?? locale;
}

export function formatLocalDate(iso: string, locale?: string) {
  return new Date(iso).toLocaleDateString(resolveDateLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatLocalTime(iso: string, locale?: string) {
  return new Date(iso).toLocaleTimeString(resolveDateLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatLocalDateTime(iso: string, locale?: string) {
  return `${formatLocalDate(iso, locale)} · ${formatLocalTime(iso, locale)}`;
}
