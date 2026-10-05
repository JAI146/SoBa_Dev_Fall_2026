import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import {
  AdminRole,
  UserType,
  badgeInputSchema,
  badgeAwardsResponseSchema,
  badgesResponseSchema,
  isSingleBadgeEmoji,
  HabitFrequency,
  HabitCategory,
} from '@purposemint/contracts';
import { dataSourceOptions } from '../src/database/data-source';
import { AuditService } from '../src/audit/audit.service';
import { AuditEvent } from '../src/entities/audit-event.entity';
import { User } from '../src/entities/user.entity';
import { BadgesService } from '../src/badges/badges.service';
import { BadgeEvaluationService } from '../src/badges/badge-evaluation.service';
import { BadgeAward } from '../src/entities/badge-award.entity';
import { UserGoal } from '../src/entities/user-goal.entity';
import { Reflection } from '../src/entities/reflection.entity';
import { HabitTemplate } from '../src/entities/habit-template.entity';
import { UserHabit } from '../src/entities/user-habit.entity';
import { HabitCompletion } from '../src/entities/habit-completion.entity';
import { UserValue } from '../src/entities/user-value.entity';
import { SavingsEntry } from '../src/entities/savings-entry.entity';
import { Value } from '../src/entities/value.entity';
import { GoalTemplate } from '../src/entities/goal-template.entity';
import { Pathway } from '../src/entities/pathway.entity';
import { PathwayApplication } from '../src/entities/pathway-application.entity';
import { ReflectionTheme } from '../src/entities/reflection-theme.entity';
import { ReflectionsService } from '../src/reflections/reflections.service';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { GoalCreationService } from '../src/dashboard/goal-creation.service';
import type { UsersService } from '../src/users/users.service';
import type { CommunityChallengesService } from '../src/community-challenges/community-challenges.service';
import type { AuthPrincipal } from '../src/auth/auth-principal';

