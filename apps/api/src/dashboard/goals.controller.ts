import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createGoalSchema,
  type CreateGoalInput,
  type GoalsListResponse,
  type UserGoalPublic,
} from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UpdateGoalDto } from './dto/dashboard.dto';
import { DashboardService } from './dashboard.service';
import { GoalCreationService } from './goal-creation.service';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly goalCreationService: GoalCreationService,
  ) {}

  @Get()
  @ApiOperation({ summary: "The signed-in user's savings goals" })
  list(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<GoalsListResponse> {
    return this.dashboardService.listGoals(principal.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a savings goal' })
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createGoalSchema)) body: CreateGoalInput,
  ): Promise<UserGoalPublic> {
    return this.goalCreationService.create(principal.userId, body, {
      markOnboardingProgress: false,
      replaceFocus: false,
    });
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
