import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminPermission,
  UserType,
  hasAdminPermission,
} from '@purposemint/contracts';
import { CustomRole } from '../entities/custom-role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth-principal';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditService } from './audit.service';
import { filteredAuditQuery } from './audit-query';

@Controller('admin/audit-events')
@Roles(UserType.ADMIN)
export class AuditController {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly events: Repository<AuditEvent>,
    private readonly audit: AuditService,
    @InjectRepository(CustomRole)
    private readonly customRoles: Repository<CustomRole>,
  ) {}

  @Get()
  @RequirePermission(AdminPermission.AUDIT_LOGS_VIEW)
  async list(
    @Query() rawQuery: unknown,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    const qb = this.events.createQueryBuilder('event');
    const query = filteredAuditQuery(qb, rawQuery);
    const page = query.page;
    qb.select([
      'event.id',
      'event.actorUserId',
      'event.actorType',
      'event.action',
      'event.entityType',
      'event.entityId',
      'event.outcome',
      'event.createdAt',
    ]);
    const [items, total] = await qb
      .orderBy('event.createdAt', query.order === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('event.id', 'ASC')
      .skip((page - 1) * 25)
      .take(25)
      .getManyAndCount();
    const role = principal.customRoleId
      ? await this.customRoles.findOne({
          where: { id: principal.customRoleId },
        })
      : null;
    const canViewDetails = role
      ? hasAdminPermission(
          null,
          AdminPermission.AUDIT_LOGS_FULL,
          role.permissions,
        )
      : hasAdminPermission(
          principal.adminRole,
          AdminPermission.AUDIT_LOGS_FULL,
        );
    return { items, total, page, pageSize: 25, canViewDetails };
  }

  @Get(':id')
  @RequirePermission(AdminPermission.AUDIT_LOGS_FULL)
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const event = await this.events.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Audit event not found.');
    return { ...event, metadata: this.audit.sanitize(event.metadata) };
  }
}
