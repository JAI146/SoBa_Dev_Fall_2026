import { AdminRole, type AdminRoleValue } from "./enums";

export const AdminPermission = {
  USER_MANAGEMENT_LIMITED: "user_management.limited",
  USER_MANAGEMENT_VIEW: "user_management.view",
  USER_MANAGEMENT_EDIT: "user_management.edit",
  FINANCIAL_DATA_LIMITED: "financial_data.limited",
  FINANCIAL_DATA_VIEW: "financial_data.view",
  PATHWAY_APPLICATIONS_EDIT: "pathway_applications.edit",
  REPORTS_LIMITED: "reports.limited",
  REPORTS_VIEW: "reports.view",
  REPORTS_FULL: "reports.full",
  AUDIT_LOGS_VIEW: "audit_logs.view",
  AUDIT_LOGS_FULL: "audit_logs.full",
  SETTINGS_LIMITED: "settings.limited",
  SETTINGS_FULL: "settings.full",
} as const;

export type AdminPermissionValue =
  (typeof AdminPermission)[keyof typeof AdminPermission];

export const adminPermissionValues = Object.values(AdminPermission) as [
  AdminPermissionValue,
  ...AdminPermissionValue[],
];

export const rolePermissions: Record<
  AdminRoleValue,
  readonly AdminPermissionValue[]
> = {
  [AdminRole.SUPER_ADMIN]: Object.values(AdminPermission),
  [AdminRole.MANAGER]: [
    AdminPermission.USER_MANAGEMENT_VIEW,
    AdminPermission.USER_MANAGEMENT_EDIT,
    AdminPermission.FINANCIAL_DATA_VIEW,
    AdminPermission.REPORTS_LIMITED,
    AdminPermission.REPORTS_VIEW,
    AdminPermission.REPORTS_FULL,
    AdminPermission.AUDIT_LOGS_VIEW,
    AdminPermission.SETTINGS_LIMITED,
  ],
  [AdminRole.AUDITOR]: [
    AdminPermission.USER_MANAGEMENT_VIEW,
    AdminPermission.FINANCIAL_DATA_VIEW,
    AdminPermission.REPORTS_VIEW,
    AdminPermission.AUDIT_LOGS_VIEW,
    AdminPermission.AUDIT_LOGS_FULL,
  ],
  [AdminRole.EDITOR]: [
    AdminPermission.USER_MANAGEMENT_VIEW,
    AdminPermission.USER_MANAGEMENT_EDIT,
    AdminPermission.FINANCIAL_DATA_LIMITED,
    AdminPermission.REPORTS_LIMITED,
  ],
  [AdminRole.SUPPORT]: [
    AdminPermission.USER_MANAGEMENT_VIEW,
    AdminPermission.FINANCIAL_DATA_LIMITED,
  ],
};

const permissionRank = {
  limited: 1,
  view: 2,
  edit: 3,
  full: 4,
} as const;

export function hasAdminPermission(
  role: AdminRoleValue | null,
  required: AdminPermissionValue,
  grantedPermissions?: readonly AdminPermissionValue[],
): boolean {
  if (!role && !grantedPermissions) return false;

  const [resource, level] = required.split(".") as [
    string,
    keyof typeof permissionRank,
  ];
  const requiredRank = permissionRank[level];
  if (!requiredRank) return false;

  const permissions = grantedPermissions ?? rolePermissions[role!];
  return permissions.some((permission) => {
    const [grantedResource, grantedLevel] = permission.split(".") as [
      string,
      keyof typeof permissionRank,
    ];
    return (
      grantedResource === resource &&
      permissionRank[grantedLevel] >= requiredRank
    );
  });
}
