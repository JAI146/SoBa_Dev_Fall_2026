import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { CreateUpgradeIntentDto } from './dto/subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('plans')
  list(@CurrentUser() principal: AuthPrincipal) {
    return this.service.list(principal.userId);
  }

  @Post('upgrade-intent')
  upgradeIntent(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: CreateUpgradeIntentDto,
  ) {
    return this.service.recordUpgradeIntent(principal.userId, body);
  }
}
