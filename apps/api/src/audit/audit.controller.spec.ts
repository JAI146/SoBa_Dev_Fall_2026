import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import {
  AdminPermission,
  AdminRole,
  UserType,
  UserStatus,
} from '@purposemint/contracts';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditEvent } from '../entities/audit-event.entity';
import { CustomRole } from '../entities/custom-role.entity';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import type { AuthPrincipal } from '../auth/auth-principal';

describe('audit reader', () => {
  const principal: AuthPrincipal = {
    userId: 'admin',
    sessionId: 'session',
    userType: UserType.ADMIN,
    adminRole: AdminRole.MANAGER,
    customRoleId: null,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  };
  const qb = {
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  const events = { createQueryBuilder: jest.fn(() => qb), findOne: jest.fn() };
  const customRoles = { findOne: jest.fn() };
  const service = new AuditService({} as Repository<AuditEvent>);
  const controller = new AuditController(
    events as unknown as Repository<AuditEvent>,
    service,
    customRoles as unknown as Repository<CustomRole>,
  );
  beforeEach(() => jest.clearAllMocks());

  it('requires summary permission for lists and full permission for metadata', () => {
    const reflector = new Reflector();
    const list = Object.getOwnPropertyDescriptor(
      AuditController.prototype,
      'list',
    )!.value as () => void;
    const detail = Object.getOwnPropertyDescriptor(
      AuditController.prototype,
      'detail',
    )!.value as () => void;
    expect(reflector.get(PERMISSIONS_KEY, list)).toEqual([
      AdminPermission.AUDIT_LOGS_VIEW,
    ]);
    expect(reflector.get(PERMISSIONS_KEY, detail)).toEqual([
      AdminPermission.AUDIT_LOGS_FULL,
    ]);
  });
  it('selects no metadata or IP in summary queries and paginates deterministically', async () => {
    const response = await controller.list(
      { page: '2', action: 'admin.user_viewed' },
      principal,
    );
    expect(qb.skip).toHaveBeenCalledWith(25);
    expect(qb.select).toHaveBeenCalledWith(
      expect.not.arrayContaining(['event.metadata']),
    );
    expect(qb.select).toHaveBeenCalledWith(
      expect.not.arrayContaining(['event.ipAddress']),
    );
    expect(response.canViewDetails).toBe(false);
  });
  it('uses current custom-role permissions for detail visibility', async () => {
    customRoles.findOne.mockResolvedValue({
      permissions: [AdminPermission.AUDIT_LOGS_FULL],
    });
    expect(
      (await controller.list({}, { ...principal, customRoleId: 'role' }))
        .canViewDetails,
    ).toBe(true);
    customRoles.findOne.mockResolvedValue({
      permissions: [AdminPermission.AUDIT_LOGS_VIEW],
    });
    expect(
      (await controller.list({}, { ...principal, customRoleId: 'role' }))
        .canViewDetails,
    ).toBe(false);
  });
  it.each([
    { page: '-1' },
    { page: '1.2' },
    { from: '2026-02-30' },
    { from: '2026-10-15', to: '2026-10-01' },
    { outcome: 'unexpected' },
  ])('rejects invalid filters %j', async (query) => {
    await expect(controller.list(query, principal)).rejects.toThrow();
  });
  it('sanitizes historical metadata on reads', async () => {
    events.findOne.mockResolvedValue({
      id: 'event',
      metadata: { nested: { password: 'private', status: 'active' } },
    });
    expect((await controller.detail('event')).metadata).toEqual({
      nested: { status: 'active' },
    });
  });
  it('reports missing events', async () => {
    events.findOne.mockResolvedValue(null);
    await expect(controller.detail('missing')).rejects.toThrow(
      'Audit event not found.',
    );
  });
});
