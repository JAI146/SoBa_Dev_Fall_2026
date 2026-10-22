/* Jest matchers are dynamically typed; reflection reads method metadata without invoking it. */
/* eslint @typescript-eslint/unbound-method: "off", @typescript-eslint/no-unsafe-assignment: "off" */
import 'reflect-metadata';
import {
  AdminPermission,
  AdminRole,
  UserStatus,
  UserType,
  healthReportInputSchema,
  systemHealthResponseSchema,
  type HealthReport,
} from '@purposemint/contracts';
import type { DataSource } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { SystemHealthController } from './system-health.controller';
import {
  SystemHealthService,
  providerServices,
  overallHealth,
  REPORT_TTL_MS,
} from './system-health.service';
const now = new Date('2026-10-11T14:00:00Z');
const report: HealthReport = {
  id: '00000000-0000-4000-8000-000000000001',
  serviceId: 'synctera_kyc',
  status: 'degraded',
  category: 'provider',
  affectedUserId: null,
  summary: 'Verified provider incident affects KYC.',
  recordedAt: now.toISOString(),
  stale: false,
};
const principal: AuthPrincipal = {
  userId: report.id,
  sessionId: report.id,
  userType: UserType.ADMIN,
  adminRole: AdminRole.SUPER_ADMIN,
  customRoleId: null,
  status: UserStatus.ACTIVE,
  emailVerified: true,
};
function database(query = jest.fn().mockResolvedValue([])) {
  const qb = {
    distinctOn: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest
      .fn<Promise<{ metadata: { current: HealthReport } } | null>, []>()
      .mockResolvedValue(null),
  };
  const repo = {
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => qb),
    findOneBy: jest.fn().mockResolvedValue(null),
    existsBy: jest.fn().mockResolvedValue(true),
  };
  const manager = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn(() => repo),
  };
  const db = {
    query,
    getRepository: jest.fn(() => repo),
    transaction: jest.fn(async (work: (m: typeof manager) => Promise<void>) =>
      work(manager),
    ),
  };
  return { db: db as unknown as DataSource, query, repo, manager, qb };
}
describe('system/provider health', () => {
  it('does not mark unmonitored providers healthy', () => {
    expect(providerServices([], now)).toHaveLength(5);
    expect(
      providerServices([], now).every(
        (s) =>
          s.status === 'action_required' &&
          s.source === 'not_monitored' &&
          s.checkedAt === null,
      ),
    ).toBe(true);
  });
  it('uses current staff evidence and expires it exactly at 24 hours', () => {
    expect(providerServices([report], now)[0].status).toBe('degraded');
    const expired = providerServices(
      [report],
      new Date(now.getTime() + REPORT_TTL_MS),
    )[0];
    expect(expired).toMatchObject({
      status: 'action_required',
      source: 'staff_report',
      stale: true,
    });
  });
  it('keeps customer failures separate from provider-wide health', () => {
    const result = providerServices(
      [
        {
          ...report,
          status: 'failed',
          category: 'user_specific',
          affectedUserId: report.id,
        },
        { ...report, status: 'healthy' },
      ],
      now,
    );
    expect(result[0].status).toBe('healthy');
  });
  it('prioritizes failed, then action required, then degraded', () => {
    const services = providerServices([report], now);
    expect(overallHealth(services)).toBe('action_required');
    expect(
      overallHealth([{ ...services[0], status: 'failed' }, ...services]),
    ).toBe('failed');
    expect(overallHealth([{ ...services[0], status: 'degraded' }])).toBe(
      'degraded',
    );
    expect(overallHealth([{ ...services[0], status: 'healthy' }])).toBe(
      'healthy',
    );
  });
  it('validates user scope, unknown services and bounded summaries', () => {
    const input = {
      serviceId: report.serviceId,
      status: report.status,
      category: report.category,
      affectedUserId: report.affectedUserId,
      summary: report.summary,
    };
    expect(healthReportInputSchema.safeParse(input).success).toBe(true);
    expect(
      healthReportInputSchema.safeParse({ ...input, category: 'user_specific' })
        .success,
    ).toBe(false);
    expect(
      healthReportInputSchema.safeParse({ ...input, affectedUserId: report.id })
        .success,
    ).toBe(false);
    expect(
      healthReportInputSchema.safeParse({
        ...input,
        serviceId: 'arbitrary_url',
      }).success,
    ).toBe(false);
    expect(
      healthReportInputSchema.safeParse({ ...input, summary: 'x'.repeat(301) })
        .success,
    ).toBe(false);
  });
  it('requires admin settings permissions on both endpoints', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SystemHealthController)).toEqual([
      UserType.ADMIN,
    ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        SystemHealthController.prototype.overview,
      ),
    ).toEqual([AdminPermission.SETTINGS_LIMITED]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        SystemHealthController.prototype.report,
      ),
    ).toEqual([AdminPermission.SETTINGS_FULL]);
  });
  it('returns a valid measured snapshot and shares its read-only check', async () => {
    const { db, query } = database();
    const service = new SystemHealthService(db, {} as AuditService);
    const [a, b] = await Promise.all([
      service.overview(principal),
      service.overview({ ...principal, adminRole: AdminRole.MANAGER }),
    ]);
    expect(systemHealthResponseSchema.safeParse(a).success).toBe(true);
    expect(a.services[1].status).toBe('healthy');
    expect(a.canReport).toBe(true);
    expect(b.canReport).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('reports database failure without exposing raw connection errors', async () => {
    const { db } = database(
      jest.fn().mockRejectedValue(new Error('secret database credential')),
    );
    const result = await new SystemHealthService(
      db,
      {} as AuditService,
    ).overview(principal);
    expect(result.overallStatus).toBe('failed');
    expect(result.reportsAvailable).toBe(false);
    expect(JSON.stringify(result)).not.toContain('secret database credential');
  });
  it('marks report-history failure as unavailable instead of inventing healthy providers', async () => {
    const { db, repo } = database();
    repo.find.mockRejectedValueOnce(new Error('offline'));
    const result = await new SystemHealthService(
      db,
      {} as AuditService,
    ).overview(principal);
    expect(result.reportsAvailable).toBe(false);
    expect(
      result.services.slice(2).every((s) => s.status === 'action_required'),
    ).toBe(true);
  });
  it('commits staff observations transactionally with the actor and previous state', async () => {
    const { db, manager, qb } = database();
    qb.getOne.mockResolvedValueOnce({ metadata: { current: report } });
    const audit = {
      recordTransactional: jest.fn().mockResolvedValue(undefined),
    };
    await new SystemHealthService(db, audit as unknown as AuditService).report(
      principal,
      {
        serviceId: 'synctera_kyc',
        status: 'healthy',
        category: 'provider',
        affectedUserId: null,
        summary: 'Provider incident resolved and verified.',
      },
    );
    expect(audit.recordTransactional).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        actorUserId: principal.userId,
        metadata: expect.objectContaining({
          previous: report,
          current: expect.objectContaining({ status: 'healthy' }),
        }),
      }),
    );
  });
  it('rejects nonexistent affected customers without writing an observation', async () => {
    const { db, repo } = database();
    repo.existsBy.mockResolvedValue(false);
    const audit = { recordTransactional: jest.fn() };
    await expect(
      new SystemHealthService(db, audit as unknown as AuditService).report(
        principal,
        {
          serviceId: 'notifications',
          status: 'failed',
          category: 'user_specific',
          affectedUserId: report.id,
          summary: 'Customer delivery incident verified.',
        },
      ),
    ).rejects.toThrow('Customer not found');
    expect(audit.recordTransactional).not.toHaveBeenCalled();
  });
});
