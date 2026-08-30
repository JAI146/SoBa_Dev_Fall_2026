import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HabitCompleteResponse } from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('habits')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('habits')
export class HabitsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post(':userHabitId/complete')
  @ApiOperation({ summary: "Toggle today's completion for a selected habit" })
  complete(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userHabitId', ParseUUIDPipe) userHabitId: string,
  ): Promise<HabitCompleteResponse> {
    return this.dashboardService.toggleHabitCompletion(
      principal.userId,
      userHabitId,
    );
  }
}
