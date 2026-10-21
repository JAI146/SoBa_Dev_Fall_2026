/* Run against a migrated development database. Every fixture and mutation is
 * enclosed in an outer transaction that is rolled back even when a test fails.
 * This verifies PostgreSQL persistence, constraints, and actual service queries.
 */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ quiet: true });
require('ts-node').register({
  project: path.join(__dirname, '../tsconfig.json'),
  transpileOnly: true,
});
require('reflect-metadata');
const source = require('../src/database/data-source').default;
const { AuditService } = require('../src/audit/audit.service');
const { AuditEvent } = require('../src/entities/audit-event.entity');
const { User } = require('../src/entities/user.entity');
const {
  SubscriptionPlan,
} = require('../src/entities/subscription-plan.entity');
const {
  UserSubscription,
} = require('../src/entities/user-subscription.entity');
const {
  SubscriptionHistory,
} = require('../src/entities/subscription-history.entity');
const {
  SubscriptionManagementService,
} = require('../src/subscription-management/subscription-management.service');
const { adminPlanInputSchema } = require('@purposemint/contracts');

async function main() {
  await source.initialize();
  const runner = source.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const manager = runner.manager;
  const service = new SubscriptionManagementService(
    manager.getRepository(SubscriptionPlan),
    new AuditService(manager.getRepository(AuditEvent)),
  );
  try {
    const actor = randomUUID();
    const user = await manager.save(
      manager.create(User, {
        email: `subscription-test-${randomUUID()}@example.test`,
        firstName: 'Subscription',
        lastName: 'Fixture',
        passwordHash: 'test-only-invalid-password-hash',
        userType: 'customer',
        status: 'active',
      }),
    );
    const key = `test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const input = adminPlanInputSchema.parse({
      key,
      name: 'Integration Fixture',
      description: 'Disposable subscription fixture',
      tagline: '',
      badge: null,
      ctaLabel: 'Choose',
      priceMonthly: 9,
      priceYearly: 90,
      billingCycles: ['monthly', 'yearly'],
      features: ['Pathways'],
      entitlements: { pathways: true, communityChallenges: true },
      limits: { pathwayApplications: 2, challengeParticipations: 3 },
      active: true,
      isDefault: false,
      available: true,
      availableFrom: null,
      availableUntil: null,
      sortOrder: 100,
      promotion: null,
    });
    await service.savePlan(input, actor, null);
    const first = await service.assign(
      {
        userId: user.id,
        expectedPlanVersion: 1,
        planKey: key,
        cycle: 'monthly',
      },
      actor,
      null,
    );
    assert.equal(
      (
        await manager.findOneByOrFail(UserSubscription, {
          id: first.subscription.id,
        })
      ).billing.amountCents,
      900,
    );
    await service.savePlan({ ...input, priceMonthly: 99 }, actor, null, 1);
    assert.equal(
      (await service.detail(first.subscription.id)).subscription.billing
        .amountCents,
      900,
    );
    await service.change(
      first.subscription.id,
      {
        expectedVersion: 1,
        expectedPlanVersion: 2,
        planKey: key,
        cycle: 'yearly',
        timing: 'immediate',
      },
      actor,
      null,
    );
    await service.cancel(
      first.subscription.id,
      { expectedVersion: 2, timing: 'renewal' },
      actor,
      null,
    );
    await manager.update(
      UserSubscription,
      { id: first.subscription.id },
      {
        pendingChange: {
          action: 'cancel',
          terms: null,
          authorizedBy: actor,
          effectiveAt: new Date(Date.now() - 1000).toISOString(),
        },
      },
    );
    const cancelled = await service.detail(first.subscription.id);
    assert.equal(cancelled.subscription.status, 'cancelled');
    assert.equal(cancelled.history.length, 4);
    assert.equal(
      (await service.detail(first.subscription.id)).history.length,
      4,
    );
    assert.equal((await service.access(user.id)).entitlements.pathways, false);
    await assert.rejects(
      manager.transaction(async (m) => {
        await m.query(
          'UPDATE subscription_history SET action = $1 WHERE subscription_id = $2',
          ['rewritten', first.subscription.id],
        );
      }),
      /append-only/,
    );
    await assert.rejects(
      manager.transaction(async (m) => {
        await m.delete(SubscriptionPlan, { key });
      }),
      /foreign key/,
    );
    const before = await manager.count(SubscriptionHistory, {
      where: { subscriptionId: first.subscription.id },
    });
    const failAudit = new SubscriptionManagementService(
      manager.getRepository(SubscriptionPlan),
      {
        recordTransactional: async () => {
          throw new Error('Simulated audit failure');
        },
      },
    );
    await assert.rejects(
      failAudit.change(
        first.subscription.id,
        {
          expectedVersion: cancelled.subscription.version,
          expectedPlanVersion: 2,
          planKey: key,
          cycle: 'monthly',
          timing: 'immediate',
        },
        actor,
        null,
      ),
      /Simulated audit failure/,
    );
    assert.equal(
      (
        await manager.findOneByOrFail(UserSubscription, {
          id: first.subscription.id,
        })
      ).status,
      'cancelled',
    );
    assert.equal(
      await manager.count(SubscriptionHistory, {
        where: { subscriptionId: first.subscription.id },
      }),
      before,
    );
    console.log(
      'PASS: persistence, price isolation, cycle change, scheduled cancellation, exactly-once history, access revocation, immutable journal, restrictive plan deletion, and atomic audit rollback.',
    );
  } finally {
    service.onModuleDestroy();
    await runner.rollbackTransaction();
    await runner.release();
    await source.destroy();
  }
}
main().catch((error) => {
  console.error(error.code ?? error.message);
  process.exitCode = 1;
});
