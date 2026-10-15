import { NotificationEmailSender } from './notification-email.sender';
import { isCurrentReengagement } from './re-engagement-policy';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  AdminPermission,
  AuditAction,
  REQUIRED_NOTIFICATION_KEYS,
  UserType,
  UserStatus,
  hasAdminPermission,
  type CategoryConfiguration,
  type NotificationCategoryPublic,
  type NotificationOperationsQuery,
  type NotificationSettings,
  type NotificationSettingsUpdate,
  type NotificationPreferences,
  type QueueNotificationInput,
} from '@purposemint/contracts';
import { NotificationCategory } from '../entities/notification-category.entity';
import { NotificationJob } from '../entities/notification-job.entity';
import { User } from '../entities/user.entity';
import { CustomRole } from '../entities/custom-role.entity';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import {
  allowedAt,
  DEFAULT_CATEGORIES,
  settingsFor,
} from './notification-policy';
@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly audit: AuditService,
    private readonly emailSender: NotificationEmailSender,
  ) {}
  async onModuleInit() {
    await this.db
      .getRepository(NotificationCategory)
      .createQueryBuilder()
      .insert()
      .values(DEFAULT_CATEGORIES)
      .orIgnore()
      .execute();
  }
  private async categories(
    manager: EntityManager = this.db.manager,
  ): Promise<NotificationCategoryPublic[]> {
    const categories = await manager.find(NotificationCategory, {
      order: { key: 'ASC' },
    });
    return categories.map((c) =>
      (REQUIRED_NOTIFICATION_KEYS as readonly string[]).includes(c.key)
        ? {
            ...c,
            mandatory: true,
            enabled: true,
            pushSupported: true,
            emailSupported: true,
          }
        : c,
    );
  }
  private async user(id: string, manager: EntityManager, lock = false) {
    const user = await manager.getRepository(User).findOne({
      where: { id, userType: UserType.CUSTOMER },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!user) throw new NotFoundException('Customer not found.');
    return user;
  }
  async settings(userId: string) {
    const [user, categories] = await Promise.all([
      this.user(userId, this.db.manager),
      this.categories(),
    ]);
    return {
      settings: settingsFor(
        user.notificationPreferences,
        categories,
        user.timeZone,
      ),
      categories,
      deliveryAvailable: await this.emailSender.ready(),
    };
  }
  async updateSettings(userId: string, input: NotificationSettingsUpdate) {
    await this.db.transaction(async (manager) => {
      const user = await this.user(userId, manager, true),
        categories = await this.categories(manager);
      for (const [key, preference] of Object.entries(input.categories ?? {})) {
        const category = categories.find((c) => c.key === key);
        if (!category)
          throw new BadRequestException(
            'Unknown notification category. Refresh preferences.',
          );
        if (category.mandatory && (!preference.push || !preference.email))
          throw new BadRequestException(
            'Mandatory notifications cannot be disabled.',
          );
        if (
          (!category.pushSupported && preference.push) ||
          (!category.emailSupported && preference.email)
        )
          throw new BadRequestException(
            'This category does not support that channel.',
          );
      }
      const previous = settingsFor(
        user.notificationPreferences,
        categories,
        user.timeZone,
      );
      const next = settingsFor(
        {
          categorySettings: {
            ...previous,
            ...input,
            categories: { ...previous.categories, ...input.categories },
          },
        },
        categories,
        user.timeZone,
      );
      // Store in the existing JSON namespace and preserve unrelated legacy settings.
      user.notificationPreferences = {
        ...user.notificationPreferences,
        categorySettings: next,
        securityAlerts: true,
      } as NotificationPreferences;
      await manager.update(
        User,
        { id: userId },
        { notificationPreferences: user.notificationPreferences },
      );
      await this.reconcilePending(manager, user, next, categories);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.NOTIFICATION_PREFERENCES_UPDATED,
        actorUserId: userId,
        actorType: 'user',
        entityType: 'user',
        entityId: userId,
        metadata: { previous, current: next },
      });
    });
    return this.settings(userId);
  }
  private async reconcilePending(
    manager: EntityManager,
    user: User,
    settings: NotificationSettings,
    categories: NotificationCategoryPublic[],
  ) {
    const emailReady = await this.emailSender.ready();
    const jobs = await manager.find(NotificationJob, {
      where: {
        userId: user.id,
        status: In(['scheduled', 'blocked', 'retry_pending', 'suppressed']),
      },
      lock: { mode: 'pessimistic_write' },
    });
    for (const job of jobs) {
      if (!isCurrentReengagement(job, user, new Date())) {
        job.status = 'cancelled';
        job.reason = 'customer_active';
        await manager.save(job);
        continue;
      }
      const category = categories.find((c) => c.key === job.categoryKey);
      const decision = category
        ? allowedAt(
            category,
            job.channel,
            settings,
            new Date(Math.max(Date.now(), job.scheduledAt.getTime())),
          )
        : null;
      const permitted =
        decision?.allowed &&
        (category?.mandatory || user.status === UserStatus.ACTIVE);
      const ready =
        emailReady && job.channel === 'email' && !category?.mandatory;
      job.status = permitted ? (ready ? 'scheduled' : 'blocked') : 'suppressed';
      job.reason = permitted
        ? ready
          ? 'manual_send_required'
          : 'provider_not_configured'
        : (decision?.reason ??
          (category ? 'account_inactive' : 'category_unavailable'));
      if (decision) job.scheduledAt = decision.scheduledAt;
      await manager.save(job);
    }
  }
  async permissions(principal: AuthPrincipal) {
    const role = principal.customRoleId
      ? await this.db
          .getRepository(CustomRole)
          .findOneBy({ id: principal.customRoleId })
      : null;
    const has = (
      permission: (typeof AdminPermission)[keyof typeof AdminPermission],
    ) =>
      principal.customRoleId
        ? Boolean(
            role && hasAdminPermission(null, permission, role.permissions),
          )
        : hasAdminPermission(principal.adminRole, permission);
    return {
      canManage: has(AdminPermission.NOTIFICATIONS_EDIT),
      canConfigureEmail: has(AdminPermission.SETTINGS_FULL),
    };
  }
  async configure(principal: AuthPrincipal, input: CategoryConfiguration) {
    if ((REQUIRED_NOTIFICATION_KEYS as readonly string[]).includes(input.key))
      throw new BadRequestException(
        'Mandatory categories are managed by platform rules.',
      );
    await this.db.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `notification-category:${input.key}`,
      ]);
      const previous = await manager.findOneBy(NotificationCategory, {
        key: input.key,
      });
      const current = manager.create(NotificationCategory, {
        ...input,
        mandatory: false,
      });
      await manager.save(current);
      const affected = await manager.find(NotificationJob, {
        where: {
          categoryKey: input.key,
          status: In(['scheduled', 'blocked', 'retry_pending', 'suppressed']),
        },
        select: { userId: true },
      });
      const categories = await this.categories(manager);
      for (const userId of [
        ...new Set(affected.map((job) => job.userId)),
      ].sort()) {
        const user = await this.user(userId, manager, true);
        await this.reconcilePending(
          manager,
          user,
          settingsFor(user.notificationPreferences, categories, user.timeZone),
          categories,
        );
      }
      await this.audit.recordTransactional(manager, {
        action: AuditAction.NOTIFICATION_CATEGORY_UPDATED,
        actorUserId: principal.userId,
        entityType: 'notification_category',
        entityId: input.key,
        metadata: { previous, current },
      });
    });
    return this.categories();
  }
  async operations(
    principal: AuthPrincipal,
    query: NotificationOperationsQuery,
  ) {
    const permissions = await this.permissions(principal);
    const qb = this.db
      .getRepository(NotificationJob)
      .createQueryBuilder('job')
      .leftJoin('job.user', 'recipient')
      .addSelect([
        'recipient.id',
        'recipient.displayName',
        'recipient.firstName',
        'recipient.email',
      ]);
    if (query.status)
      qb.andWhere('job.status = :status', { status: query.status });
    if (query.categoryKey)
      qb.andWhere('job.categoryKey = :key', { key: query.categoryKey });
    if (query.channel)
      qb.andWhere('job.channel = :channel', { channel: query.channel });
    if (query.userId)
      qb.andWhere('job.userId = :userId', { userId: query.userId });
    const [items, total] = await qb
      .orderBy('job.createdAt', 'DESC')
      .addOrderBy('job.id', 'DESC')
      .skip((query.page - 1) * 20)
      .take(20)
      .getManyAndCount();
    const counts = await this.db
      .getRepository(NotificationJob)
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .getRawMany<{ status: string; count: string }>();
    return {
      ...permissions,
      items: items.map((j) => this.publicJob(j)),
      total,
      page: query.page,
      pageSize: 20,
      emailConfigured: await this.emailSender.ready(),
      pushConfigured: false as const,
      counts: Object.fromEntries(
        counts.map((c) => [c.status, Number(c.count)]),
      ),
      categories: await this.categories(),
      deliveryAvailable: await this.emailSender.ready(),
    };
  }
  private publicJob(job: NotificationJob) {
    return {
      id: job.id,
      userId: job.userId,
      recipientName: job.user?.displayName ?? job.user?.firstName ?? null,
      recipientEmail: job.user?.email ?? null,
      categoryKey: job.categoryKey,
      eventType: job.eventType,
      channel: job.channel,
      status: job.status,
      mandatory: job.mandatory,
      scheduledAt: job.scheduledAt.toISOString(),
      createdAt: job.createdAt.toISOString(),
      sentAt: job.sentAt?.toISOString() ?? null,
      deliveredAt: job.deliveredAt?.toISOString() ?? null,
      attempts: job.attempts,
      retryRequests: job.retryRequests,
      reason:
        job.reason &&
        [
          'provider_not_configured',
          'manual_send_required',
          'optional_opt_out',
          'quiet_hours',
          'category_unavailable',
          'frequency_limit',
          'customer_active',
          'account_inactive',
        ].includes(job.reason)
          ? job.reason
          : job.reason
            ? 'unknown_error'
            : null,
    };
  }
  async queue(principal: AuthPrincipal, input: QueueNotificationInput) {
    const emailReady = await this.emailSender.ready();
    let inserted = 0;
    await this.db.transaction(async (manager) => {
      const user = await this.user(input.userId, manager, true);
      const categories = await this.categories(manager),
        category = categories.find((c) => c.key === input.categoryKey);
      if (!category)
        throw new BadRequestException('Unknown notification category.');
      const existing = await manager
        .getRepository(NotificationJob)
        .createQueryBuilder('job')
        .where('job.idempotencyKey LIKE :prefix', {
          prefix: `admin:${principal.userId}:${input.requestId}:%`,
        })
        .getMany();
      if (
        existing.some(
          (job) =>
            job.userId !== input.userId ||
            job.categoryKey !== input.categoryKey ||
            job.eventType !== input.eventType ||
            (!category.mandatory && job.channel !== input.channel),
        )
      ) {
        throw new BadRequestException(
          'Request ID was already used for another notification.',
        );
      }
      const settings = settingsFor(
        user.notificationPreferences,
        categories,
        user.timeZone,
      );
      for (const channel of category.mandatory
        ? (['push', 'email'] as const)
        : [input.channel]) {
        const decision = allowedAt(
          category,
          channel,
          settings,
          input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
        );
        const permitted =
          decision.allowed &&
          (category.mandatory || user.status === UserStatus.ACTIVE);
        const ready = emailReady && channel === 'email' && !category.mandatory;
        const result = await manager
          .getRepository(NotificationJob)
          .createQueryBuilder()
          .insert()
          .values({
            userId: user.id,
            categoryKey: category.key,
            eventType: input.eventType,
            channel,
            mandatory: category.mandatory,
            status: permitted
              ? ready
                ? 'scheduled'
                : 'blocked'
              : 'suppressed',
            scheduledAt: decision.scheduledAt,
            idempotencyKey: `admin:${principal.userId}:${input.requestId}:${channel}`,
            reason: permitted
              ? ready
                ? 'manual_send_required'
                : 'provider_not_configured'
              : (decision.reason ?? 'account_inactive'),
          })
          .orIgnore()
          .returning('id')
          .execute();
        inserted += (result.raw as unknown[]).length;
      }
      if (inserted)
        await this.audit.recordTransactional(manager, {
          action: AuditAction.NOTIFICATION_QUEUED,
          actorUserId: principal.userId,
          entityType: 'notification_request',
          entityId: input.requestId,
          metadata: {
            userId: input.userId,
            categoryKey: input.categoryKey,
            eventType: input.eventType,
            queued: inserted,
          },
        });
    });
    return {
      queued: inserted,
      message:
        'Notification saved. Review Activity to send an eligible email manually. Push is not connected.',
    };
  }
  async retry(principal: AuthPrincipal, id: string) {
    const emailReady = await this.emailSender.ready();
    await this.db.transaction(async (manager) => {
      const initial = await manager.findOneBy(NotificationJob, { id });
      if (!initial) throw new NotFoundException('Notification not found.');
      const user = await this.user(initial.userId, manager, true);
      const job = await manager.findOne(NotificationJob, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !job ||
        [
          'sent',
          'delivered',
          'cancelled',
          'processing',
          'delivery_uncertain',
        ].includes(job.status)
      )
        throw new BadRequestException('This notification cannot be retried.');
      if (job.retryRequests >= 5)
        throw new BadRequestException('Retry request limit reached.');
      if (!isCurrentReengagement(job, user, new Date())) {
        job.status = 'cancelled';
        job.reason = 'customer_active';
        await manager.save(job);
        await this.audit.recordTransactional(manager, {
          action: AuditAction.NOTIFICATION_RETRY_REQUESTED,
          actorUserId: principal.userId,
          entityType: 'notification',
          entityId: id,
          metadata: {
            status: job.status,
            reason: job.reason,
            retryRequests: job.retryRequests,
          },
        });
        return;
      }
      const categories = await this.categories(manager),
        category = categories.find((c) => c.key === job.categoryKey);
      if (!category) throw new BadRequestException('Category unavailable.');
      const decision = allowedAt(
        category,
        job.channel,
        settingsFor(user.notificationPreferences, categories, user.timeZone),
        new Date(Math.max(Date.now(), job.scheduledAt.getTime())),
      );
      const permitted =
        decision.allowed &&
        (category.mandatory || user.status === UserStatus.ACTIVE);
      job.retryRequests++;
      const ready =
        emailReady && job.channel === 'email' && !category.mandatory;
      job.status = permitted ? (ready ? 'scheduled' : 'blocked') : 'suppressed';
      job.reason = permitted
        ? ready
          ? 'manual_send_required'
          : 'provider_not_configured'
        : (decision.reason ?? 'account_inactive');
      job.scheduledAt = decision.scheduledAt;
      await manager.save(job);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.NOTIFICATION_RETRY_REQUESTED,
        actorUserId: principal.userId,
        entityType: 'notification',
        entityId: id,
        metadata: {
          status: job.status,
          reason: job.reason,
          retryRequests: job.retryRequests,
        },
      });
    });
    return { message: 'Eligibility rechecked. No delivery was attempted.' };
  }
}
