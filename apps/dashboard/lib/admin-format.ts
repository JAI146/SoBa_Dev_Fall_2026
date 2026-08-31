export function formatAdminDate(
  value: string | null,
  timeZone: string | null,
): string {
  if (!value) return "Not available";
  return format(value, timeZone, false);
}

export function formatAdminDateTime(
  value: string | null,
  timeZone: string | null,
): string {
  if (!value) return "Not available";
  return format(value, timeZone, true);
}

function format(value: string, timeZone: string | null, includeTime: boolean) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      ...(includeTime ? { timeStyle: "short" as const } : {}),
      timeZone: timeZone ?? "UTC",
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      ...(includeTime ? { timeStyle: "short" as const } : {}),
      timeZone: "UTC",
    }).format(new Date(value));
  }
}

export function formatMoney(value: number | null): string {
  if (value === null) return "Not provided";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatEnum(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatTier(value: string): string {
  if (value === "free") return "Starter";
  if (value === "growth") return "Momentum";
  if (value === "elevate") return "Elevation";
  return formatEnum(value);
}
