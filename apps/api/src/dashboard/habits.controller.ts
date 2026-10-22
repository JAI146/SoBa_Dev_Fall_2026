import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  habitPauseSchema,
  type HabitPauseInput,
  type HabitCompleteResponse,
} from '@purposemint/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { DashboardService } from './dashboard.service';
import { UpdateHabitsDto } from './dto/dashboard.dto';

@ApiTags('habits')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('habits')
export class HabitsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Patch()
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: UpdateHabitsDto,
  ) {
    return this.dashboardService.updateHabits(principal.userId, body);
  }

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

  @Patch(':userHabitId/pause')
  @ApiOperation({ summary: 'Explicitly pause or resume a selected habit' })
  pause(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userHabitId', ParseUUIDPipe) userHabitId: string,
    @Body(new ZodValidationPipe(habitPauseSchema)) body: HabitPauseInput,
  ) {
    return this.dashboardService.setHabitPause(
      principal.userId,
      userHabitId,
      body,
    );
  }
}
