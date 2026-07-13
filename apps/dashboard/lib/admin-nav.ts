import {
  AdminPermission,
  type AdminPermissionValue,
} from "@muakhah/contracts";
import type { SidebarNavIconName } from "@/components/dashboard/sidebar-nav-icons";

export type AdminNavItem = {
  href: string;
  match: string | null;
  key: string;
  icon: SidebarNavIconName;
  permission: AdminPermissionValue | null;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/dashboard/admin",
    match: null,
    key: "overview",
    icon: "overview",
    permission: null,
  },
  {
    href: "/dashboard/admin/families",
    match: "/families",
    key: "families",
    icon: "families",
    permission: AdminPermission.FAMILIES_READ,
  },
  {
    href: "/dashboard/admin/donors",
    match: "/donors",
    key: "donors",
    icon: "donors",
    permission: AdminPermission.DONORS_READ,
  },
  {
    href: "/dashboard/admin/sponsorships",
    match: "/sponsorships",
    key: "sponsorships",
    icon: "sponsorships",
    permission: AdminPermission.SPONSORSHIPS_READ,
  },
  {
    href: "/dashboard/admin/tickets",
    match: "/tickets",
    key: "tickets",
    icon: "tickets",
    permission: AdminPermission.SPONSORSHIPS_READ,
  },
  {
    href: "/dashboard/admin/transfer-requests",
    match: "/transfer-requests",
    key: "transferRequests",
    icon: "transferRequests",
    permission: AdminPermission.SPONSORSHIPS_READ,
  },
  {
    href: "/dashboard/admin/profile-update-requests",
    match: "/profile-update-requests",
    key: "profileUpdates",
    icon: "profileUpdates",
    permission: AdminPermission.PROFILE_UPDATES_REVIEW,
  },
  {
    href: "/dashboard/admin/chat",
    match: "/chat",
    key: "chat",
    icon: "chat",
    permission: AdminPermission.CHAT_MODERATE,
  },
  {
    href: "/dashboard/admin/legal",
    match: "/legal",
    key: "legal",
    icon: "legal",
    permission: AdminPermission.LEGAL_READ,
  },
  {
    href: "/dashboard/admin/settings",
    match: "/settings",
    key: "settings",
    icon: "settings",
    permission: AdminPermission.SETTINGS_MANAGE,
  },
  {
    href: "/dashboard/admin/sub-admins",
    match: "/sub-admins",
    key: "subAdmins",
    icon: "subAdmins",
    permission: AdminPermission.SUB_ADMINS_MANAGE,
  },
  {
    href: "/dashboard/admin/activity-logs",
    match: "/activity-logs",
    key: "activityLogs",
    icon: "activityLogs",
    permission: AdminPermission.ACTIVITY_LOGS_READ,
  },
];

export function filterAdminNav(
  permissions: AdminPermissionValue[] | undefined,
): AdminNavItem[] {
  const granted = permissions ?? [];
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return granted.includes(item.permission);
  });
}

export function canAccessAdminRoute(
  pathname: string,
  permissions: AdminPermissionValue[] | undefined,
): boolean {
  if (pathname === "/dashboard/admin") return true;
  const item = ADMIN_NAV_ITEMS.find((nav) => {
    if (!nav.match) return false;
    return (
      pathname === `/dashboard/admin${nav.match}` ||
      pathname.startsWith(`/dashboard/admin${nav.match}/`)
    );
  });
  if (!item?.permission) return true;
  return (permissions ?? []).includes(item.permission);
}
