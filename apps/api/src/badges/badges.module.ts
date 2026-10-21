import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { BadgeEvaluationService } from './badge-evaluation.service';
import { UserBadgesController } from './user-badges.controller';

@Module({
  imports: [AuditModule],
  controllers: [BadgesController, UserBadgesController],
  providers: [BadgesService, BadgeEvaluationService],
  exports: [BadgeEvaluationService],
})
export class BadgesModule {}
