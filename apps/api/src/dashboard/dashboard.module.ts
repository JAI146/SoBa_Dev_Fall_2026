import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { SavingsEntry } from '../entities/savings-entry.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { UserHabit } from '../entities/user-habit.entity';
import { UserValue } from '../entities/user-value.entity';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { GoalsController } from './goals.controller';
import { HabitsController } from './habits.controller';
import { SavingsController } from './savings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserValue,
      UserGoal,
      UserHabit,
      HabitCompletion,
      SavingsEntry,
    ]),
    UsersModule,
  ],
  controllers: [
    DashboardController,
    HabitsController,
    SavingsController,
    GoalsController,
  ],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
