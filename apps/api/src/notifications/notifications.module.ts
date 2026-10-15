import { ReEngagementPlanner } from './re-engagement-planner.service';
import { NotificationEmailSender } from './notification-email.sender';
import { NotificationEmailService } from './notification-email.service';
import { MailModule } from '../mail/mail.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import {
  NotificationPreferencesController,
  NotificationOperationsController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';
@Module({
  imports: [AuditModule, MailModule],
  controllers: [
    NotificationPreferencesController,
    NotificationOperationsController,
  ],
  providers: [
    NotificationsService,
    ReEngagementPlanner,
    NotificationEmailSender,
    NotificationEmailService,
  ],
})
export class NotificationsModule {}
