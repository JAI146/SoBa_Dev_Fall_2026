import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, UserType } from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { AssistantDataService } from './assistant-data.service';

@ApiTags('assistant-data')
@ApiBearerAuth()
@Roles(UserType.ADMIN)
@Controller('admin/assistant-data')
export class AssistantDataController {
  constructor(private readonly data: AssistantDataService) {}

  @Get('audit-report')
  @RequirePermission(AdminPermission.AUDIT_LOGS_VIEW)
  getAuditReport(
    @CurrentUser() principal: AuthPrincipal,
    @Query() input: unknown,
  ) {
    return this.data.getAuditReport(principal, input);
  }

  @Get('employee-audit')
  @RequirePermission(AdminPermission.AUDIT_LOGS_VIEW)
  @ApiOperation({
    summary: 'Read a bounded employee audit history for assistant analysis',
  })
  getEmployeeAuditData(
    @CurrentUser() principal: AuthPrincipal,
    @Query() input: unknown,
  ) {
    return this.data.getEmployeeAuditData(principal, input);
  }

  @Get('savings-progress')
  @RequirePermission(AdminPermission.FINANCIAL_DATA_VIEW)
  @ApiOperation({
    summary:
      'Read savings progress, goals and dated entries for assistant analysis',
  })
  getSavingsProgressData(
    @CurrentUser() principal: AuthPrincipal,
    @Query() input: unknown,
  ) {
    return this.data.getSavingsProgressData(principal, input);
  }
}
