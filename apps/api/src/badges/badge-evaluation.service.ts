import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  AuditAction,
  AuditActorType,
  UserStatus,
  UserType,
} from '@purposemint/contracts';
import { DataSource, type EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { BadgeAward } from '../entities/badge-award.entity';
import { BadgeDefinition } from '../entities/badge-definition.entity';
import { meetsBadgeCriteria, type BadgeMetrics } from './badge-criteria';

type UserMetrics = { userId: string; metrics: BadgeMetrics };
type MetricRow = { userId: string } & Record<
  keyof BadgeMetrics,
  string | number | null
>;

@Injectable()
export class BadgeEvaluationService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(BadgeEvaluationService.name);
  private timer?: ReturnType<typeof setInterval>;
  private reconciling = false;

  constructor(
    private readonly db: DataSource,
    private readonly audit: AuditService,
  ) {}

  async onApplicationBootstrap() {
    await this.reconcileAll();
    // Covers level assignments and activity imported outside the normal write paths.
    this.timer = setInterval(() => {
      void this.reconcileAll().catch((error: unknown) =>
        this.logger.error(
          'Badge reconciliation failed',
          error instanceof Error ? error.stack : String(error),
        ),
      );
    }, 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async reconcileAll(): Promise<void> {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const badges = await this.db.getRepository(BadgeDefinition).find({
        where: { active: true },
        select: { id: true },
        order: { id: 'ASC' },
      });
      for (const candidate of badges) {
        await this.db.transaction(async (manager) => {
          const badge = await manager.findOne(BadgeDefinition, {
            where: { id: candidate.id, active: true },
            lock: { mode: 'pessimistic_write' },
          });
          if (badge) await this.awardForBadge(badge, manager);
        });
      }
    } finally {
      this.reconciling = false;
    }
  }

  async evaluateUser(userId: string, manager?: EntityManager): Promise<void> {
    if (!manager) {
      await this.db.transaction((transaction) =>
        this.evaluateUser(userId, transaction),
      );
      return;
    }
    const badges = await manager.getRepository(BadgeDefinition).find({
      where: { active: true },
      select: { id: true },
      order: { id: 'ASC' },
    });
    for (const candidate of badges) {
      const badge = await manager.findOne(BadgeDefinition, {
        where: { id: candidate.id, active: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (badge) await this.awardForBadge(badge, manager, userId);
    }
  }

  /** Caller holds the definition lock, including when creating or activating a badge. */
  async awardForBadge(
    badge: BadgeDefinition,
    manager: EntityManager,
    userId?: string,
  ): Promise<void> {
    if (!badge.active) return;
    const users = await this.metrics(manager, badge.id, userId);
    const eligible = users.filter((user) =>
      meetsBadgeCriteria(badge.criteria, user.metrics),
    );
    for (let start = 0; start < eligible.length; start += 500) {
      const batch = eligible.slice(start, start + 500);
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(BadgeAward)
        .values(
          batch.map((user) => ({ badgeId: badge.id, userId: user.userId })),
        )
        .orIgnore()
        .returning(['id', 'userId'])
        .execute();
      const inserted = result.raw as { id: string; user_id: string }[];
      const metricsByUser = new Map(
        batch.map((user) => [user.userId, user.metrics]),
      );
      for (const award of inserted) {
        await this.audit.recordTransactional(manager, {
          action: AuditAction.BADGE_AWARDED,
          actorType: AuditActorType.SYSTEM,
          entityType: 'badge_award',
          entityId: award.id,
          metadata: {
            badgeId: badge.id,
            userId: award.user_id,
            criteria: badge.criteria,
            metrics: metricsByUser.get(award.user_id),
          },
        });
      }
    }
  }

  private async metrics(
    manager: EntityManager,
    badgeId: string,
    userId?: string,
  ): Promise<UserMetrics[]> {
    const rows: MetricRow[] = await manager.query(
      `
      SELECT u.id AS "userId", g.saved_amount, g.completed_goals,
        CASE WHEN g.target_amount > 0 THEN 100 * g.progress_amount / g.target_amount ELSE NULL END AS savings_progress,
        (SELECT count(*) FROM habit_completions h WHERE h.user_id = u.id) AS habit_completions,
        (SELECT count(*) FROM reflections r WHERE r.user_id = u.id AND (r.body IS NOT NULL OR r.kind = 'voice')) AS reflections,
        u.current_level
      FROM users u
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(saved_amount), 0) AS saved_amount,
          COALESCE(sum(target_amount) FILTER (WHERE target_amount > 0), 0) AS target_amount,
          COALESCE(sum(LEAST(saved_amount, target_amount)) FILTER (WHERE target_amount > 0), 0) AS progress_amount,
          count(*) FILTER (WHERE target_amount > 0 AND saved_amount >= target_amount) AS completed_goals
        FROM user_goals WHERE user_id = u.id AND is_active = true
      ) g ON true
      WHERE u.user_type = $1 AND u.status = $2 AND u.deleted_at IS NULL
        AND ($3::uuid IS NULL OR u.id = $3)
        AND NOT EXISTS (SELECT 1 FROM badge_awards a WHERE a.badge_id = $4 AND a.user_id = u.id)
      ORDER BY u.id
    `,
      [UserType.CUSTOMER, UserStatus.ACTIVE, userId ?? null, badgeId],
    );
    return rows.map(({ userId: id, ...metrics }) => ({
      userId: id,
      metrics: Object.fromEntries(
        Object.entries(metrics).map(([key, value]) => [
          key,
          value === null ? null : Number(value),
        ]),
      ) as BadgeMetrics,
    }));
  }
}
