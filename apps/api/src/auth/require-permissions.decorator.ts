import { SetMetadata } from "@nestjs/common";
import type { AdminPermissionValue } from "@muakhah/contracts";

export const PERMISSIONS_KEY = "permissions";

export const RequirePermissions = (...permissions: AdminPermissionValue[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
