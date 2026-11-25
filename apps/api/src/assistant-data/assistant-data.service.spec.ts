import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AdminPermission,
  AdminRole,
  UserStatus,
  UserType,
  employeeAuditDataQuerySchema,
  savingsProgressDataQuerySchema,
} from '@purposemint/contracts';
import { DataSource, EntityManager } from 'typeorm';
import type { AuthPrincipal } from '../auth/auth-principal';
import { AuditService } from '../audit/audit.service';
import { User } from '../entities/user.entity';
import { AdminUserPermission } from '../entities/admin-user-permission.entity';
import { AdminRolePermission } from '../entities/admin-role-permission.entity';
import { CustomRole } from '../entities/custom-role.entity';
import { AssistantDataService } from './assistant-data.service';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const EMPLOYEE = '22222222-2222-4222-8222-222222222222';
const CUSTOMER = '33333333-3333-4333-8333-333333333333';
const GOAL = '44444444-4444-4444-8444-444444444444';
const ENTRY = '55555555-5555-4555-8555-555555555555';
function builder() {
  return {
    clone: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(1),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
}
describe('assistant data tools', () => {
  let service: AssistantDataService;
  let actor: Partial<User>;
  let userOverride: { permissions: string[] } | null;
  let roleOverride: { permissions: string[] } | null;
  let customRole: { permissions: string[] } | null;
  let auditQuery: ReturnType<typeof builder>;
  let customerQuery: ReturnType<typeof builder>;
  let entryQuery: ReturnType<typeof builder>;
  let manager: {
    findOneBy: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let audit: AuditService;
  const principal: AuthPrincipal = {
    userId: ACTOR,
    sessionId: 'session',
    userType: UserType.ADMIN,
    adminRole: AdminRole.SUPER_ADMIN,
    customRoleId: null,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  };
  beforeEach(() => {
    actor = {
      id: ACTOR,
      userType: UserType.ADMIN,
      status: UserStatus.ACTIVE,
      adminRole: AdminRole.SUPER_ADMIN,
      customRoleId: null,
    };
    userOverride = null;
    roleOverride = null;
    customRole = null;
    auditQuery = builder();
    customerQuery = builder();
    entryQuery = builder();
    manager = {
      findOneBy: jest.fn((entity: unknown) => {
        if (entity === User) return Promise.resolve(actor);
        if (entity === AdminUserPermission)
          return Promise.resolve(userOverride);
        if (entity === AdminRolePermission)
          return Promise.resolve(roleOverride);
        if (entity === CustomRole) return Promise.resolve(customRole);
        throw new Error('Unexpected entity');
      }),
      findOne: jest.fn().mockResolvedValue({
        id: EMPLOYEE,
        firstName: 'Sam',
        lastName: 'Employee',
      }),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn((_entity: unknown, alias: string) =>
        alias === 'event'
          ? auditQuery
          : alias === 'entry'
            ? entryQuery
            : customerQuery,
      ),
    };
    const db = {
      transaction: jest.fn(
        (_level: string, callback: (em: EntityManager) => unknown) =>
          callback(manager as unknown as EntityManager),
      ),
    };
    audit = new AuditService({} as never);
    jest.spyOn(audit, 'record').mockResolvedValue();
    service = new AssistantDataService(db as unknown as DataSource, audit);
  });
  it('searches all actors by exact action and returns full counts alongside named events', async () => {
    auditQuery.getCount.mockResolvedValue(5);
    auditQuery.getRawMany
      .mockResolvedValueOnce([{ name: 'admin.badge_created', count: '5' }])
      .mockResolvedValueOnce([{ name: 'success', count: '5' }])
      .mockResolvedValueOnce([
        { name: 'System Admin', actorId: EMPLOYEE, count: '5' },
      ])
      .mockResolvedValueOnce([{ name: '2026-10-05', count: '5' }])
      .mockResolvedValueOnce([
        {
          id: GOAL,
          actorUserId: EMPLOYEE,
          actorType: 'admin',
          actorName: 'System Admin',
          actorRole: 'super_admin',
          action: 'admin.badge_created',
          entityType: 'badge',
          entityId: ENTRY,
          outcome: 'success',
          createdAt: new Date('2026-10-05T09:00:00Z'),
        },
      ]);
    const result = await service.getAuditReport(principal, {
      action: 'admin.badge_created',
      pageSize: 1,
    });
    expect(result.pagination).toMatchObject({ total: 5, hasMore: true });
    expect(result.summary).toMatchObject({
      total: 5,
      scope: 'all_matching_records_not_just_page',
      byActor: {
        items: [{ name: 'System Admin', actorId: EMPLOYEE, count: 5 }],
      },
    });
    expect(result.items[0].actorName).toBe('System Admin');
    expect(result.items[0].metadata).toBeUndefined();
    expect(auditQuery.andWhere).not.toHaveBeenCalledWith(
      'event.actorUserId = :employeeId',
      expect.anything(),
    );
    expect(auditQuery.andWhere).toHaveBeenCalledWith('event.action = :action', {
      action: 'admin.badge_created',
    });
  });
  it('rejects invented audit actions before querying and denies unauthorized reports', async () => {
    await expect(
      service.getAuditReport(principal, { action: 'create_badge' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    userOverride = { permissions: [] };
    await expect(service.getAuditReport(principal, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
  });
  it('requires full audit permission before selecting report metadata', async () => {
    userOverride = { permissions: [AdminPermission.AUDIT_LOGS_VIEW] };
    await expect(
      service.getAuditReport(principal, { includeDetails: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
  });
  it('rejects forged actors, bad dates and oversized requests', () => {
    for (const query of [
      { employeeId: EMPLOYEE, actorUserId: ACTOR },
      { employeeId: EMPLOYEE, from: '2026-02-30' },
      { employeeId: EMPLOYEE, from: '2026-11-02', to: '2026-11-01' },
      { employeeId: EMPLOYEE, includeDetails: 'yes' },
      { employeeId: EMPLOYEE, pageSize: 51 },
    ])
      expect(employeeAuditDataQuerySchema.safeParse(query).success).toBe(false);
    expect(
      savingsProgressDataQuerySchema.safeParse({ customerId: 'invalid' })
        .success,
    ).toBe(false);
    expect(
      savingsProgressDataQuerySchema.safeParse({ from: '2026-11-01' }).success,
    ).toBe(false);
    expect(
      employeeAuditDataQuerySchema.parse({
        employeeId: EMPLOYEE,
        includeDetails: 'false',
      }).includeDetails,
    ).toBe(false);
  });
  it('checks current account state before data queries', async () => {
    actor.status = UserStatus.SUSPENDED;
    await expect(service.getSavingsProgressData(principal, {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
  });
  it('honors individual revocation despite a super admin principal', async () => {
    userOverride = { permissions: [] };
    await expect(
      service.getEmployeeAuditData(principal, { employeeId: EMPLOYEE }),
    ).rejects.toThrow(ForbiddenException);
    expect(manager.findOne).not.toHaveBeenCalled();
  });
  it('honors built-in role overrides', async () => {
    roleOverride = { permissions: [AdminPermission.USER_MANAGEMENT_VIEW] };
    await expect(service.getSavingsProgressData(principal, {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
  });
  it('fails closed when an assigned custom role no longer exists', async () => {
    actor.customRoleId = 'deleted-role';
    await expect(
      service.getEmployeeAuditData(principal, { employeeId: EMPLOYEE }),
    ).rejects.toThrow(ForbiddenException);
  });
  it('requires both financial and user-view permission', async () => {
    for (const permission of [
      AdminPermission.FINANCIAL_DATA_VIEW,
      AdminPermission.USER_MANAGEMENT_VIEW,
    ]) {
      userOverride = { permissions: [permission] };
      await expect(
        service.getSavingsProgressData(principal, {}),
      ).rejects.toThrow(ForbiddenException);
    }
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
  });
  const event = () => ({
    id: ENTRY,
    actorUserId: EMPLOYEE,
    actorType: 'admin',
    action: 'admin.user_viewed',
    entityType: 'user',
    entityId: CUSTOMER,
    outcome: 'success',
    createdAt: new Date('2026-11-01T12:00:00Z'),
    ipAddress: '127.0.0.1',
    metadata: { nested: { password: 'secret', status: 'active' } },
  });
  it('excludes metadata and IP in summary mode and paginates by employee', async () => {
    userOverride = { permissions: [AdminPermission.AUDIT_LOGS_VIEW] };
    auditQuery.getManyAndCount.mockResolvedValue([[event()], 60]);
    const result = await service.getEmployeeAuditData(principal, {
      employeeId: EMPLOYEE,
      from: '2026-11-01',
      to: '2026-11-01',
      page: 2,
    });
    expect(result.items[0]).not.toHaveProperty('metadata');
    expect(result.items[0]).not.toHaveProperty('ipAddress');
    expect(auditQuery.addSelect).not.toHaveBeenCalled();
    expect(auditQuery.where).toHaveBeenCalledWith(
      'event.actorUserId = :employeeId',
      { employeeId: EMPLOYEE },
    );
    expect(auditQuery.skip).toHaveBeenCalledWith(25);
    expect(result.pagination.hasMore).toBe(true);
    expect(auditQuery.andWhere).toHaveBeenCalledWith(
      'event.createdAt < :until',
      { until: new Date('2026-11-02T00:00:00Z') },
    );
  });
  it('requires full audit permission for detail requests', async () => {
    userOverride = { permissions: [AdminPermission.AUDIT_LOGS_VIEW] };
    await expect(
      service.getEmployeeAuditData(principal, {
        employeeId: EMPLOYEE,
        includeDetails: true,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(manager.findOne).not.toHaveBeenCalled();
  });
  it('sanitizes authorized details and excludes raw entity fields', async () => {
    auditQuery.getManyAndCount.mockResolvedValue([[event()], 1]);
    const result = await service.getEmployeeAuditData(principal, {
      employeeId: EMPLOYEE,
      includeDetails: true,
    });
    expect(result.items[0].metadata).toEqual({ nested: { status: 'active' } });
    expect(result.items[0]).not.toHaveProperty('ipAddress');
  });
  it('returns savings screen data, exact progress and independently paginated entries', async () => {
    customerQuery.getRawMany.mockResolvedValue([
      {
        id: CUSTOMER,
        firstName: 'Taylor',
        lastName: 'Customer',
        email: 'taylor@example.com',
        savedAmount: '0.30',
        targetAmount: '1.00',
        goalCount: '1',
        pathwayEligible: false,
      },
    ]);
    manager.findAndCount.mockResolvedValue([
      [
        {
          id: GOAL,
          title: 'Savings goal',
          savedAmount: 0.3,
          targetAmount: 1,
          isPathwayEligible: false,
          isFocus: true,
          isActive: true,
        },
      ],
      1,
    ]);
    entryQuery.getManyAndCount.mockResolvedValue([
      [
        {
          id: ENTRY,
          userGoalId: GOAL,
          amount: 0.3,
          note: 'private',
          createdAt: new Date('2026-11-01T12:00:00Z'),
        },
      ],
      70,
    ]);
    const result = await service.getSavingsProgressData(principal, {
      customerId: CUSTOMER,
      from: '2026-11-01',
      to: '2026-11-01',
      entryPage: 2,
    });
    expect(result.customers.items[0]).toMatchObject({
      remainingAmount: 0.7,
      progressPercent: 30,
    });
    expect(result.goals.items[0]).toMatchObject({
      remainingAmount: 0.7,
      progressPercent: 30,
    });
    expect(result.entries.items[0]).not.toHaveProperty('note');
    expect(result.entries.pagination.hasMore).toBe(true);
    expect(entryQuery.skip).toHaveBeenCalledWith(25);
    expect(result.filters.dateFilterAppliesTo).toBe(
      'entries_only_current_balances_are_all_time',
    );
    expect(result.verification).toBe('self_reported_not_bank_verified');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: ACTOR,
        entityType: 'assistant_savings_progress',
        entityId: CUSTOMER,
      }),
    );
  });
  it('paginates customer summaries without loading all customer details', async () => {
    customerQuery.getCount.mockResolvedValue(100);
    customerQuery.getRawMany.mockResolvedValue([
      {
        id: CUSTOMER,
        firstName: 'No',
        lastName: 'Goals',
        email: 'zero@example.com',
        savedAmount: '0',
        targetAmount: '0',
        goalCount: '0',
        pathwayEligible: false,
      },
    ]);
    const result = await service.getSavingsProgressData(principal, {
      page: 2,
      pageSize: 10,
    });
    expect(customerQuery.offset).toHaveBeenCalledWith(10);
    expect(customerQuery.limit).toHaveBeenCalledWith(10);
    expect(manager.findAndCount).not.toHaveBeenCalled();
    expect(result.customers.items[0].progressPercent).toBeNull();
    expect(result.customers.pagination.total).toBe(100);
  });
  it('rejects malformed input before querying the database', async () => {
    await expect(
      service.getSavingsProgressData(principal, { from: 'yesterday' }),
    ).rejects.toThrow(BadRequestException);
    expect(manager.findOneBy).not.toHaveBeenCalled();
  });
});
