import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserType } from '@purposemint/contracts';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { requestContext } from '../common/request-context';
import { AdminService } from './admin.service';
import {
  AdminChecklistUpdateDto,
  AdminPathwayApplicationsQueryDto,
  AdminUpgradeIntentsQueryDto,
  AdminUsersQueryDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Admin dashboard overview metrics' })
  overview(@CurrentUser() principal: AuthPrincipal, @Req() request: Request) {
    return this.admin.overview(principal, requestContext(request));
  }

  @Get('users')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Search and paginate customer accounts' })
  users(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminUsersQueryDto,
    @Req() request: Request,
  ) {
    return this.admin.listUsers(principal, query, requestContext(request));
  }

  @Get('users/:id')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'View one customer account' })
  user(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.admin.getUser(principal, id, requestContext(request));
  }

  @Get('pathway-applications')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Filter and paginate pathway applications' })
  pathwayApplications(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminPathwayApplicationsQueryDto,
    @Req() request: Request,
  ) {
    return this.admin.listPathwayApplications(
      principal,
      query,
      requestContext(request),
    );
  }

  @Get('pathway-applications/:id')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'View a pathway application' })
  pathwayApplication(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.admin.getPathwayApplication(
      principal,
      id,
      requestContext(request),
    );
  }

  @Patch('pathway-checklist-items/:id')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Update a submitted application checklist item' })
  checklistItem(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminChecklistUpdateDto,
    @Req() request: Request,
  ) {
    return this.admin.updateChecklistItem(
      principal,
      id,
      body,
      requestContext(request),
    );
  }

  @Get('upgrade-intents')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'View upgrade demand grouped by plan' })
  upgradeIntents(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminUpgradeIntentsQueryDto,
    @Req() request: Request,
  ) {
    return this.admin.listUpgradeIntents(
      principal,
      query,
      requestContext(request),
    );
  }
}
