import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminPermission,
  UserType,
  healthReportInputSchema,
} from '@purposemint/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth-principal';
import { zodDto } from '../common/pipes/zod-validation.pipe';
import { SystemHealthService } from './system-health.service';
class HealthReportDto extends zodDto(healthReportInputSchema) {}
@ApiTags('system-health')
@ApiBearerAuth()
@Roles(UserType.ADMIN)
@Controller('admin/system-health')
export class SystemHealthController {
  constructor(private readonly service: SystemHealthService) {}
  @Get()
  @RequirePermission(AdminPermission.SETTINGS_LIMITED)
  overview(@CurrentUser() principal: AuthPrincipal) {
    return this.service.overview(principal);
  }
  @Post('reports')
  @HttpCode(204)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  report(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: HealthReportDto,
  ) {
    return this.service.report(principal, input);
  }
}
