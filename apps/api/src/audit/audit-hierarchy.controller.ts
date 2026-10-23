import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminPermission, UserType } from '@purposemint/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { User } from '../entities/user.entity';
import { AuditEvent } from '../entities/audit-event.entity';
import { CustomRole } from '../entities/custom-role.entity';
import { filteredAuditQuery } from './audit-query';

@Controller('admin/audit-hierarchy')
@Roles(UserType.ADMIN)
@RequirePermission(AdminPermission.AUDIT_LOGS_VIEW)
export class AuditHierarchyController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuditEvent)
    private readonly events: Repository<AuditEvent>,
    @InjectRepository(CustomRole)
    private readonly customRoles: Repository<CustomRole>,
  ) {}

  @Get()
  async hierarchy(@Query() rawQuery: unknown) {
    const qb = this.events.createQueryBuilder('event');
    filteredAuditQuery(qb, rawQuery);
    const counts = await qb
      .select('event.actorUserId', 'actorId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.actorUserId')
      .getRawMany<{ actorId: string | null; count: string }>();
    const matched = new Map(
      counts.map((row) => [row.actorId, Number(row.count)]),
    );
    const users = await this.users.find({
      where: { userType: UserType.ADMIN },
      order: { firstName: 'ASC', id: 'ASC' },
    });
    const roles = await this.customRoles.find();
    const roleNames = new Map(roles.map((role) => [role.id, role.name]));
    return {
      users: users.map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.adminRole ?? 'unassigned',
        roleLabel: user.customRoleId
          ? (roleNames.get(user.customRoleId) ?? 'Custom role')
          : (user.adminRole ?? 'Unassigned'),
        reportsToUserId: user.reportsToUserId,
        status: user.status,
        matchCount: matched.get(user.id) ?? 0,
      })),
    };
  }
}
