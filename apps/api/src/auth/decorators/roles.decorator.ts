import { SetMetadata } from '@nestjs/common';
import type { AdminRoleValue, UserTypeValue } from '@purposemint/contracts';

export const ROLES_KEY = 'pm:roles';

export type RoleRequirement = UserTypeValue | AdminRoleValue;

/**
 * Accepts either a user type or an admin role; the route opens if the
 * principal matches any one of them.
 *
 *   @Roles(UserType.ADMIN)
 *   @Roles(AdminRole.SUPER_ADMIN)
 */
export const Roles = (...roles: RoleRequirement[]) =>
  SetMetadata(ROLES_KEY, roles);
