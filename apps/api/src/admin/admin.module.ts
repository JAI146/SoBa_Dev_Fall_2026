import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { PathwayApplication } from '../entities/pathway-application.entity';
import { PathwayChecklistItem } from '../entities/pathway-checklist-item.entity';
import { Pathway } from '../entities/pathway.entity';
import { Reflection } from '../entities/reflection.entity';
import { SavingsEntry } from '../entities/savings-entry.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { UpgradeIntent } from '../entities/upgrade-intent.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { UserHabit } from '../entities/user-habit.entity';
import { User } from '../entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([
      User,
      UserGoal,
      UserHabit,
      HabitCompletion,
      SavingsEntry,
      Reflection,
      Pathway,
      PathwayApplication,
      PathwayChecklistItem,
      UpgradeIntent,
      SubscriptionPlan,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
