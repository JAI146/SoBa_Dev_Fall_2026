import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
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
import { UserValue } from '../entities/user-value.entity';
import { User } from '../entities/user.entity';
import { CustomRole } from '../entities/custom-role.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    TypeOrmModule.forFeature([
      User,
      CustomRole,
      UserGoal,
      UserHabit,
      UserValue,
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
