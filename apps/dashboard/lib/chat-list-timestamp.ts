type TranslateFn = (key: string) => string;

export function formatChatListTimestamp(
  iso: string | null | undefined,
  t: TranslateFn,
): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMessageDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfMessageDay.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (dayDiff === 1) {
    return t("chat.timestampYesterday");
  }

  if (dayDiff < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
