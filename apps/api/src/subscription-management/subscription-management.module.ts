import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { UserSubscription } from '../entities/user-subscription.entity';
import { SubscriptionHistory } from '../entities/subscription-history.entity';
import { SubscriptionBillingRecord } from '../entities/subscription-billing-record.entity';
import { SubscriptionManagementController } from './subscription-management.controller';
import { SubscriptionManagementService } from './subscription-management.service';

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      UserSubscription,
      SubscriptionHistory,
      SubscriptionBillingRecord,
    ]),
  ],
  controllers: [SubscriptionManagementController],
  providers: [SubscriptionManagementService],
  exports: [SubscriptionManagementService],
})
export class SubscriptionManagementModule {}