async function main() {
  if (dataSourceOptions.type !== 'postgres')
    throw new Error('Expected PostgreSQL.');
  if (process.env.NODE_ENV === 'production')
    throw new Error('Local development only.');
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', 'db'].includes(url.hostname))
    throw new Error('Local database only.');
  const databaseName = `purposemint_badges_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new DataSource({ type: 'postgres', url: url.toString() });
  await admin.initialize();
  let db: DataSource | undefined;
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    url.pathname = `/${databaseName}`;
    db = new DataSource({
      ...dataSourceOptions,
      url: url.toString(),
      logging: false,
    });
    await db.initialize();
    await db.runMigrations();
    const audit = new AuditService(db.getRepository(AuditEvent));
    const evaluation = new BadgeEvaluationService(db, audit);
    const service = new BadgesService(db, audit, evaluation);
    const user = await db.getRepository(User).save({
      email: 'badge-test@purposemint.local',
      firstName: 'Badge',
      lastName: 'Test',
      passwordHash: 'test-only',
    });
    const principal = {
      userId: user.id,
      userType: UserType.ADMIN,
      adminRole: AdminRole.SUPER_ADMIN,
      customRoleId: null,
    } as AuthPrincipal;
    for (const emoji of [
      '\u{1F3AF}',
      '\u{1F44D}\u{1F3FD}',
      '\u{1F1FA}\u{1F1F8}',
      '\u{1F469}\u200D\u{1F4BB}',
      '1\uFE0F\u20E3',
    ])
      assert.ok(isSingleBadgeEmoji(emoji));
    for (const invalid of [
      '',
      'abc',
      '\u{1F3AF}\u{1F3AF}',
      'a\u{1F3AF}',
      '\u{1F1FA}',
      '\u{1F3AF}\u0301',
    ])
      assert.equal(isSingleBadgeEmoji(invalid), false);
    const input = badgeInputSchema.parse({
      name: 'All savings goals',
      description: 'Complete all your savings goals',
      category: 'Savings',
      iconEmoji: '\u{1F3AF}',
      criteria: [
        { variable: 'savings_progress', operator: '=', not: false, value: 100 },
      ],
    });
    assert.equal(input.reward, null);
    assert.equal(
      badgeInputSchema.safeParse({ ...input, criteria: [] }).success,
      false,
    );
    assert.equal(
      badgeInputSchema.safeParse({
        ...input,
        criteria: [{ ...input.criteria[0], value: 101 }],
      }).success,
      false,
    );
    const draft = await service.create(input, user.id);
    await assert.rejects(
      db.query(`INSERT INTO badge_awards(badge_id,user_id) VALUES ($1,$2)`, [
        draft.id,
        user.id,
      ]),
    );
    const active = await service.update(
      draft.id,
      { ...input, active: true, version: draft.version },
      user.id,
    );
    assert.equal(active.version, 2);
    await assert.rejects(
      service.update(active.id, { ...input, version: 1 }, user.id),
      /changed/,
    );
    await assert.rejects(
      db.query(`UPDATE badge_definitions SET criteria = '[]' WHERE id = $1`, [
        active.id,
      ]),
    );
    await db.query(
      `INSERT INTO badge_awards(badge_id,user_id) VALUES ($1,$2)`,
      [active.id, user.id],
    );
    await assert.rejects(
      db.query(`INSERT INTO badge_awards(badge_id,user_id) VALUES ($1,$2)`, [
        active.id,
        user.id,
      ]),
    );
    await assert.rejects(
      service.update(active.id, { ...input, version: 2 }, user.id),
      /earned/,
    );
    await assert.rejects(service.remove(active.id, user.id), /earned/);
    await assert.rejects(
      db.query(`UPDATE badge_definitions SET name = 'Changed' WHERE id = $1`, [
        active.id,
      ]),
    );
    await assert.rejects(
      db.query(`DELETE FROM badge_definitions WHERE id = $1`, [active.id]),
    );
    await assert.rejects(
      db.query(`DELETE FROM badge_awards WHERE badge_id = $1`, [active.id]),
    );
    await assert.rejects(
      db.query(
        `UPDATE badge_awards SET unlocked_at = now() WHERE badge_id = $1`,
        [active.id],
      ),
    );
    await assert.rejects(db.query(`TRUNCATE badge_awards`));
    await assert.rejects(db.undoLastMigration());
    await assert.rejects(
      db.query(`DELETE FROM users WHERE id = $1`, [user.id]),
    );
    await db.getRepository(User).softDelete(user.id);
    const history = badgeAwardsResponseSchema.parse(
      await service.awards(user.id),
    );
    assert.equal(history.items.length, 1);
    assert.equal(history.items[0]?.userId, user.id);
    assert.ok(history.items[0]?.unlockedAt);
    const listed = badgesResponseSchema.parse(await service.list(principal));
    assert.equal(listed.items[0]?.awardCount, 1);
    assert.equal(listed.canManage, true);
    const removable = await service.create(input, user.id);
    await service.remove(removable.id, user.id);
    assert.equal((await service.list(principal)).items.length, 1);
    assert.ok(
      await db.getRepository(AuditEvent).exists({
        where: { action: 'admin.badge_deleted', entityId: removable.id },
      }),
    );
    const customers = await db.getRepository(User).save(
      ['Saver', 'NoGoals', 'Suspended', 'Staff'].map((firstName) => ({
        firstName,
        lastName: 'Test',
        email: `${firstName.toLowerCase()}@purposemint.local`,
        passwordHash: 'test-only',
        status:
          firstName === 'Suspended'
            ? ('suspended' as const)
            : ('active' as const),
        userType:
          firstName === 'Staff' ? ('admin' as const) : ('customer' as const),
      })),
    );
    const saver = customers[0]!;
    const noGoals = customers[1]!;
    const goals = await db.getRepository(UserGoal).save([
      {
        userId: saver.id,
        title: 'Overfunded',
        targetAmount: 100,
        savedAmount: 200,
      },
      {
        userId: saver.id,
        title: 'Incomplete',
        targetAmount: 100,
        savedAmount: 0,
      },
      {
        userId: customers[2]!.id,
        title: 'Suspended goal',
        targetAmount: 100,
        savedAmount: 10,
      },
      {
        userId: customers[3]!.id,
        title: 'Staff goal',
        targetAmount: 100,
        savedAmount: 10,
      },
    ]);
    const firstSaving = await service.create(
      {
        ...input,
        name: 'First saving',
        active: true,
        criteria: [
          { variable: 'saved_amount', operator: '>', not: false, value: 0 },
        ],
      },
      user.id,
    );
    assert.equal(firstSaving.awardCount, 1);
    const completion = await service.create(
      { ...input, name: 'All goals completed', active: true },
      user.id,
    );
    assert.equal(
      completion.awardCount,
      0,
      'One overfunded goal must not hide an incomplete goal.',
    );
    const incomplete = await service.create(
      {
        ...input,
        name: 'Not complete',
        active: true,
        criteria: [
          {
            variable: 'savings_progress',
            operator: '=',
            not: true,
            value: 100,
          },
        ],
      },
      user.id,
    );
    assert.equal(incomplete.awardCount, 1);
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: incomplete.id, userId: noGoals.id }),
      0,
    );
    await db.getRepository(UserGoal).update(goals[1]!.id, { savedAmount: 100 });
    await Promise.all([
      evaluation.evaluateUser(saver.id),
      evaluation.evaluateUser(saver.id),
      evaluation.reconcileAll(),
    ]);
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: completion.id, userId: saver.id }),
      1,
    );
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: incomplete.id, userId: saver.id }),
      1,
      'An earned badge is retained when progress changes.',
    );
    await assert.rejects(service.remove(completion.id, user.id), /earned/);
    const reflectionBadge = await service.create(
      {
        ...input,
        name: 'Savings and reflection',
        active: true,
        criteria: [
          { variable: 'saved_amount', operator: '>=', not: false, value: 1 },
          { variable: 'reflections', operator: '>=', not: false, value: 1 },
        ],
      },
      user.id,
    );
    assert.equal(reflectionBadge.awardCount, 0);
    await db.getRepository(Reflection).save({
      userId: saver.id,
      kind: 'text',
      body: null,
      moodScore: 3,
      reflectedOn: '2026-10-05',
    });
    await evaluation.evaluateUser(saver.id);
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: reflectionBadge.id }),
      0,
      'Mood-only entries are not reflections.',
    );
    await db.transaction(async (manager) => {
      await manager.save(Reflection, {
        userId: saver.id,
        kind: 'text',
        body: 'I saved today.',
        reflectedOn: '2026-10-05',
      });
      await evaluation.evaluateUser(saver.id, manager);
    });
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: reflectionBadge.id }),
      1,
    );
    assert.ok(
      (await service.earned(saver.id)).items.some(
        (badge) => badge.id === completion.id,
      ),
    );
    assert.equal((await service.earned(noGoals.id)).items.length, 0);
    assert.equal(
      await db.getRepository(AuditEvent).countBy({ action: 'badge.awarded' }),
      (await db.getRepository(BadgeAward).count()) - 1,
    );
    const goalCount = await service.create(
      {
        ...input,
        name: 'Two completed goals',
        active: false,
        criteria: [
          { variable: 'completed_goals', operator: '>=', not: false, value: 2 },
        ],
      },
      user.id,
    );
    assert.equal(goalCount.awardCount, 0);
    const activated = await service.update(
      goalCount.id,
      {
        ...input,
        name: goalCount.name,
        active: true,
        criteria: goalCount.criteria,
        version: goalCount.version,
      },
      user.id,
    );
    assert.equal(
      activated.awardCount,
      1,
      'Activation backfills existing eligible users.',
    );
    const activeCustomer = await db
      .getRepository(User)
      .save({
        firstName: 'Activity',
        lastName: 'Test',
        email: 'activity@purposemint.local',
        passwordHash: 'test-only',
        status: 'active',
        onboardingStatus: 'completed',
        onboardingCompletedAt: new Date(),
      });
    const usersService = {
      getByIdOrFail: (id: string) =>
        db!.getRepository(User).findOneByOrFail({ id }),
    } as unknown as UsersService;
    const reflections = new ReflectionsService(
      db.getRepository(Reflection),
      db.getRepository(ReflectionTheme),
      evaluation,
    );
    const dashboard = new DashboardService(
      db.getRepository(UserValue),
      db.getRepository(UserGoal),
      db.getRepository(UserHabit),
      db.getRepository(HabitCompletion),
      db.getRepository(SavingsEntry),
      db.getRepository(HabitTemplate),
      db.getRepository(Value),
      db.getRepository(Pathway),
      db.getRepository(PathwayApplication),
      usersService,
      reflections,
      {} as CommunityChallengesService,
      evaluation,
    );
    const goalCreation = new GoalCreationService(
      db.getRepository(GoalTemplate),
      db.getRepository(UserGoal),
      db.getRepository(UserValue),
      evaluation,
    );
    const newGoalBadge = await service.create(
      {
        ...input,
        name: 'Goal started',
        active: true,
        criteria: [
          { variable: 'savings_progress', operator: '=', value: 0, not: false },
        ],
      },
      user.id,
    );
    const goal = await goalCreation.create(
      activeCustomer.id,
      { title: 'Activity goal', targetAmount: 10 },
      { markOnboardingProgress: false, replaceFocus: false },
    );
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: newGoalBadge.id, userId: activeCustomer.id }),
      1,
      'Creating a goal evaluates badges in the write transaction.',
    );
    const firstSavingsResult = await dashboard.addSavings(activeCustomer.id, {
      goalId: goal.id,
      amount: 1,
    });
    assert.equal(firstSavingsResult.goal.savedAmount, 1);
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: firstSaving.id, userId: activeCustomer.id }),
      1,
      'A savings write immediately awards a qualifying badge.',
    );
    const habit = await db
      .getRepository(HabitTemplate)
      .save({
        title: 'Save daily',
        description: 'Habit test',
        iconEmoji: '\u{1F3AF}',
        frequency: Object.values(HabitFrequency)[0],
        category: Object.values(HabitCategory)[0],
        sortOrder: 0,
      });
    const userHabit = await db
      .getRepository(UserHabit)
      .save({ userId: activeCustomer.id, sourceTemplateId: habit.id });
    const habitBadge = await service.create(
      {
        ...input,
        name: 'First habit',
        active: true,
        criteria: [
          {
            variable: 'habit_completions',
            operator: '>=',
            value: 1,
            not: false,
          },
        ],
      },
      user.id,
    );
    await dashboard.toggleHabitCompletion(activeCustomer.id, userHabit.id);
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: habitBadge.id, userId: activeCustomer.id }),
      1,
    );
    await dashboard.toggleHabitCompletion(activeCustomer.id, userHabit.id);
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: habitBadge.id, userId: activeCustomer.id }),
      1,
    );
    const reflection = await reflections.create(activeCustomer.id, {
      kind: 'text',
      body: 'I made progress on my goal today.',
    });
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: reflectionBadge.id, userId: activeCustomer.id }),
      1,
      'A reflection write immediately awards qualifying badges.',
    );
    await reflections.remove(activeCustomer.id, reflection.id);
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: reflectionBadge.id, userId: activeCustomer.id }),
      1,
    );
    const levelBadge = await service.create(
      {
        ...input,
        name: 'Level three',
        active: true,
        criteria: [
          { variable: 'current_level', operator: '>=', value: 3, not: false },
        ],
      },
      user.id,
    );
    await db
      .getRepository(User)
      .update(activeCustomer.id, {
        currentLevel: 3,
        currentLevelSource: 'manual',
        currentLevelAssignedAt: new Date(),
      });
    await evaluation.reconcileAll();
    assert.equal(
      await db
        .getRepository(BadgeAward)
        .countBy({ badgeId: levelBadge.id, userId: activeCustomer.id }),
      1,
    );
    console.log(
      'Passed: live goal, savings, habit, and reflection write hooks; retained awards after activity removal; level reconciliation.',
    );
    console.log(
      'Passed: automatic activation awards, per-goal progress capping, AND/NOT criteria, concurrent duplicate protection, immutable earned badges, reflection eligibility, user eligibility, customer badge history, and award auditing.',
    );
    console.log(
      'Passed: emoji/rule validation, CRUD, stale edits, inactive and duplicate awards, definition locks, immutable history, user references, soft-deleted users, and auditing.',
    );
  } finally {
    if (db?.isInitialized) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await admin.destroy();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
