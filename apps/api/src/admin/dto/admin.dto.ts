import {
  adminChecklistUpdateSchema,
  adminKycEscalateSchema,
  adminKycQuerySchema,
  adminPathwayApplicationsQuerySchema,
  adminUpgradeIntentsQuerySchema,
  adminUsersQuerySchema,
  paginationQuerySchema,
  adminStaffCreateSchema,
  adminStaffQuerySchema,
  adminStaffRoleUpdateSchema,
  adminStaffUpdateSchema,
  adminCustomRoleCreateSchema,
  adminCustomRoleUpdateSchema,
  adminRolePermissionsUpdateSchema,
  adminStaffPermissionsUpdateSchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class AdminUsersQueryDto extends zodDto(adminUsersQuerySchema) {}
export class AdminLevelUsersQueryDto extends zodDto(paginationQuerySchema) {}
export class AdminStaffQueryDto extends zodDto(adminStaffQuerySchema) {}
export class AdminStaffCreateDto extends zodDto(adminStaffCreateSchema) {}
export class AdminStaffUpdateDto extends zodDto(adminStaffUpdateSchema) {}
export class AdminStaffRoleUpdateDto extends zodDto(
  adminStaffRoleUpdateSchema,
) {}
export class AdminCustomRoleCreateDto extends zodDto(
  adminCustomRoleCreateSchema,
) {}
export class AdminCustomRoleUpdateDto extends zodDto(
  adminCustomRoleUpdateSchema,
) {}
export class AdminRolePermissionsUpdateDto extends zodDto(
  adminRolePermissionsUpdateSchema,
) {}
export class AdminStaffPermissionsUpdateDto extends zodDto(
  adminStaffPermissionsUpdateSchema,
) {}
export class AdminPathwayApplicationsQueryDto extends zodDto(
  adminPathwayApplicationsQuerySchema,
) {}
export class AdminUpgradeIntentsQueryDto extends zodDto(
  adminUpgradeIntentsQuerySchema,
) {}
export class AdminKycQueryDto extends zodDto(adminKycQuerySchema) {}
export class AdminKycEscalateDto extends zodDto(adminKycEscalateSchema) {}
export class AdminChecklistUpdateDto extends zodDto(
  adminChecklistUpdateSchema,
) {}
