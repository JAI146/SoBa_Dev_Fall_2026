import styles from "@/app/dashboard/dashboard.module.css";

export function formatActivityLogTime(iso: string, locale: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export function activityActionBadgeClass(action: string) {
  if (action.startsWith("family.")) {
    return styles["activity-action-badge--family"];
  }
  if (action.startsWith("donor.")) {
    return styles["activity-action-badge--donor"];
  }
  if (action.startsWith("sponsorship.")) {
    return styles["activity-action-badge--sponsorship"];
  }
  if (action.startsWith("chat.")) {
    return styles["activity-action-badge--chat"];
  }
  if (action.startsWith("profile_update.")) {
    return styles["activity-action-badge--profile"];
  }
  if (action.startsWith("sub_admin.")) {
    return styles["activity-action-badge--admin"];
  }
  if (action === "user.login") {
    return styles["activity-action-badge--login"];
  }
  return styles["activity-action-badge--default"];
}

export function activityActorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
