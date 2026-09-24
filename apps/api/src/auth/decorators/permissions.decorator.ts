import { SetMetadata } from '@nestjs/common';
import type { AdminPermissionValue } from '@purposemint/contracts';

export const PERMISSIONS_KEY = 'pm:permissions';

export const RequirePermission = (...permissions: AdminPermissionValue[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
