import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, UserType } from '@purposemint/contracts';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth/auth-principal';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { requestContext } from '../common/request-context';
import { AdminService } from './admin.service';
import {
  AdminChecklistUpdateDto,
  AdminCustomRoleCreateDto,
  AdminCustomRoleUpdateDto,
  AdminStaffCreateDto,
  AdminStaffQueryDto,
  AdminStaffUpdateDto,
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
  @RequirePermission(AdminPermission.REPORTS_LIMITED)
  @ApiOperation({ summary: 'Admin dashboard overview metrics' })
  overview(@CurrentUser() principal: AuthPrincipal, @Req() request: Request) {
    return this.admin.overview(principal, requestContext(request));
  }

  @Get('users')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_VIEW)
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
  @RequirePermission(AdminPermission.USER_MANAGEMENT_VIEW)
  @ApiOperation({ summary: 'View one customer account' })
  user(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.admin.getUser(principal, id, requestContext(request));
  }

  @Get('staff')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_VIEW)
  @ApiOperation({ summary: 'List administrative staff accounts' })
  staff(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminStaffQueryDto,
    @Req() request: Request,
  ) {
    return this.admin.listStaff(principal, query, requestContext(request));
  }

  @Post('staff')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_EDIT)
  @ApiOperation({ summary: 'Create an administrative staff account' })
  createStaff(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: AdminStaffCreateDto,
    @Req() request: Request,
  ) {
    return this.admin.createStaff(principal, body, requestContext(request));
  }

  @Patch('staff/:id')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_EDIT)
  @ApiOperation({ summary: 'Edit or deactivate an administrative staff account' })
  updateStaff(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminStaffUpdateDto,
    @Req() request: Request,
  ) {
    return this.admin.updateStaff(principal, id, body, requestContext(request));
  }

  @Get('roles')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({ summary: 'List custom administrative roles' })
  customRoles(
    @CurrentUser() principal: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.admin.listCustomRoles(principal, requestContext(request));
  }

  @Post('roles')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({ summary: 'Create a custom administrative role' })
  createCustomRole(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: AdminCustomRoleCreateDto,
    @Req() request: Request,
  ) {
    return this.admin.createCustomRole(principal, body, requestContext(request));
  }

  @Patch('roles/:id')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  updateCustomRole(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminCustomRoleUpdateDto,
    @Req() request: Request,
  ) {
    return this.admin.updateCustomRole(
      principal,
      id,
      body,
      requestContext(request),
    );
  }

  @Delete('roles/:id')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  deleteCustomRole(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.admin.deleteCustomRole(principal, id, requestContext(request));
  }

  @Get('pathway-applications')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.FINANCIAL_DATA_VIEW)
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
  @RequirePermission(AdminPermission.FINANCIAL_DATA_VIEW)
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
  @RequirePermission(AdminPermission.PATHWAY_APPLICATIONS_EDIT)
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
  @RequirePermission(AdminPermission.REPORTS_LIMITED)
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
