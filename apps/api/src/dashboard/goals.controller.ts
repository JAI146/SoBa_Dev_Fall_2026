import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  GoalsListResponse,
  UserGoalPublic,
} from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { UpdateGoalDto } from './dto/dashboard.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: "The signed-in user's savings goals" })
  list(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<GoalsListResponse> {
    return this.dashboardService.listGoals(principal.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Make this goal the current focus' })
  setFocus(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: UpdateGoalDto,
  ): Promise<UserGoalPublic> {
    return this.dashboardService.setFocusGoal(principal.userId, id);
  }
}
