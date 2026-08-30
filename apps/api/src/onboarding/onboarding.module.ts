import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from '../dashboard/dashboard.module';
import { GoalTemplate } from '../entities/goal-template.entity';
import { HabitTemplate } from '../entities/habit-template.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { UserHabit } from '../entities/user-habit.entity';
import { UserValue } from '../entities/user-value.entity';
import { Value } from '../entities/value.entity';
import { UsersModule } from '../users/users.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Value,
      GoalTemplate,
      HabitTemplate,
      UserValue,
      UserGoal,
      UserHabit,
    ]),
    UsersModule,
    DashboardModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
