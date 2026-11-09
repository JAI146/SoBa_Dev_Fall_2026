import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import type { Env } from '../config/env.validation';
import type { AuthPrincipal } from '../auth/auth-principal';
import { AssistantToolsService } from './assistant-tools.service';
import { assistantToolSpecs } from './assistant-tools.catalog';
import {
  boundToolData,
  addReportDatasets,
  filterReportCollections,
} from './assistant-tool-output';
import { buildAssistantChart } from './assistant-chart';

const ID = '11111111-1111-4111-8111-111111111111';
const actor = {
  id: ID,
  email: 'admin@example.com',
  firstName: 'System',
  lastName: 'Admin',
  profileImageUrl: null,
  country: null,
  state: null,
  city: null,
  timeZone: 'UTC',
  userType: 'admin',
  adminRole: 'super_admin',
  status: 'active',
  displayName: null,
  onboardingStatus: 'completed',
  onboardingCompletedAt: null,
  tier: 'free',
  emailVerifiedAt: null,
  lastLoginAt: null,
  deleteAccountRequestedAt: null,
  notificationPreferences: {
    productUpdates: true,
    goalReminders: true,
    weeklyCheckIn: true,
    securityAlerts: true,
  },
  policyAgreements: {},
  createdAt: '2026-01-01T00:00:00.000Z',
};
const principal = { userId: ID } as AuthPrincipal;
const overview = {
  totalUsers: 3,
  usersByTier: [],
  onboardingCompletionRate: 50,
  submittedPathwayApplications: 0,
  pathwayApplicationsByPathway: [],
  upgradeIntentsByPlan: [],
  activeUsers: { count: 1, windowDays: 30 },
  newUsers: { count: 1, windowDays: 7 },
  totalGoalsCreated: 2,
  activeHabits: 1,
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });

