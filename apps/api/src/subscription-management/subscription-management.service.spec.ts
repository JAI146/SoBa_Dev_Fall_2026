import { randomUUID } from 'crypto';
import {
  AdminRole,
  UserType,
  type SubscriptionPaymentInput,
} from '@purposemint/contracts';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionHistory } from '../entities/subscription-history.entity';
import { SubscriptionBillingRecord } from '../entities/subscription-billing-record.entity';
import { UserSubscription } from '../entities/user-subscription.entity';
import { User } from '../entities/user.entity';
import { SubscriptionManagementService } from './subscription-management.service';
import { captureTerms } from './subscription-policy';
import { planEntity, planInput } from './subscription-fixtures';

type Row =
  | SubscriptionPlan
  | SubscriptionHistory
  | SubscriptionBillingRecord
  | UserSubscription
  | User;
function clone<T extends Row>(row: T): T {
  return Object.assign(
    Object.create(Object.getPrototypeOf(row) as object) as T,
    structuredClone(row),
  );
}

/** Transactional repository double: rollback assertions do not require a running DB. */
class MemoryDatabase {
  rows = new Map<unknown, Row[]>();
  locks: unknown[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  query = jest.fn().mockResolvedValue([]);
  create<T extends Row>(target: new () => T, input: Partial<T>): T {
    return Object.assign(new target(), input);
  }
  async transaction<T>(
    run: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const result = this.queue.then(async () => {
      const snapshot = new Map(
        [...this.rows].map(([target, rows]) => [target, rows.map(clone)]),
      );
      try {
        return await run(this as unknown as EntityManager);
      } catch (error) {
        this.rows = snapshot;
        throw error;
      }
    });
    this.queue = result.catch(() => undefined);
    return result;
  }
  findOne(
    target: unknown,
    options: {
      where: Record<string, unknown>;
      lock?: unknown;
      relations?: unknown;
    },
  ) {
    if (options.lock) this.locks.push({ target, lock: options.lock });
    const row = (this.rows.get(target) ?? []).find((candidate) =>
      Object.entries(options.where).every(
        ([key, value]) =>
          (candidate as unknown as Record<string, unknown>)[key] === value,
      ),
    );
    if (row instanceof UserSubscription && options.relations) {
      row.user = (this.rows.get(User) ?? []).find(
        (user) => user instanceof User && user.id === row.userId,
      ) as User;
      row.plan = (this.rows.get(SubscriptionPlan) ?? []).find(
        (plan) => plan instanceof SubscriptionPlan && plan.key === row.planKey,
      ) as SubscriptionPlan;
    }
    return Promise.resolve(row ?? null);
  }
  async findOneBy(target: unknown, where: Record<string, unknown>) {
    return this.findOne(target, { where });
  }
  async findOneOrFail(
    target: unknown,
    options: { where: Record<string, unknown>; relations?: unknown },
  ) {
    const row = await this.findOne(target, options);
    if (!row) throw new Error('Missing fixture');
    return row;
  }
  find(target: unknown, options: { where: Record<string, unknown> }) {
    return Promise.resolve(
      (this.rows.get(target) ?? []).filter((row) =>
        Object.entries(options.where).every(
          ([key, value]) =>
            (row as unknown as Record<string, unknown>)[key] === value,
        ),
      ),
    );
  }
  save<T extends Row>(row: T): Promise<T> {
    const rows = this.rows.get(row.constructor) ?? [];
    if (!(row instanceof SubscriptionPlan) && !row.id) row.id = randomUUID();
    if (
      row instanceof SubscriptionHistory ||
      row instanceof SubscriptionBillingRecord
    )
      row.recordedAt ??= new Date();
    if (
      row instanceof SubscriptionBillingRecord &&
      rows.some(
        (candidate) =>
          candidate instanceof SubscriptionBillingRecord &&
          candidate.reference === row.reference,
      )
    )
      throw new QueryFailedError(
        'insert',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      );
    const index = rows.findIndex((candidate) =>
      row instanceof SubscriptionPlan
        ? candidate instanceof SubscriptionPlan && candidate.key === row.key
        : !(candidate instanceof SubscriptionPlan) && candidate.id === row.id,
    );
    if (index < 0) rows.push(row);
    else rows[index] = row;
    this.rows.set(row.constructor, rows);
    return Promise.resolve(row);
  }
}

describe('subscription management transitions', () => {
  let db: MemoryDatabase;
  let service: SubscriptionManagementService;
  let recordAudit: jest.Mock;
  let user: User;
  const actor = randomUUID();
  const now = new Date('2026-10-01T12:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers({ now });
    db = new MemoryDatabase();
    user = Object.assign(new User(), {
      id: randomUUID(),
      userType: UserType.CUSTOMER,
      adminRole: null,
      email: 'customer@example.test',
      firstName: 'Test',
      lastName: 'Customer',
    });
    db.rows.set(User, [user]);
    db.rows.set(SubscriptionPlan, [
      planEntity(),
      planEntity({
        key: 'advanced',
        name: 'Advanced',
        priceMonthly: 20,
        entitlements: { pathways: true, communityChallenges: true },
        limits: { pathwayApplications: 2, challengeParticipations: 10 },
      }),
      planEntity({
        key: 'baseline',
        name: 'Baseline',
        priceMonthly: 0,
        isDefault: true,
      }),
    ]);
    recordAudit = jest.fn().mockResolvedValue(undefined);
    service = new SubscriptionManagementService(
      { manager: db } as unknown as Repository<SubscriptionPlan>,
      { recordTransactional: recordAudit } as unknown as AuditService,
    );
  });
  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });
  async function assign() {
    return (
      await service.assign(
        {
          userId: user.id,
          planKey: 'foundation',
          expectedPlanVersion: 1,
          cycle: 'monthly',
        },
        actor,
        '127.0.0.1',
      )
    ).subscription;
  }
  function current() {
    return db.rows.get(UserSubscription)![0] as UserSubscription;
  }
  function payment(
    extra: Partial<SubscriptionPaymentInput> = {},
  ): SubscriptionPaymentInput {
    return {
      expectedVersion: current().version,
      status: 'paid',
      amountCents: current().billing.amountCents,
      reference: randomUUID(),
      note: 'Confirmed externally',
      occurredAt: now.toISOString(),
      ...extra,
    };
  }

  it('persists assignment with administrator history and transactional audit', async () => {
    const row = await assign();
    expect(row.billing).toMatchObject({
      planKey: 'foundation',
      amountCents: 900,
      cycle: 'monthly',
    });
    expect(db.rows.get(SubscriptionHistory)).toEqual([
      expect.objectContaining({
        action: 'assigned',
        authorizedBy: actor,
        previousPlanKey: null,
        newPlanKey: 'foundation',
      }),
    ]);
    expect(recordAudit).toHaveBeenCalledTimes(1);
    expect(db.locks).toContainEqual({
      target: User,
      lock: { mode: 'pessimistic_write' },
    });
  });
  it('prevents concurrent duplicate assignment', async () => {
    const results = await Promise.allSettled([assign(), assign()]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(db.rows.get(UserSubscription)).toHaveLength(1);
    expect(db.rows.get(SubscriptionHistory)).toHaveLength(1);
  });
  it('rejects a stale selected offer so catalog changes cannot silently change the price', async () => {
    await service.savePlan(planInput({ priceMonthly: 99 }), actor, null, 1);
    await expect(assign()).rejects.toThrow('This plan changed');
    expect(db.rows.get(UserSubscription)).toBeUndefined();
  });
  it('rolls back the entire assignment if its audit cannot be recorded', async () => {
    recordAudit.mockRejectedValue(new Error('Audit unavailable'));
    await expect(assign()).rejects.toThrow('Audit unavailable');
    expect(db.rows.get(UserSubscription)).toBeUndefined();
    expect(db.rows.get(SubscriptionHistory)).toBeUndefined();
  });
  it('keeps billing unchanged when catalog prices change and consumes live entitlements', async () => {
    const row = await assign();
    const changed = planInput({
      priceMonthly: 99,
      entitlements: { pathways: true, communityChallenges: true },
      limits: { pathwayApplications: 1, challengeParticipations: 3 },
    });
    await service.savePlan(changed, actor, null, 1);
    expect(
      (await service.detail(row.id)).subscription.billing.amountCents,
    ).toBe(900);
    expect(await service.access(user.id)).toMatchObject({
      entitlements: { pathways: true },
      limits: { pathwayApplications: 1 },
    });
  });
  it('rejects stale versions and preserves every previous transition', async () => {
    const row = await assign();
    await service.change(
      row.id,
      {
        expectedVersion: row.version,
        planKey: 'advanced',
        expectedPlanVersion: 1,
        cycle: 'monthly',
        timing: 'immediate',
      },
      actor,
      null,
    );
    await expect(
      service.cancel(
        row.id,
        { expectedVersion: row.version, timing: 'immediate' },
        actor,
        null,
      ),
    ).rejects.toThrow('changed');
    const history = (await service.detail(row.id)).history;
    expect(history).toHaveLength(2);
    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'upgraded',
          previousPlanKey: 'foundation',
          newPlanKey: 'advanced',
          authorizedBy: actor,
        }),
      ]),
    );
  });
  it('supports yearly/monthly switching and downgrades independently of display order', async () => {
    const row = await assign();
    await service.change(
      row.id,
      {
        expectedVersion: 1,
        planKey: 'foundation',
        expectedPlanVersion: 1,
        cycle: 'yearly',
        timing: 'immediate',
      },
      actor,
      null,
    );
    expect(current().billing.amountCents).toBe(9000);
    await service.change(
      row.id,
      {
        expectedVersion: 2,
        planKey: 'advanced',
        expectedPlanVersion: 1,
        cycle: 'monthly',
        timing: 'immediate',
      },
      actor,
      null,
    );
    await service.change(
      row.id,
      {
        expectedVersion: 3,
        planKey: 'baseline',
        expectedPlanVersion: 1,
        cycle: 'monthly',
        timing: 'immediate',
      },
      actor,
      null,
    );
    expect(current().billing.amountCents).toBe(0);
    expect((await service.detail(row.id)).history.map((h) => h.action)).toEqual(
      ['assigned', 'cycle_changed', 'upgraded', 'downgraded'],
    );
  });
  it('captures scheduled prices and applies a due change only once', async () => {
    const row = await assign();
    await service.change(
      row.id,
      {
        expectedVersion: 1,
        planKey: 'advanced',
        expectedPlanVersion: 1,
        cycle: 'yearly',
        timing: 'renewal',
      },
      actor,
      null,
    );
    expect(current().planKey).toBe('foundation');
    const advanced = db.rows.get(SubscriptionPlan)![1] as SubscriptionPlan;
    advanced.priceYearly = 999;
    advanced.active = false;
    jest.setSystemTime(new Date('2026-11-01T12:00:00Z'));
    const first = await service.detail(row.id);
    const second = await service.detail(row.id);
    expect(first.subscription.billing.amountCents).toBe(9000);
    expect(first.subscription.planKey).toBe('advanced');
    expect(first.subscription.pendingChange).toBeNull();
    expect(second.history).toHaveLength(3);
    expect(second.subscription.version).toBe(first.subscription.version);
  });
  it('removes a scheduled change without losing its request history', async () => {
    const row = await assign();
    await service.cancel(
      row.id,
      { expectedVersion: 1, timing: 'renewal' },
      actor,
      null,
    );
    await service.clearPending(row.id, 2, actor, null);
    jest.setSystemTime(new Date('2026-11-02T12:00:00Z'));
    const result = await service.detail(row.id);
    expect(result.subscription.status).toBe('active');
    expect(result.history.map((h) => h.action)).toContain(
      'scheduled_change_removed',
    );
  });
  it('preserves canceled subscriptions, revokes access, and records reactivation', async () => {
    const row = await assign();
    await service.cancel(
      row.id,
      { expectedVersion: 1, timing: 'immediate' },
      actor,
      null,
    );
    expect(
      (await service.access(user.id)).entitlements.communityChallenges,
    ).toBe(false);
    await service.change(
      row.id,
      {
        expectedVersion: 2,
        planKey: 'foundation',
        expectedPlanVersion: 1,
        cycle: 'monthly',
        timing: 'immediate',
      },
      actor,
      null,
    );
    expect(
      (await service.detail(row.id)).history.map((h) => h.action),
    ).toContain('reactivated');
    expect(db.rows.get(UserSubscription)).toHaveLength(1);
  });
  it('records failures and billing snapshots, then restores access on confirmed payment', async () => {
    const row = await assign();
    await service.payment(row.id, payment({ status: 'failed' }), actor, null);
    expect(
      (await service.access(user.id)).entitlements.communityChallenges,
    ).toBe(false);
    await service.payment(row.id, payment(), actor, null);
    expect(current().failedPayments).toBe(1);
    expect(
      (await service.access(user.id)).entitlements.communityChallenges,
    ).toBe(true);
    expect((await service.detail(row.id)).billingRecords).toHaveLength(2);
  });
  it('rejects mismatched amounts, duplicate references, future payments, and paid-period duplicates', async () => {
    const row = await assign();
    await expect(
      service.payment(row.id, payment({ amountCents: 1 }), actor, null),
    ).rejects.toThrow('amount');
    await expect(
      service.payment(
        row.id,
        payment({ occurredAt: '2027-01-01T12:00:00Z' }),
        actor,
        null,
      ),
    ).rejects.toThrow('future');
    const failed = payment({ status: 'failed' });
    await service.payment(row.id, failed, actor, null);
    await expect(
      service.payment(
        row.id,
        { ...failed, expectedVersion: current().version },
        actor,
        null,
      ),
    ).rejects.toThrow('reference');
    await service.payment(row.id, payment(), actor, null);
    await expect(
      service.payment(row.id, payment(), actor, null),
    ).rejects.toThrow('billing period');
  });
  it('ends promotions using the agreed regular price instead of the current catalog price', async () => {
    const foundation = db.rows.get(SubscriptionPlan)![0] as SubscriptionPlan;
    foundation.promotion = {
      monthlyPrice: 4,
      yearlyPrice: null,
      startsAt: '2026-09-01T00:00:00Z',
      endsAt: '2026-10-20T00:00:00Z',
    };
    const row = await assign();
    foundation.priceMonthly = 99;
    jest.setSystemTime(new Date('2026-11-01T12:00:00Z'));
    await service.payment(
      row.id,
      payment({ amountCents: 900, occurredAt: '2026-11-01T12:00:00Z' }),
      actor,
      null,
    );
    expect(current().billing.amountCents).toBe(900);
    expect(current().billing.regularAmountCents).toBe(900);
    expect(current().renewalAt.toISOString()).toBe('2026-12-01T12:00:00.000Z');
  });
  it('switches the default atomically and enrolls customers using its configuration', async () => {
    await service.savePlan(
      planInput({
        key: 'new_default',
        name: 'New Default',
        priceMonthly: 0,
        isDefault: true,
      }),
      actor,
      null,
    );
    expect(
      db.rows
        .get(SubscriptionPlan)
        ?.filter((p) => p instanceof SubscriptionPlan && p.isDefault),
    ).toHaveLength(1);
    expect((await service.access(user.id)).planKey).toBe('new_default');
    expect(db.rows.get(SubscriptionHistory)).toEqual([
      expect.objectContaining({
        action: 'default_assigned',
        authorizedBy: null,
      }),
    ]);
  });
  it('rejects admin accounts, inactive plans, and unavailable billing cycles', async () => {
    user.userType = UserType.ADMIN;
    user.adminRole = AdminRole.SUPER_ADMIN;
    await expect(assign()).rejects.toThrow('Customer');
    user.userType = UserType.CUSTOMER;
    db.rows.set(User, [user]);
    const plan = db.rows.get(SubscriptionPlan)![0] as SubscriptionPlan;
    plan.active = false;
    await expect(assign()).rejects.toThrow('available');
    const restored = db.rows.get(SubscriptionPlan)![0] as SubscriptionPlan;
    restored.active = true;
    restored.billingCycles = ['yearly'];
    await expect(assign()).rejects.toThrow('cycle');
  });
  it('records scheduled cancellation at its effective date and preserves original billing', async () => {
    const row = await assign();
    const previous = captureTerms(planEntity(), 'monthly', now);
    await service.cancel(
      row.id,
      { expectedVersion: 1, timing: 'renewal' },
      actor,
      null,
    );
    jest.setSystemTime(new Date('2026-11-01T12:00:00Z'));
    const result = await service.detail(row.id);
    expect(result.subscription.status).toBe('cancelled');
    expect(result.subscription.billing).toEqual(previous);
    expect(result.history.find((h) => h.action === 'cancelled')).toMatchObject({
      action: 'cancelled',
      effectiveAt: '2026-11-01T12:00:00.000Z',
      authorizedBy: actor,
    });
  });
});
