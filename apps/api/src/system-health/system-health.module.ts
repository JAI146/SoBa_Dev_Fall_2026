import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SystemHealthController } from './system-health.controller';
import { SystemHealthService } from './system-health.service';
@Module({
  imports: [AuditModule],
  controllers: [SystemHealthController],
  providers: [SystemHealthService],
})
export class SystemHealthModule {}
