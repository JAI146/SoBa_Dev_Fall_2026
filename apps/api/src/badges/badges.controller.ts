import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminPermission,
  UserType,
  badgeInputSchema,
  badgeUpdateSchema,
} from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { zodDto } from '../common/pipes/zod-validation.pipe';
import { BadgesService } from './badges.service';

class BadgeDto extends zodDto(badgeInputSchema) {}
class BadgeUpdateDto extends zodDto(badgeUpdateSchema) {}

@ApiTags('admin-badges')
@ApiBearerAuth()
@Roles(UserType.ADMIN)
@Controller('admin/badges')
export class BadgesController {
  constructor(private readonly badges: BadgesService) {}

  @Get()
  @RequirePermission(AdminPermission.USER_MANAGEMENT_VIEW)
  list(@CurrentUser() user: AuthPrincipal) {
    return this.badges.list(user);
  }

  @Get('awards')
  @RequirePermission(AdminPermission.USER_MANAGEMENT_VIEW)
  awards(@CurrentUser() user: AuthPrincipal) {
    return this.badges.awards(user.userId);
  }

  @Post()
  @RequirePermission(AdminPermission.USER_MANAGEMENT_EDIT)
  create(@Body() input: BadgeDto, @CurrentUser() user: AuthPrincipal) {
    return this.badges.create(input, user.userId);
  }

  @Patch(':id')
  @RequirePermission(AdminPermission.USER_MANAGEMENT_EDIT)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: BadgeUpdateDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.badges.update(id, input, user.userId);
  }

  @Delete(':id')
  @RequirePermission(AdminPermission.USER_MANAGEMENT_EDIT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.badges.remove(id, user.userId);
  }
}
