import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PathwayManagementService } from './pathway-management.service';
import { PathwayManagementController } from './pathway-management.controller';

@Module({
  imports: [AuditModule],
  providers: [PathwayManagementService],
  controllers: [PathwayManagementController],
})
export class PathwayManagementModule {}
