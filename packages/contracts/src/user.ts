import type { AdminPermissionValue, AdminRoleValue } from "./admin-role";

export const UserType = {
  VISITOR: "visitor",
  SPONSOR: "sponsor",
  FAMILY: "family",
  ADMIN: "admin",
} as const;

export type UserTypeValue = (typeof UserType)[keyof typeof UserType];

export const UserStatus = {
  ACTIVE: "active",
  PENDING_EMAIL: "pending_email",
  SUSPENDED: "suspended",
} as const;

export type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  userType: UserTypeValue;
  status: UserStatusValue;
  adminRole?: AdminRoleValue | null;
  permissions?: AdminPermissionValue[];
  createdAt: string;
}
