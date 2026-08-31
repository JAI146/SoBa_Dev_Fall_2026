import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  saveOnboardingGoalSchema,
  type DashboardPayload,
  type OnboardingContentResponse,
  type SaveOnboardingGoalInput,
} from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  SaveOnboardingHabitsDto,
  SaveOnboardingValuesDto,
} from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('content')
  @ApiOperation({ summary: 'Seeded wizard content plus the user’s progress' })
  content(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<OnboardingContentResponse> {
    return this.onboardingService.getContent(principal.userId);
  }

  @Post('values')
  @ApiOperation({ summary: 'Save the values chosen in the wizard' })
  saveValues(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: SaveOnboardingValuesDto,
  ): Promise<OnboardingContentResponse> {
    return this.onboardingService.saveValues(principal.userId, body);
  }

  @Post('goal')
  @ApiOperation({
    summary: 'Save the focus goal, a custom goal, or skip to habits',
  })
  saveGoal(
    @CurrentUser() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(saveOnboardingGoalSchema))
    body: SaveOnboardingGoalInput,
  ): Promise<OnboardingContentResponse> {
    return this.onboardingService.saveGoal(principal.userId, body);
  }

  @Post('habits')
  @ApiOperation({ summary: 'Save the habits chosen in the wizard' })
  saveHabits(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: SaveOnboardingHabitsDto,
  ): Promise<OnboardingContentResponse> {
    return this.onboardingService.saveHabits(principal.userId, body);
  }

  @Post('complete')
  @ApiOperation({
    summary: 'Mark onboarding done and return the dashboard payload',
  })
  complete(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<DashboardPayload> {
    return this.onboardingService.complete(principal.userId);
  }
}
