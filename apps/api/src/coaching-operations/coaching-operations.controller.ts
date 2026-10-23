import { Controller, Get, Query } from '@nestjs/common';
import {
  AdminPermission,
  UserType,
  coachingOperationsQuerySchema,
} from '@purposemint/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { zodDto } from '../common/pipes/zod-validation.pipe';
import { CoachingOperationsService } from './coaching-operations.service';
class QueryDto extends zodDto(coachingOperationsQuerySchema) {}
@Controller('admin/coaching-operations')
@Roles(UserType.ADMIN)
@RequirePermission(AdminPermission.COACHING_OPERATIONS_VIEW)
export class CoachingOperationsController {
  constructor(private readonly service: CoachingOperationsService) {}
  @Get() overview(@Query() query: QueryDto) {
    return this.service.overview(query);
  }
}
