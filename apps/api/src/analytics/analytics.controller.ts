import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, UserType } from '@purposemint/contracts';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { requestContext } from '../common/request-context';
import { AnalyticsService } from './analytics.service';
import {
  AdminAnalyticsExportParamsDto,
  AdminAnalyticsQueryDto,
} from './dto/analytics.dto';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@Roles(UserType.ADMIN)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  // Open to every admin so navigation can hide analytics without a 403.
  @Get('access')
  @ApiOperation({ summary: 'Get effective analytics access' })
  access(@CurrentUser() principal: AuthPrincipal) {
    return this.analytics.access(principal);
  }

  @Get('users')
  @RequirePermission(AdminPermission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Acquisition, activation and drop off metrics' })
  users(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminAnalyticsQueryDto,
    @Req() request: Request,
  ) {
    return this.analytics.userAnalytics(
      principal,
      query,
      requestContext(request),
    );
  }

  @Get('wellness')
  @RequirePermission(AdminPermission.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Savings, goal, habit and level progression metrics',
  })
  wellness(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminAnalyticsQueryDto,
    @Req() request: Request,
  ) {
    return this.analytics.wellnessAnalytics(
      principal,
      query,
      requestContext(request),
    );
  }

  @Get('pathways')
  @RequirePermission(AdminPermission.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Pathway application, partner, eligibility and plan metrics',
  })
  pathways(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminAnalyticsQueryDto,
    @Req() request: Request,
  ) {
    return this.analytics.pathwayAnalytics(
      principal,
      query,
      requestContext(request),
    );
  }

  @Get('commercial')
  @RequirePermission(AdminPermission.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Subscription conversion, cancellation and payment metrics',
  })
  commercial(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminAnalyticsQueryDto,
    @Req() request: Request,
  ) {
    return this.analytics.commercialAnalytics(
      principal,
      query,
      requestContext(request),
    );
  }

  @Get('retention')
  @RequirePermission(AdminPermission.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Weekly signup cohort retention and overall active share',
  })
  retention(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminAnalyticsQueryDto,
    @Req() request: Request,
  ) {
    return this.analytics.retention(principal, query, requestContext(request));
  }

  // Exports need full reporting access, not just the right to view pages.
  @Get('exports/:report')
  @RequirePermission(AdminPermission.REPORTS_FULL)
  @ApiOperation({
    summary: 'Aggregate CSV rows for one analytics page; audited before data',
  })
  exportReport(
    @CurrentUser() principal: AuthPrincipal,
    @Param() params: AdminAnalyticsExportParamsDto,
    @Query() query: AdminAnalyticsQueryDto,
    @Req() request: Request,
  ) {
    return this.analytics.exportReport(
      principal,
      params.report,
      query,
      requestContext(request),
    );
  }
}
