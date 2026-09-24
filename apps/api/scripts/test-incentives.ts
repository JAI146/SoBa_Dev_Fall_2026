/**
 * Exercises migrations, program creation, optional notes, permissions, and ledger safety
 * against a disposable database; cleanup leaves development records untouched.
 */
/** Integration test: creates its own disposable PostgreSQL database, never edits development records. */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  AdminRole,
  AuditAction,
  UserType,
  incentiveDetailSchema,
  incentiveAnalyticsSchema,
  incentiveBenefitsSchema,
  incentiveQuerySchema,
  incentiveProgramSchema,
  type IncentiveEventInput,
} from '@purposemint/contracts';
import { dataSourceOptions } from '../src/database/data-source';
import { AuditService } from '../src/audit/audit.service';
import { AuditEvent } from '../src/entities/audit-event.entity';
import { User } from '../src/entities/user.entity';
import { UserGoal } from '../src/entities/user-goal.entity';
import { IncentiveEvent } from '../src/entities/incentive-event.entity';
import { IncentivesService } from '../src/incentives/incentives.service';
import { IncentivesQueries } from '../src/incentives/incentives.queries';
import { IncentivesController } from '../src/incentives/incentives.controller';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';

async function main() {
  if (dataSourceOptions.type !== 'postgres')
    throw new Error('Expected PostgreSQL configuration.');
  if (process.env.NODE_ENV === 'production')
    throw new Error('Run only against a local development PostgreSQL server.');
  const url = new URL(process.env.DATABASE_URL!);
  if (!['db', 'localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('This test only permits local PostgreSQL hosts.');
  const testDatabase = `purposemint_incentives_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new DataSource({ type: 'postgres', url: url.toString() });
  await admin.initialize();
  let database: DataSource | undefined;
  try {
    await admin.query(`CREATE DATABASE "${testDatabase}"`);
    url.pathname = `/${testDatabase}`;
    database = new DataSource({
      ...dataSourceOptions,
      url: url.toString(),
      logging: false,
    });
    await database.initialize();
    await database.runMigrations();
    const audit = new AuditService(database.getRepository(AuditEvent));
    const service = new IncentivesService(database, audit);
    const queries = new IncentivesQueries(database);
    await service.onModuleInit();
    const [initial] = await service.programs();
    assert.equal(initial.active, false);
    assert.equal(initial.rulesProvisional, true);
    const actor = randomUUID();
    const users = await database.getRepository(User).save(
      ['Avery', 'Jordan', 'Morgan'].map((name, index) =>
        database!.getRepository(User).create({
          firstName: name,
          lastName: 'Test',
          email: `incentive-test-${index}@purposemint.local`,
          passwordHash: 'test-only',
          status: 'active',
        }),
      ),
    );
    const [customer, otherCustomer, unawardedCustomer] = users;
    const goal = await database.getRepository(UserGoal).save({
      userId: customer.id,
      title: 'Home deposit',
      targetAmount: 500,
      savedAmount: 0,
    });
    const otherGoal = await database.getRepository(UserGoal).save({
      userId: otherCustomer.id,
      title: 'Transportation',
      targetAmount: 500,
      savedAmount: 0,
    });

    const review = (userId: string, eligible = true) =>
      service.review(
        {
          programId: initial.id,
          userId,
          eligible,
          reason: 'Reviewed documented local test eligibility.',
        },
        actor,
      );
    const benefit = await review(customer.id);
    const event = (
      kind: IncentiveEventInput['kind'],
      amountCents = 1000,
      extra: Partial<IncentiveEventInput> = {},
    ): IncentiveEventInput => ({
      kind,
      amountCents,
      reason: 'Verified local test evidence.',
      reference: `test:${randomUUID()}`,
      idempotencyKey: randomUUID(),
      occurredAt: new Date().toISOString(),
      ...extra,
    });
    const record = (input: IncentiveEventInput) =>
      service.recordEvent(benefit.id, input, actor);
    await assert.rejects(record(event('award')), /activate/i);
    const settings = {
      name: initial.name,
      amountCents: 1000,
      active: true,
      rulesProvisional: false,
      eligibilityDescription:
        'Approved test criteria: staff verifies documented eligibility.',
      version: initial.version,
    };
    await service.updateProgram(initial.id, settings, actor);
    await assert.rejects(
      service.updateProgram(initial.id, settings, actor),
      /Reload/i,
    );
    await assert.rejects(record(event('award')), /Review eligibility again/i);
    await review(customer.id);
    await review(unawardedCustomer.id);
    await review(otherCustomer.id, false);

    const award = event('award');
    const duplicateAwards = await Promise.all([record(award), record(award)]);
    assert.equal(
      duplicateAwards[0].id,
      duplicateAwards[1].id,
      'Concurrent retries must return one award.',
    );
    await assert.rejects(
      record({ ...award, reason: 'Changed payload for the same key.' }),
      /different data/i,
    );
    await assert.rejects(record(event('award')), /once/i);
    await assert.rejects(review(customer.id), /original eligibility/i);
    await assert.rejects(record(event('distribution', 1001)), /balance/i);
    const distribution = await record(event('distribution'));
    await assert.rejects(
      record(
        event('allocation', 500, { goalId: otherGoal.id, category: 'home' }),
      ),
      /belong/i,
    );
    await record(
      event('allocation', 700, { goalId: goal.id, category: 'home' }),
    );
    await record(
      event('withdrawal', 200, { goalId: goal.id, category: 'home' }),
    );
    await assert.rejects(
      record(event('reversal', 1000, { reversesEventId: distribution.id })),
      /balance/i,
    );

    const detail = incentiveDetailSchema.parse(
      await queries.detail(benefit.id),
    );
    assert.equal(detail.benefit.earnedCents, 1000);
    assert.equal(detail.benefit.remainingCents, 800);
    assert.equal(detail.benefit.allocatedCents, 500);
    assert.equal(detail.benefit.unallocatedCents, 300);
    assert.equal(detail.benefit.withdrawalStatus, 'recorded');
    assert.equal(detail.benefit.status, 'partially_withdrawn');
    assert.equal(
      (await database.getRepository(UserGoal).findOneByOrFail({ id: goal.id }))
        .savedAmount,
      0,
      'Incentives do not rewrite savings totals.',
    );

    const concurrentWithdrawals = await Promise.allSettled([
      record(event('withdrawal', 250)),
      record(event('withdrawal', 250)),
    ]);
    assert.equal(
      concurrentWithdrawals.filter((result) => result.status === 'fulfilled')
        .length,
      1,
      'Row locking prevents overspending.',
    );
    const withdrawnEvent = concurrentWithdrawals.find(
      (result) => result.status === 'fulfilled',
    );
    assert.ok(withdrawnEvent?.status === 'fulfilled');
    await record(
      event('reversal', 250, { reversesEventId: withdrawnEvent.value.id }),
    );
    await assert.rejects(
      record(
        event('reversal', 250, { reversesEventId: withdrawnEvent.value.id }),
      ),
      /already been reversed/i,
    );

    // Force an audit failure: neither the financial event nor its balance may commit.
    const eventCount = await database.getRepository(IncentiveEvent).count();
    const originalAudit = audit.recordTransactional.bind(audit);
    audit.recordTransactional = async () => {
      throw new Error('Simulated audit outage');
    };
    await assert.rejects(record(event('withdrawal', 1)), /audit outage/i);
    audit.recordTransactional = originalAudit;
    assert.equal(
      await database.getRepository(IncentiveEvent).count(),
      eventCount,
    );
    const logged = await database
      .getRepository(AuditEvent)
      .count({ where: { action: AuditAction.INCENTIVE_EVENT_RECORDED } });
    assert.ok(logged >= 5);

    await database
      .getRepository(UserGoal)
      .update(goal.id, { title: 'Renamed goal' });
    assert.ok(
      (await queries.detail(benefit.id)).events.some(
        (entry) => entry.goalTitle === 'Home deposit',
      ),
    );
    const query = incentiveQuerySchema.parse({ programId: initial.id });
    const report = incentiveAnalyticsSchema.parse(
      await queries.analytics(query),
    );
    assert.equal(
      report.eligibleUsers,
      2,
      'Eligible users include customers without an award.',
    );
    assert.equal(report.earnedCount, 1);
    assert.equal(report.remainingCents, 800);
    assert.equal(
      report.categories.find((item) => item.category === 'home')?.amountCents,
      500,
    );
    const recipients = incentiveBenefitsSchema.parse(await queries.list(query));
    assert.equal(recipients.total, 3);
    assert.equal(
      (await queries.list({ ...query, metric: 'allocated' })).total,
      1,
    );
    assert.equal((await queries.list({ ...query, page: 99 })).items.length, 0);
    assert.equal(
      (await queries.list({ ...query, search: "' OR 1=1 --" })).total,
      0,
    );
    const noWithdrawals = recipients.items.find(
      (item) => item.userId === unawardedCustomer.id,
    )!;
    assert.equal(noWithdrawals.withdrawalStatus, 'not_confirmed');

    // HTTP boundary tests use a test-only principal injector; production still uses JWT auth.
    const module = await Test.createTestingModule({
      controllers: [IncentivesController],
      providers: [
        { provide: IncentivesService, useValue: service },
        { provide: IncentivesQueries, useValue: queries },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    const app = module.createNestApplication();
    app.use(
      (
        request: { headers: Record<string, string>; user?: unknown },
        _response: unknown,
        next: () => void,
      ) => {
        request.user = {
          userId: actor,
          userType: UserType.ADMIN,
          adminRole: request.headers['x-test-role'] ?? null,
        };
        next();
      },
    );
    app.useGlobalPipes(new ZodValidationPipe());
    await app.listen(0, '127.0.0.1');
    try {
      const origin = await app.getUrl();
      assert.equal(
        (await fetch(`${origin}/admin/incentives/programs`)).status,
        403,
      );
      const headers = {
        'x-test-role': AdminRole.SUPER_ADMIN,
        'Content-Type': 'application/json',
      };
      const programInput = {
        name: 'Education bonus',
        amountCents: 2500,
        eligibilityDescription:
          'Staff review of education program participation.',
      };
      const createUrl = `${origin}/admin/incentives/programs`;
      assert.equal(
        (
          await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(programInput),
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await fetch(createUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...programInput, amountCents: -1 }),
          })
        ).status,
        400,
      );
      const createdResponse = await fetch(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(programInput),
      });
      assert.equal(createdResponse.status, 201);
      const created = incentiveProgramSchema.parse(
        await createdResponse.json(),
      );
      assert.equal(created.active, false);
      assert.equal(created.rulesProvisional, true);
      assert.equal(created.amountCents, 2500);
      assert.ok(
        await database
          .getRepository(AuditEvent)
          .existsBy({ entityId: created.id }),
      );
      // Blank and omitted notes both persist as empty strings, without changing eligibility.
      for (const notes of [{}, { reason: '' }]) {
        const response = await fetch(
          `${origin}/admin/incentives/benefits/review`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              programId: created.id,
              userId: customer.id,
              eligible: true,
              ...notes,
            }),
          },
        );
        assert.equal(response.status, 201);
      }
      const reviewed = await queries.list({
        programId: created.id,
        page: 1,
        pageSize: 20,
      });
      assert.equal(reviewed.total, 1);
      assert.equal(reviewed.items[0].eligibilityReason, '');
      assert.equal(
        (await fetch(`${origin}/admin/incentives/programs`, { headers }))
          .status,
        200,
      );
      assert.equal(
        (
          await fetch(`${origin}/admin/incentives/benefits?from=2026-02-30`, {
            headers,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await fetch(
            `${origin}/admin/incentives/benefits/${benefit.id}/events`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(event('allocation')),
            },
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await fetch(`${origin}/admin/incentives/programs/${initial.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              ...settings,
              active: true,
              rulesProvisional: true,
            }),
          })
        ).status,
        400,
      );
    } finally {
      await app.close();
    }
    console.log(
      'PASS: migrations, provisional default, versioning, idempotency, concurrency, ownership, reversals, balances, audit rollback, reports, permissions and validation.',
    );
  } finally {
    if (database?.isInitialized) await database.destroy();
    // The name is generated above, never supplied by the caller.
    await admin.query(`DROP DATABASE IF EXISTS "${testDatabase}" WITH (FORCE)`);
    await admin.destroy();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
