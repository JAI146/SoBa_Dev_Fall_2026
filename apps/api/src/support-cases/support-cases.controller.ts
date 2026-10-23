import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AdminPermission,
  supportCaseAssignSchema,
  supportCaseCategoryCreateSchema,
  supportCaseCategoryUpdateSchema,
  supportCaseCloseSchema,
  supportCaseCreateSchema,
  supportCaseEscalateSchema,
  supportCaseMessageSchema,
  supportCaseNoteSchema,
  supportCaseResolveSchema,
  supportCasesQuerySchema,
  supportCaseStatusUpdateSchema,
  supportCaseUpdateSchema,
  UserType,
} from '@purposemint/contracts';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { zodDto } from '../common/pipes/zod-validation.pipe';
import { requestContext } from '../common/request-context';
import { SupportCasesService } from './support-cases.service';

class SupportCasesQueryDto extends zodDto(supportCasesQuerySchema) {}
class SupportCaseCreateDto extends zodDto(supportCaseCreateSchema) {}
class SupportCaseUpdateDto extends zodDto(supportCaseUpdateSchema) {}
class SupportCaseAssignDto extends zodDto(supportCaseAssignSchema) {}
class SupportCaseStatusDto extends zodDto(supportCaseStatusUpdateSchema) {}
class SupportCaseNoteDto extends zodDto(supportCaseNoteSchema) {}
class SupportCaseEscalateDto extends zodDto(supportCaseEscalateSchema) {}
class SupportCaseResolveDto extends zodDto(supportCaseResolveSchema) {}
class SupportCaseCloseDto extends zodDto(supportCaseCloseSchema) {}
class SupportCaseMessageDto extends zodDto(supportCaseMessageSchema) {}
class CategoryCreateDto extends zodDto(supportCaseCategoryCreateSchema) {}
class CategoryUpdateDto extends zodDto(supportCaseCategoryUpdateSchema) {}

@ApiTags('admin-support-cases')
@ApiBearerAuth()
@Controller('admin/support-cases')
export class SupportCasesController {
  constructor(private readonly service: SupportCasesService) {}

  // Declared before ':id' so "categories" is never parsed as a case id.
  @Get('categories')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_VIEW)
  @ApiOperation({ summary: 'List support case categories' })
  categories() {
    return this.service.listCategories();
  }

  @Post('categories')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_LIMITED)
  @ApiOperation({ summary: 'Add a support case category' })
  createCategory(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: CategoryCreateDto,
    @Req() request: Request,
  ) {
    return this.service.createCategory(
      principal,
      body,
      requestContext(request),
    );
  }

  @Patch('categories/:id')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SETTINGS_LIMITED)
  @ApiOperation({ summary: 'Rename, reorder, or deactivate a category' })
  updateCategory(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CategoryUpdateDto,
    @Req() request: Request,
  ) {
    return this.service.updateCategory(
      principal,
      id,
      body,
      requestContext(request),
    );
  }

  @Get()
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_VIEW)
  @ApiOperation({ summary: 'List support and complaint cases' })
  list(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: SupportCasesQueryDto,
    @Req() request: Request,
  ) {
    return this.service.list(principal, query, requestContext(request));
  }

  @Post()
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Open a support or complaint case' })
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: SupportCaseCreateDto,
    @Req() request: Request,
  ) {
    return this.service.create(principal, body, requestContext(request));
  }

  @Get(':id')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_VIEW)
  @ApiOperation({ summary: 'Case detail' })
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.service.get(principal, id, requestContext(request));
  }

  @Get(':id/history')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_VIEW)
  @ApiOperation({ summary: 'Case history from the audit trail' })
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.history(id);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Change a case type, category, or priority' })
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SupportCaseUpdateDto,
    @Req() request: Request,
  ) {
    return this.service.update(principal, id, body, requestContext(request));
  }

  @Post(':id/assign')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Assign or unassign a case' })
  assign(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SupportCaseAssignDto,
    @Req() request: Request,
  ) {
    return this.service.assign(principal, id, body, requestContext(request));
  }

  @Post(':id/status')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Move a case to in progress or waiting for user' })
  changeStatus(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SupportCaseStatusDto,
    @Req() request: Request,
  ) {
    return this.service.changeStatus(
      principal,
      id,
      body,
      requestContext(request),
    );
  }

  @Post(':id/notes')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Add an internal note' })
  addNote(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SupportCaseNoteDto,
    @Req() request: Request,
  ) {
    return this.service.addNote(principal, id, body, requestContext(request));
  }

  @Post(':id/escalate')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Escalate a case' })
  escalate(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SupportCaseEscalateDto,
    @Req() request: Request,
  ) {
    return this.service.escalate(principal, id, body, requestContext(request));
  }

  @Post(':id/resolve')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Record a resolution' })
  resolve(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SupportCaseResolveDto,
    @Req() request: Request,
  ) {
    return this.service.resolve(principal, id, body, requestContext(request));
  }

  @Post(':id/close')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Close a resolved case' })
  close(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SupportCaseCloseDto,
    @Req() request: Request,
  ) {
    return this.service.close(principal, id, body, requestContext(request));
  }

  @Post(':id/messages')
  @Roles(UserType.ADMIN)
  @RequirePermission(AdminPermission.SUPPORT_CASES_EDIT)
  @ApiOperation({ summary: 'Email the customer about this case' })
  sendMessage(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SupportCaseMessageDto,
    @Req() request: Request,
  ) {
    return this.service.sendMessage(
      principal,
      id,
      body,
      requestContext(request),
    );
  }
}
