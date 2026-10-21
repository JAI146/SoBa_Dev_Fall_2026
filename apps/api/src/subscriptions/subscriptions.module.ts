import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { UpgradeIntent } from '../entities/upgrade-intent.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionManagementModule } from '../subscription-management/subscription-management.module';

@Module({
  imports: [
    SubscriptionManagementModule,
    TypeOrmModule.forFeature([SubscriptionPlan, UpgradeIntent]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
