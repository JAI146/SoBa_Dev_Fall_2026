import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditService } from './audit.service';

/**
 * Both `auth` and `users` write audit events. Keeping the writer in its own
 * module means neither has to depend on the other to do it.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
