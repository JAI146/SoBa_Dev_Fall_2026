import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserType } from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BadgesService } from './badges.service';

@ApiTags('badges')
@ApiBearerAuth()
@Roles(UserType.CUSTOMER)
@Controller('badges')
export class UserBadgesController {
  constructor(private readonly badges: BadgesService) {}
  @Get()
  earned(@CurrentUser() user: AuthPrincipal) {
    return this.badges.earned(user.userId);
  }
}
