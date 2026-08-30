import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CreateSavingsResponse } from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { CreateSavingsDto } from './dto/dashboard.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('savings')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('savings')
export class SavingsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post()
  @ApiOperation({ summary: 'Log a manual savings amount against a goal' })
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: CreateSavingsDto,
  ): Promise<CreateSavingsResponse> {
    return this.dashboardService.addSavings(principal.userId, body);
  }
}
