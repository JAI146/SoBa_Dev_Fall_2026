import { AdminPermission, AdminRole } from "@muakhah/contracts";
import type { StoredUser } from "./auth";

export function isContentModeratorDashboard(
  user: StoredUser | null | undefined,
): boolean {
  if (!user) return false;
  if (user.adminRole === AdminRole.CONTENT_MODERATOR) return true;

  const permissions = user.permissions ?? [];
  const hasChatModerate = permissions.includes(AdminPermission.CHAT_MODERATE);
  const hasBroaderAccess =
    user.adminRole === AdminRole.SUPER_ADMIN ||
    permissions.includes(AdminPermission.FAMILIES_READ) ||
    permissions.includes(AdminPermission.DONORS_READ) ||
    permissions.includes(AdminPermission.SPONSORSHIPS_READ);

  return hasChatModerate && !hasBroaderAccess;
}

export function isFamilyManagerDashboard(
  user: StoredUser | null | undefined,
): boolean {
  if (!user) return false;
  if (user.adminRole === AdminRole.FAMILY_MANAGER) return true;

  const permissions = user.permissions ?? [];
  const hasFamilyScope =
    permissions.includes(AdminPermission.FAMILIES_READ) ||
    permissions.includes(AdminPermission.FAMILIES_WRITE) ||
    permissions.includes(AdminPermission.PROFILE_UPDATES_REVIEW);
  const hasBroaderAccess =
    user.adminRole === AdminRole.SUPER_ADMIN ||
    permissions.includes(AdminPermission.DONORS_READ) ||
    permissions.includes(AdminPermission.SPONSORSHIPS_READ) ||
    permissions.includes(AdminPermission.CHAT_MODERATE) ||
    permissions.includes(AdminPermission.SUB_ADMINS_MANAGE) ||
    permissions.includes(AdminPermission.ACTIVITY_LOGS_READ) ||
    permissions.includes(AdminPermission.SETTINGS_MANAGE);

  return hasFamilyScope && !hasBroaderAccess;
}

export function isTransferProofReviewerDashboard(
  user: StoredUser | null | undefined,
): boolean {
  if (!user) return false;
  if (user.adminRole === AdminRole.TRANSFER_PROOF_REVIEWER) return true;

  const permissions = user.permissions ?? [];
  const hasTransferScope =
    permissions.includes(AdminPermission.SPONSORSHIPS_READ) ||
    permissions.includes(AdminPermission.SPONSORSHIPS_REVIEW);
  const hasBroaderAccess =
    user.adminRole === AdminRole.SUPER_ADMIN ||
    permissions.includes(AdminPermission.FAMILIES_READ) ||
    permissions.includes(AdminPermission.DONORS_READ) ||
    permissions.includes(AdminPermission.CHAT_MODERATE) ||
    permissions.includes(AdminPermission.PROFILE_UPDATES_REVIEW) ||
    permissions.includes(AdminPermission.SUB_ADMINS_MANAGE) ||
    permissions.includes(AdminPermission.ACTIVITY_LOGS_READ) ||
    permissions.includes(AdminPermission.SETTINGS_MANAGE);

  return hasTransferScope && !hasBroaderAccess;
}

export function isSystemAdministratorDashboard(
  user: StoredUser | null | undefined,
): boolean {
  if (!user) return false;
  if (user.adminRole === AdminRole.SYSTEM_ADMINISTRATOR) return true;

  const permissions = user.permissions ?? [];
  const hasFamilyScope =
    permissions.includes(AdminPermission.FAMILIES_READ) ||
    permissions.includes(AdminPermission.FAMILIES_WRITE);
  const hasSponsorScope =
    permissions.includes(AdminPermission.DONORS_READ) ||
    permissions.includes(AdminPermission.DONORS_WRITE) ||
    permissions.includes(AdminPermission.SPONSORSHIPS_READ);
  const hasElevatedAccess =
    user.adminRole === AdminRole.SUPER_ADMIN ||
    permissions.includes(AdminPermission.CHAT_MODERATE) ||
    permissions.includes(AdminPermission.SPONSORSHIPS_REVIEW) ||
    permissions.includes(AdminPermission.SUB_ADMINS_MANAGE) ||
    permissions.includes(AdminPermission.ACTIVITY_LOGS_READ) ||
    permissions.includes(AdminPermission.SETTINGS_MANAGE) ||
    permissions.includes(AdminPermission.LEGAL_READ);

  return hasFamilyScope && hasSponsorScope && !hasElevatedAccess;
}
