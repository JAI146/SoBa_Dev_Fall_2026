import { z } from "zod";

export const AdminRole = {
  SUPER_ADMIN: "super_admin",
  FAMILY_MANAGER: "family_manager",
  CONTENT_MODERATOR: "content_moderator",
  TRANSFER_PROOF_REVIEWER: "transfer_proof_reviewer",
  SYSTEM_ADMINISTRATOR: "system_administrator",
} as const;

export type AdminRoleValue = (typeof AdminRole)[keyof typeof AdminRole];

export const AdminPermission = {
  FAMILIES_READ: "families:read",
  FAMILIES_WRITE: "families:write",
  DONORS_READ: "donors:read",
  DONORS_WRITE: "donors:write",
  SPONSORSHIPS_READ: "sponsorships:read",
  SPONSORSHIPS_REVIEW: "sponsorships:review",
  CHAT_MODERATE: "chat:moderate",
  PROFILE_UPDATES_REVIEW: "profile-updates:review",
  LEGAL_READ: "legal:read",
  LEGAL_WRITE: "legal:write",
  SETTINGS_MANAGE: "settings:manage",
  SUB_ADMINS_MANAGE: "sub-admins:manage",
  ACTIVITY_LOGS_READ: "activity-logs:read",
} as const;

export type AdminPermissionValue =
  (typeof AdminPermission)[keyof typeof AdminPermission];

export const ROLE_PERMISSIONS: Record<AdminRoleValue, AdminPermissionValue[]> =
  {
    [AdminRole.SUPER_ADMIN]: Object.values(AdminPermission),
    [AdminRole.FAMILY_MANAGER]: [
      AdminPermission.FAMILIES_READ,
      AdminPermission.FAMILIES_WRITE,
      AdminPermission.PROFILE_UPDATES_REVIEW,
    ],
    [AdminRole.CONTENT_MODERATOR]: [AdminPermission.CHAT_MODERATE],
    [AdminRole.TRANSFER_PROOF_REVIEWER]: [
      AdminPermission.SPONSORSHIPS_READ,
      AdminPermission.SPONSORSHIPS_REVIEW,
    ],
    [AdminRole.SYSTEM_ADMINISTRATOR]: [
      AdminPermission.FAMILIES_READ,
      AdminPermission.FAMILIES_WRITE,
      AdminPermission.DONORS_READ,
      AdminPermission.DONORS_WRITE,
      AdminPermission.PROFILE_UPDATES_REVIEW,
      AdminPermission.SPONSORSHIPS_READ,
    ],
  };

export const SUB_ADMIN_ROLES = [
  AdminRole.FAMILY_MANAGER,
  AdminRole.CONTENT_MODERATOR,
  AdminRole.TRANSFER_PROOF_REVIEWER,
  AdminRole.SYSTEM_ADMINISTRATOR,
] as const;

export function permissionsForRole(
  role: AdminRoleValue | null | undefined,
): AdminPermissionValue[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  role: AdminRoleValue | null | undefined,
  permission: AdminPermissionValue,
): boolean {
  return permissionsForRole(role).includes(permission);
}

export const createSubAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  adminRole: z.enum([
    AdminRole.FAMILY_MANAGER,
    AdminRole.CONTENT_MODERATOR,
    AdminRole.TRANSFER_PROOF_REVIEWER,
    AdminRole.SYSTEM_ADMINISTRATOR,
  ]),
});

export type CreateSubAdminInput = z.infer<typeof createSubAdminSchema>;

export const updateSubAdminSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    adminRole: z
      .enum([
        AdminRole.FAMILY_MANAGER,
        AdminRole.CONTENT_MODERATOR,
        AdminRole.TRANSFER_PROOF_REVIEWER,
        AdminRole.SYSTEM_ADMINISTRATOR,
      ])
      .optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .refine(
    (data) =>
      data.firstName !== undefined ||
      data.lastName !== undefined ||
      data.adminRole !== undefined ||
      data.status !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateSubAdminInput = z.infer<typeof updateSubAdminSchema>;

export interface SubAdminListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  adminRole: AdminRoleValue;
  status: string;
  createdAt: string;
}
