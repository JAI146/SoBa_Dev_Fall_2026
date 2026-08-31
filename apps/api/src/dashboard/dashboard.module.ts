import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { GoalTemplate } from '../entities/goal-template.entity';
import { HabitTemplate } from '../entities/habit-template.entity';
import { Value } from '../entities/value.entity';
import { SavingsEntry } from '../entities/savings-entry.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { UserHabit } from '../entities/user-habit.entity';
import { UserValue } from '../entities/user-value.entity';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { GoalsController } from './goals.controller';
import { GoalCreationService } from './goal-creation.service';
import { HabitsController } from './habits.controller';
import { SavingsController } from './savings.controller';
import { ValuesController } from './values.controller';
import { ReflectionsModule } from '../reflections/reflections.module';
import { Pathway } from '../entities/pathway.entity';
import { PathwayApplication } from '../entities/pathway-application.entity';
import { CommunityChallengesModule } from '../community-challenges/community-challenges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserValue,
      GoalTemplate,
      HabitTemplate,
      Value,
      UserGoal,
      UserHabit,
      HabitCompletion,
      SavingsEntry,
      Pathway,
      PathwayApplication,
    ]),
    UsersModule,
    ReflectionsModule,
    CommunityChallengesModule,
  ],
  controllers: [
    DashboardController,
    HabitsController,
    SavingsController,
    GoalsController,
    ValuesController,
  ],
  providers: [DashboardService, GoalCreationService],
  exports: [DashboardService, GoalCreationService],
})
export class DashboardModule {}
