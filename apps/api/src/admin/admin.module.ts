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
import { AdminRolePermission } from '../entities/admin-role-permission.entity';
import { AdminUserPermission } from '../entities/admin-user-permission.entity';
import { KycVerification } from '../entities/kyc-verification.entity';
import { AuditEvent } from '../entities/audit-event.entity';
import { AdminController } from './admin.controller';
import { AdminKycService } from './admin-kyc.service';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    TypeOrmModule.forFeature([
      User,
      CustomRole,
      AdminRolePermission,
      AdminUserPermission,
      KycVerification,
      AuditEvent,
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
  providers: [AdminService, AdminKycService],
})
export class AdminModule {}
