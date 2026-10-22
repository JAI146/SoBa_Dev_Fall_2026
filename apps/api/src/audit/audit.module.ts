import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { CustomRole } from '../entities/custom-role.entity';
import { User } from '../entities/user.entity';
import { AuditHierarchyController } from './audit-hierarchy.controller';

/**
 * Both `auth` and `users` write audit events. Keeping the writer in its own
 * module means neither has to depend on the other to do it.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent, CustomRole, User])],
  providers: [AuditService],
  controllers: [AuditController, AuditHierarchyController],
  exports: [AuditService],
})
export class AuditModule {}
