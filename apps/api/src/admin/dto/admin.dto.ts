import {
  adminChecklistUpdateSchema,
  adminPathwayApplicationsQuerySchema,
  adminUpgradeIntentsQuerySchema,
  adminUsersQuerySchema,
  paginationQuerySchema,
  adminStaffCreateSchema,
  adminStaffQuerySchema,
  adminStaffUpdateSchema,
  adminCustomRoleCreateSchema,
  adminCustomRoleUpdateSchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class AdminUsersQueryDto extends zodDto(adminUsersQuerySchema) {}
export class AdminLevelUsersQueryDto extends zodDto(paginationQuerySchema) {}
export class AdminStaffQueryDto extends zodDto(adminStaffQuerySchema) {}
export class AdminStaffCreateDto extends zodDto(adminStaffCreateSchema) {}
export class AdminStaffUpdateDto extends zodDto(adminStaffUpdateSchema) {}
export class AdminCustomRoleCreateDto extends zodDto(adminCustomRoleCreateSchema) {}
export class AdminCustomRoleUpdateDto extends zodDto(adminCustomRoleUpdateSchema) {}
export class AdminPathwayApplicationsQueryDto extends zodDto(
  adminPathwayApplicationsQuerySchema,
) {}
export class AdminUpgradeIntentsQueryDto extends zodDto(
  adminUpgradeIntentsQuerySchema,
) {}
export class AdminChecklistUpdateDto extends zodDto(
  adminChecklistUpdateSchema,
) {}
