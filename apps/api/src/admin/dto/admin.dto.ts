import {
  adminChecklistUpdateSchema,
  adminPathwayApplicationsQuerySchema,
  adminUpgradeIntentsQuerySchema,
  adminUsersQuerySchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class AdminUsersQueryDto extends zodDto(adminUsersQuerySchema) {}
export class AdminPathwayApplicationsQueryDto extends zodDto(
  adminPathwayApplicationsQuerySchema,
) {}
export class AdminUpgradeIntentsQueryDto extends zodDto(
  adminUpgradeIntentsQuerySchema,
) {}
export class AdminChecklistUpdateDto extends zodDto(
  adminChecklistUpdateSchema,
) {}
