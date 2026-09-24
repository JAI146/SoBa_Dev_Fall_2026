/**
 * Registers the isolated incentives controller, mutation service, and reports.
 * Imports shared auditing without adding incentive logic to the existing admin module.
 */
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { IncentivesController } from './incentives.controller';
import { IncentivesService } from './incentives.service';
import { IncentivesQueries } from './incentives.queries';

@Module({
  imports: [AuditModule],
  controllers: [IncentivesController],
  providers: [IncentivesService, IncentivesQueries],
  exports: [IncentivesService],
})
export class IncentivesModule {}
