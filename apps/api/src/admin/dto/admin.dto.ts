import {
  adminChecklistUpdateSchema,
  adminPathwayApplicationsQuerySchema,
  adminUpgradeIntentsQuerySchema,
  adminUsersQuerySchema,
  paginationQuerySchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class AdminUsersQueryDto extends zodDto(adminUsersQuerySchema) {}
export class AdminLevelUsersQueryDto extends zodDto(paginationQuerySchema) {}
export class AdminPathwayApplicationsQueryDto extends zodDto(
  adminPathwayApplicationsQuerySchema,
) {}
export class AdminUpgradeIntentsQueryDto extends zodDto(
  adminUpgradeIntentsQuerySchema,
) {}
export class AdminChecklistUpdateDto extends zodDto(
  adminChecklistUpdateSchema,
) {}