describe('dashboard tool access boundary', () => {
  const original = global.fetch;
  const service = new AssistantToolsService(
    new ConfigService({ PORT: 4000 }) as unknown as ConfigService<Env, true>,
  );
  const execute = (name: string, input: unknown = {}) =>
    service.execute(
      name,
      input,
      principal,
      'Bearer signed.session.token',
      new Map(),
      'report1',
    );
  afterEach(() => {
    global.fetch = original;
  });
  it.each(assistantToolSpecs.map((s) => s.name))(
    'fails closed on dashboard denial for %s',
    async (name) => {
      const mock = jest
        .fn()
        .mockResolvedValueOnce(json(actor))
        .mockResolvedValueOnce(json({ secret: 'backend-error-body' }, 403));
      global.fetch = mock;
      await expect(execute(name)).rejects.toBeInstanceOf(ForbiddenException);
      expect(mock).toHaveBeenCalledTimes(2);
      for (const [url, options] of mock.mock.calls) {
        expect(String(url).startsWith('http://127.0.0.1:4000/api/')).toBe(true);
        expect(options.method).toBe('GET');
        expect(options.headers.Authorization).toBe(
          'Bearer signed.session.token',
        );
        expect(options.redirect).toBe('error');
      }
    },
  );
  it('rejects arbitrary routes, identity arguments and invalid IDs before any network access', async () => {
    global.fetch = jest.fn();
    for (const [name, args] of [
      ['http://evil.example', {}],
      ['get_customer_report', { url: 'http://evil.example' }],
      ['get_customer_report', { customerId: '../../settings' }],
      ['get_audit_report', { authorization: 'Bearer stolen' }],
    ])
      await expect(execute(name as string, args)).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('strips unexpected backend fields via the dashboard response schema', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(json(actor))
      .mockResolvedValueOnce(
        json({
          ...overview,
          passwordHash: 'PRIVATE',
          internalQuery: 'PRIVATE',
        }),
      );
    const result = await execute('get_dashboard_overview');
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(result.data).toMatchObject({ overview: { totalUsers: 3 } });
  });
  it('rechecks the actor and stops when identity or access changes', async () => {
    for (const changed of [
      { ...actor, status: 'suspended' },
      { ...actor, userType: 'customer', adminRole: null },
      { ...actor, id: '22222222-2222-4222-8222-222222222222' },
    ]) {
      const mock = jest.fn().mockResolvedValue(json(changed));
      global.fetch = mock;
      await expect(execute('get_dashboard_overview')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mock).toHaveBeenCalledTimes(1);
    }
  });
  it('does not release partial staff data or chart datasets when a related permission is denied', async () => {
    const mock = jest
      .fn()
      .mockResolvedValueOnce(json(actor))
      .mockResolvedValueOnce(json({ items: [] }))
      .mockResolvedValueOnce(json({ detail: 'private' }, 403));
    global.fetch = mock;
    const datasets = new Map();
    await expect(
      service.execute(
        'get_staff_access_report',
        {},
        principal,
        'Bearer signed.session.token',
        datasets,
        'report',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(datasets.size).toBe(0);
    expect(String(mock.mock.calls[1][0])).toContain('/admin/role-permissions');
  });
  it('rejects malformed and oversized dashboard responses without leaking their contents', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(json(actor))
      .mockResolvedValueOnce(json({ private: 'unexpected' }));
    await expect(execute('get_dashboard_overview')).rejects.toThrow(
      'format could not be validated',
    );
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(json(actor))
      .mockResolvedValueOnce(new Response('x'.repeat(1000001)));
    await expect(execute('get_dashboard_overview')).rejects.toThrow(
      'too large',
    );
  });
  it('requires notification page access before reading masked email settings', async () => {
    const mock = jest
      .fn()
      .mockResolvedValueOnce(json(actor))
      .mockResolvedValueOnce(json({}, 403));
    global.fetch = mock;
    await expect(
      execute('get_notification_report', { section: 'email' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(String(mock.mock.calls[1][0])).toContain('/admin/notifications');
  });
});

describe('bounded model data and charts', () => {
  it('redacts credential keys and recognizable credentials, and explicitly marks truncation', () => {
    const result = boundToolData({
      items: Array.from({ length: 55 }, (_, i) => ({
        name: 'Customer ' + i,
        savedAmount: i,
      })),
      metadata: {
        password: 'secret',
        Authorization: 'Bearer hidden',
        message: 'key sk-proj-abcdefghijklmnopqrstuvwx',
      },
      longText: 'x'.repeat(5000),
    });
    expect(JSON.stringify(result.data)).not.toContain(
      'abcdefghijklmnopqrstuvwx',
    );
    expect(JSON.stringify(result.data)).not.toContain('secret');
    expect(result.truncations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data.items',
          available: 55,
          returned: 50,
        }),
        expect.objectContaining({
          path: 'data.longText',
          available: 5000,
          returned: 4000,
        }),
      ]),
    );
  });
  it('supports drill-down paging on dashboard-local catalog collections', () => {
    const sections: Record<string, unknown> = {
      catalog: {
        items: Array.from({ length: 60 }, (_, i) => ({
          id: String(i),
          name: 'Badge ' + i,
          active: true,
        })),
      },
      awards: { items: [] },
    };
    filterReportCollections('get_badge_report', sections, {
      page: 2,
      pageSize: 25,
      active: true,
    });
    expect(sections.catalog).toMatchObject({
      pagination: { page: 2, total: 60, hasMore: true },
      items: expect.arrayContaining([
        { id: '25', name: 'Badge 25', active: true },
      ]),
    });
    expect((sections.catalog as { items: unknown[] }).items).toHaveLength(25);
  });
  it('exposes level categories and nested consistency metrics for charts', () => {
    const datasets = new Map();
    const refs = addReportDatasets(
      {
        levels: [{ level: 1, count: 4 }],
        habits: [{ name: 'Weekly', last7Days: { rate: 75, completed: 3 } }],
      },
      datasets,
      'report',
      'Dashboard report',
    );
    expect(refs[0].categories).toContain('level');
    expect(refs[1].metrics).toContain('last7Days.rate');
  });
  it('keeps full audit aggregate counts available as chart values', () => {
    const datasets = new Map();
    const refs = addReportDatasets(
      {
        audit: {
          summary: { byActor: { items: [{ name: 'System Admin', count: 5 }] } },
        },
      },
      datasets,
      'report',
      'Full filtered audit summary',
    );
    expect(refs).toHaveLength(1);
    expect(
      buildAssistantChart(
        {
          datasetId: refs[0].datasetId,
          type: 'bar',
          title: 'Badge creations',
          category: 'name',
          metric: 'count',
          aggregate: 'sum',
        },
        datasets,
      ).data,
    ).toEqual([{ name: 'System Admin', value: 5 }]);
  });
});
