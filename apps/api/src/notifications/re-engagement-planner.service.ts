import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { UserStatus, UserType, AuditAction } from '@purposemint/contracts';
import { User } from '../entities/user.entity';
import { NotificationJob } from '../entities/notification-job.entity';
import { NotificationCategory } from '../entities/notification-category.entity';
import { AuditService } from '../audit/audit.service';
import { allowedAt, settingsFor } from './notification-policy';
import {
  INACTIVITY_MS,
  REENGAGEMENT_MIN_INTERVAL_HOURS,
  isCurrentReengagement,
  reengagementKey,
} from './re-engagement-policy';
const PENDING = [
  'scheduled',
  'blocked',
  'retry_pending',
  'suppressed',
] as const;
@Injectable()
export class ReEngagementPlanner
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ReEngagementPlanner.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private candidateCursor: string | null = null;
  private pendingCursor: string | null = null;
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly audit: AuditService,
  ) {}
  onApplicationBootstrap() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 60000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.planBatch();
    } catch {
      this.logger.error(
        'Re-engagement planning failed. Check database connectivity and migrations.',
      );
    } finally {
      this.running = false;
    }
  }
  async planBatch(now = new Date(), actorUserId?: string) {
    const outcome = await this.db.transaction(async (manager) => {
      const [lock] = await manager.query<{ locked: boolean }[]>(
        'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked',
        ['purposemint-reengagement-planner'],
      );
      if (!lock.locked) return null;
      const categories = await manager.find(NotificationCategory, {
        order: { key: 'ASC' },
      });
      const category = categories.find(
        (c) => c.key === 'product_communications',
      );
      let cancelled = 0,
        suppressed = 0,
        queued = 0;
      // Recheck existing intentions even when the customer no longer qualifies for a new reminder.
      const pendingQuery = manager
        .getRepository(NotificationJob)
        .createQueryBuilder('job')
        .select('job.userId', 'userId')
        .where('job.eventType = :event AND job.status IN (:...statuses)', {
          event: 're_engagement',
          statuses: [...PENDING],
        })
        .groupBy('job.userId')
        .orderBy('job.userId', 'ASC')
        .limit(100);
      if (this.pendingCursor)
        pendingQuery.andWhere('job.userId > :cursor', {
          cursor: this.pendingCursor,
        });
      const pending = await pendingQuery.getRawMany<{ userId: string }>();
      for (const { userId } of pending) {
        const user = await manager.findOne(User, {
          where: { id: userId },
          withDeleted: true,
          lock: { mode: 'pessimistic_write' },
        });
        const jobs = await manager.find(NotificationJob, {
          where: {
            userId,
            eventType: 're_engagement',
            status: In([...PENDING]),
          },
          lock: { mode: 'pessimistic_write' },
        });
        for (const job of jobs) {
          const previousStatus = job.status;
          const previousReason = job.reason;
          if (
            !user ||
            user.deletedAt ||
            user.userType !== UserType.CUSTOMER ||
            !isCurrentReengagement(job, user, now)
          ) {
            job.status = 'cancelled';
            job.reason =
              user && !user.deletedAt ? 'customer_active' : 'account_inactive';
          } else {
            const settings = settingsFor(
              user.notificationPreferences,
              categories,
              user.timeZone,
            );
            const decision =
              category && !category.mandatory
                ? allowedAt(
                    category,
                    job.channel,
                    settings,
                    new Date(
                      Math.max(now.getTime(), job.scheduledAt.getTime()),
                    ),
                  )
                : null;
            if (
              user.status !== UserStatus.ACTIVE ||
              !user.emailVerifiedAt ||
              !decision?.allowed
            ) {
              job.status = 'suppressed';
              job.reason =
                decision?.reason ??
                (category ? 'account_inactive' : 'category_unavailable');
            } else {
              job.status = 'blocked';
              job.reason = 'provider_not_configured';
              job.scheduledAt = decision.scheduledAt;
            }
          }
          if (job.status !== previousStatus || job.reason !== previousReason) {
            if (job.status === 'cancelled') cancelled++;
            if (job.status === 'suppressed') suppressed++;
          }
          await manager.save(job);
        }
      }
      const candidatesQuery = manager
        .getRepository(User)
        .createQueryBuilder('user')
        .where('user.userType = :type AND user.status = :status', {
          type: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        })
        .andWhere('user.emailVerifiedAt IS NOT NULL')
        .andWhere(
          'COALESCE("user"."last_login_at", "user"."created_at") <= :cutoff',
          { cutoff: new Date(now.getTime() - INACTIVITY_MS) },
        )
        .orderBy('user.id', 'ASC')
        .take(100)
        .setLock('pessimistic_write');
      if (this.candidateCursor)
        candidatesQuery.andWhere('user.id > :cursor', {
          cursor: this.candidateCursor,
        });
      const users =
        category && category.enabled && !category.mandatory
          ? await candidatesQuery.getMany()
          : [];
      for (const user of users) {
        const settings = settingsFor(
          user.notificationPreferences,
          categories,
          user.timeZone,
        );
        for (const channel of ['push', 'email'] as const) {
          const decision = allowedAt(category!, channel, settings, now);
          if (!decision.allowed) continue;
          const recent = await manager
            .getRepository(NotificationJob)
            .createQueryBuilder('job')
            .where(
              'job.userId = :id AND job.eventType = :event AND job.channel = :channel',
              { id: user.id, event: 're_engagement', channel },
            )
            .andWhere(
              '(job.createdAt >= :since OR job.scheduledAt >= :since OR job.sentAt >= :since)',
              {
                since: new Date(
                  now.getTime() -
                    Math.max(
                      REENGAGEMENT_MIN_INTERVAL_HOURS,
                      category!.minIntervalHours,
                    ) *
                      3600000,
                ),
              },
            )
            .getCount();
          if (recent) continue;
          const result = await manager
            .getRepository(NotificationJob)
            .createQueryBuilder()
            .insert()
            .values({
              userId: user.id,
              categoryKey: category!.key,
              eventType: 're_engagement',
              channel,
              mandatory: false,
              status: 'blocked',
              reason: 'provider_not_configured',
              scheduledAt: decision.scheduledAt,
              createdAt: now,
              idempotencyKey: reengagementKey(user, channel),
            })
            .orIgnore()
            .returning('id')
            .execute();
          queued += (result.raw as unknown[]).length;
        }
      }
      if (queued || cancelled || suppressed)
        await this.audit.recordTransactional(manager, {
          action: AuditAction.REENGAGEMENT_PLANNED,
          actorType: actorUserId ? 'admin' : 'system',
          actorUserId,
          entityType: 'notification_planner',
          metadata: {
            queued,
            cancelled,
            suppressed,
            examined: users.length,
            checkedAt: now.toISOString(),
          },
        });
      return {
        queued,
        cancelled,
        suppressed,
        examined: users.length,
        candidateCursor: users.length === 100 ? users.at(-1)!.id : null,
        pendingCursor: pending.length === 100 ? pending.at(-1)!.userId : null,
      };
    });
    if (!outcome)
      return {
        queued: 0,
        cancelled: 0,
        suppressed: 0,
        examined: 0,
        busy: true,
        deliveryAvailable: false as const,
      };
    this.candidateCursor = outcome.candidateCursor;
    this.pendingCursor = outcome.pendingCursor;
    return {
      queued: outcome.queued,
      cancelled: outcome.cancelled,
      suppressed: outcome.suppressed,
      examined: outcome.examined,
      busy: false,
      deliveryAvailable: false as const,
    };
  }
}
