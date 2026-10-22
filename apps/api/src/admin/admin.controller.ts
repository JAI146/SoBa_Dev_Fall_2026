import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, UserType } from '@purposemint/contracts';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth/auth-principal';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { requestContext } from '../common/request-context';
import { AdminService } from './admin.service';
import { AdminKycService } from './admin-kyc.service';
import {
  AdminKycEscalateDto,
  AdminKycQueryDto,
  AdminKycResolveDto,
  AdminChecklistUpdateDto,
  AdminCustomRoleCreateDto,
  AdminCustomRoleUpdateDto,
  AdminRolePermissionsUpdateDto,
  AdminStaffPermissionsUpdateDto,
  AdminStaffRoleUpdateDto,
  AdminStaffCreateDto,
  AdminStaffQueryDto,
  AdminStaffUpdateDto,
  AdminPathwayApplicationsQueryDto,
  AdminUpgradeIntentsQueryDto,
  AdminUsersQueryDto,
  AdminLevelUsersQueryDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly kyc: AdminKycService,
  ) {}

  @Get('kyc')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_VIEW)
  @ApiOperation({ summary: 'View customer onboarding and KYC status' })
  listKyc(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: AdminKycQueryDto,
    @Req() request: Request,
  ) {
    return this.kyc.list(principal, query, requestContext(request));
  }

  @Get('kyc/:userId/history')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_VIEW)
  @ApiOperation({ summary: 'View the action history of a verification case' })
  kycHistory(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.kyc.history(userId);
  }

  @Post('kyc/:userId/retry')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_EDIT)
  @ApiOperation({ summary: 'Retry a customer verification' })
  retryKyc(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() request: Request,
  ) {
    return this.kyc.retry(principal, userId, requestContext(request));
  }

  @Post('kyc/:userId/escalate')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_EDIT)
  @ApiOperation({ summary: 'Escalate a customer verification case' })
  escalateKyc(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: AdminKycEscalateDto,
    @Req() request: Request,
  ) {
    return this.kyc.escalate(principal, userId, body, requestContext(request));
  }

  @Post('kyc/:userId/resolve')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.USER_MANAGEMENT_EDIT)
  @ApiOperation({ summary: 'Resolve an escalated verification case' })
  resolveKyc(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: AdminKycResolveDto,
    @Req() request: Request,
  ) {
    return this.kyc.resolve(principal, userId, body, requestContext(request));
  }

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

  @Get('progress/levels')
  @Roles(UserType.ADMIN)
  @ApiOperation({
    summary: 'Count customer assignments at each PurposeMint level',
  })
  progressLevels(
    @CurrentUser() principal: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.admin.listProgressLevels(principal, requestContext(request));
  }

  @Get('progress/levels/:level/users')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'List customers assigned to one PurposeMint level' })
  progressLevelUsers(
    @CurrentUser() principal: AuthPrincipal,
    @Param('level', ParseIntPipe) level: number,
    @Query() query: AdminLevelUsersQueryDto,
    @Req() request: Request,
  ) {
    if (level < 1 || level > 5)
      throw new BadRequestException('Level must be between 1 and 5.');
    return this.admin.listProgressLevelUsers(
      principal,
      level,
      query,
      requestContext(request),
    );
  }

  @Get('savings/customers')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'List customer savings aggregated across goals' })
  savingsCustomers(
    @CurrentUser() principal: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.admin.listSavingsCustomers(principal, requestContext(request));
  }

  @Get('savings/customers/:id')
  @Roles(UserType.ADMIN)
  @ApiOperation({
    summary: 'View a customer’s goals and dated savings entries',
  })
  savingsCustomer(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.admin.getSavingsCustomer(
      principal,
      id,
      requestContext(request),
    );
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
  @ApiOperation({
    summary: 'Edit or deactivate an administrative staff account',
  })
  updateStaff(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminStaffUpdateDto,
    @Req() request: Request,
  ) {
    return this.admin.updateStaff(principal, id, body, requestContext(request));
  }

  @Patch('staff/:id/role')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({ summary: 'Assign a built-in or custom role to staff' })
  updateStaffRole(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminStaffRoleUpdateDto,
    @Req() request: Request,
  ) {
    return this.admin.updateStaff(principal, id, body, requestContext(request));
  }

  @Patch('staff/:id/permissions')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({
    summary: 'Set or reset an individual staff member’s permissions',
  })
  updateStaffPermissions(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminStaffPermissionsUpdateDto,
    @Req() request: Request,
  ) {
    return this.admin.updateStaffPermissions(
      principal,
      id,
      body,
      requestContext(request),
    );
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
    return this.admin.createCustomRole(
      principal,
      body,
      requestContext(request),
    );
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

  @Get('role-permissions')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({ summary: 'List built-in and custom role permissions' })
  rolePermissions(
    @CurrentUser() principal: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.admin.listRolePermissionProfiles(
      principal,
      requestContext(request),
    );
  }

  @Patch('role-permissions/:roleKey')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({ summary: 'Update permissions for a built-in or custom role' })
  updateRolePermissions(
    @CurrentUser() principal: AuthPrincipal,
    @Param('roleKey') roleKey: string,
    @Body() body: AdminRolePermissionsUpdateDto,
    @Req() request: Request,
  ) {
    return this.admin.updateRolePermissions(
      principal,
      roleKey,
      body,
      requestContext(request),
    );
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
