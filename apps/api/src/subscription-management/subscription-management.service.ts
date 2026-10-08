import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuditAction,
  AuditActorType,
  UserType,
  type AdminPlanInput,
  type AdminPlan,
  type AdminPlansQuery,
  type AdminSubscriptionsQuery,
  type BillingTerms,
  type SubscriptionAssignInput,
  type SubscriptionChangeInput,
  type SubscriptionCancelInput,
  type SubscriptionPaymentInput,
  type PlanEntitlements,
  type PlanLimits,
  type AdminSubscriptionDetail,
} from '@purposemint/contracts';
import { EntityManager, Repository, QueryFailedError } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { UserSubscription } from '../entities/user-subscription.entity';
import { SubscriptionHistory } from '../entities/subscription-history.entity';
import { SubscriptionBillingRecord } from '../entities/subscription-billing-record.entity';
import { User } from '../entities/user.entity';
import { captureTerms, changeAction, nextRenewal } from './subscription-policy';

const emptyEntitlements: PlanEntitlements = {
  pathways: false,
  communityChallenges: false,
};
const emptyLimits: PlanLimits = {
  pathwayApplications: null,
  challengeParticipations: null,
};

@Injectable()
export class SubscriptionManagementService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SubscriptionManagementService.name);
  private timer?: ReturnType<typeof setInterval>;
  private sweeping = false;
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly plans: Repository<SubscriptionPlan>,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.applyDue().catch((error: unknown) =>
        this.logger.error(
          'Scheduled subscription changes could not be applied.',
          error instanceof Error ? error.stack : undefined,
        ),
      );
    }, 30000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  capabilities() {
    return [
      {
        key: 'pathways' as const,
        name: 'Pathways',
        description: 'Access pathways, partner selection, and applications.',
        limitKey: 'pathwayApplications' as const,
      },
      {
        key: 'communityChallenges' as const,
        name: 'Community challenges',
        description: 'Join community challenges.',
        limitKey: 'challengeParticipations' as const,
      },
    ];
  }

  async listPlans(query: AdminPlansQuery) {
    const qb = this.plans.createQueryBuilder('plan');
    if (query.search)
      qb.andWhere('(plan.name ILIKE :search OR plan.key ILIKE :search)', {
        search: `%${query.search}%`,
      });
    if (query.active)
      qb.andWhere('plan.active = :active', { active: query.active === 'true' });
    const [items, total] = await qb
      .orderBy('plan.sortOrder', 'ASC')
      .addOrderBy('plan.key', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items: items.map(toAdminPlan), ...pagination(query, total) };
  }

  async savePlan(
    input: AdminPlanInput,
    actor: string,
    ip: string | null,
    expectedVersion?: number,
  ) {
    return this.plans.manager.transaction(async (manager) => {
      // Serialize default-plan switches across otherwise independent plan rows.
      await manager.query('SELECT pg_advisory_xact_lock(1791000100)');
      let plan = await manager.findOne(SubscriptionPlan, {
        where: { key: input.key },
        lock: { mode: 'pessimistic_write' },
      });
      if (expectedVersion === undefined && plan)
        throw new ConflictException('This plan key is already in use.');
      if (expectedVersion !== undefined && !plan)
        throw new NotFoundException('Plan not found.');
      if (plan && plan.version !== expectedVersion)
        throw new ConflictException('This plan changed. Reload before saving.');
      if (plan?.isDefault && !input.isDefault)
        throw new BadRequestException(
          'Choose another default plan before removing this default.',
        );
      const oldDefault = input.isDefault
        ? await manager.findOne(SubscriptionPlan, {
            where: { isDefault: true },
            lock: { mode: 'pessimistic_write' },
          })
        : null;
      if (oldDefault && oldDefault.key !== input.key) {
        oldDefault.isDefault = false;
        oldDefault.version++;
        await manager.save(oldDefault);
      }
      const previous = plan ? toAdminPlan(plan) : null;
      plan = manager.create(SubscriptionPlan, {
        ...input,
        availableFrom: input.availableFrom
          ? new Date(input.availableFrom)
          : null,
        availableUntil: input.availableUntil
          ? new Date(input.availableUntil)
          : null,
        version: (plan?.version ?? 0) + 1,
      });
      try {
        await manager.save(plan);
      } catch (error) {
        if (uniqueViolation(error))
          throw new ConflictException('This plan key is already in use.');
        throw error;
      }
      await this.audit.recordTransactional(manager, {
        action: previous
          ? AuditAction.ADMIN_PLAN_UPDATED
          : AuditAction.ADMIN_PLAN_CREATED,
        actorUserId: actor,
        ipAddress: ip,
        entityType: 'subscription_plan',
        entityId: plan.key,
        metadata: {
          previous,
          current: toAdminPlan(plan),
          previousDefaultPlan: oldDefault?.key ?? null,
          pricingRule:
            'existing subscription billing snapshots remain unchanged',
        },
      });
      return toAdminPlan(plan);
    });
  }

  async listSubscriptions(query: AdminSubscriptionsQuery) {
    await this.enrollNewCustomers();
    await this.applyDue();
    const qb = this.plans.manager
      .createQueryBuilder(UserSubscription, 'subscription')
      .innerJoinAndSelect('subscription.user', 'user')
      .innerJoinAndSelect('subscription.plan', 'plan');
    if (query.search)
      qb.andWhere(
        '(user.email ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    if (query.status)
      qb.andWhere('subscription.status = :status', { status: query.status });
    if (query.planKey)
      qb.andWhere('subscription.plan_key = :planKey', {
        planKey: query.planKey,
      });
    const [items, total] = await qb
      .orderBy('subscription.startedAt', 'DESC')
      .addOrderBy('subscription.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items: items.map(toSubscription), ...pagination(query, total) };
  }

  async detail(id: string): Promise<AdminSubscriptionDetail> {
    const existing = await this.plans.manager.findOneBy(UserSubscription, {
      id,
    });
    if (!existing) throw new NotFoundException('Subscription not found.');
    await this.plans.manager.transaction(async (manager) => {
      await this.lockUser(manager, existing.userId);
      const row = await this.lockSubscription(manager, id);
      await this.applyPending(manager, row);
    });
    const [subscription, history, billingRecords] = await Promise.all([
      this.plans.manager.findOneOrFail(UserSubscription, {
        where: { id },
        relations: { user: true, plan: true },
      }),
      this.plans.manager.find(SubscriptionHistory, {
        where: { subscriptionId: id },
        order: { recordedAt: 'DESC', id: 'DESC' },
      }),
      this.plans.manager.find(SubscriptionBillingRecord, {
        where: { subscriptionId: id },
        order: { recordedAt: 'DESC', id: 'DESC' },
      }),
    ]);
    return {
      subscription: toSubscription(subscription),
      history: history.map((h) => ({
        id: h.id,
        action: h.action,
        previousPlanKey: h.previousPlanKey,
        newPlanKey: h.newPlanKey,
        previousBilling: h.previousBilling,
        newBilling: h.newBilling,
        effectiveAt: h.effectiveAt.toISOString(),
        recordedAt: h.recordedAt.toISOString(),
        authorizedBy: h.authorizedBy,
      })),
      billingRecords: billingRecords.map((r) => ({
        id: r.id,
        status: r.status,
        amountCents: r.amountCents,
        billing: r.billing,
        periodEndsAt: r.periodEndsAt.toISOString(),
        occurredAt: r.occurredAt.toISOString(),
        recordedAt: r.recordedAt.toISOString(),
        reference: r.reference,
        note: r.note,
        authorizedBy: r.authorizedBy,
      })),
    };
  }

  async assign(
    input: SubscriptionAssignInput,
    actor: string,
    ip: string | null,
  ) {
    const id = await this.plans.manager.transaction(async (manager) => {
      await this.lockUser(manager, input.userId);
      if (await manager.findOneBy(UserSubscription, { userId: input.userId }))
        throw new ConflictException(
          'This customer already has a subscription. Use Change plan to preserve its history.',
        );
      const at = new Date();
      const plan = await this.lockPlan(manager, input.planKey);
      if (plan.version !== input.expectedPlanVersion)
        throw new ConflictException(
          'This plan changed. Reload the plan before saving.',
        );
      const terms = captureTerms(plan, input.cycle, at);
      const row = await manager.save(
        manager.create(UserSubscription, {
          userId: input.userId,
          planKey: terms.planKey,
          billing: terms,
          status: 'active',
          paymentStatus: terms.amountCents === 0 ? 'not_required' : 'pending',
          startedAt: at,
          renewalAt: nextRenewal(at, terms.cycle),
          cancelledAt: null,
          pendingChange: null,
          failedPayments: 0,
          version: 1,
        }),
      );
      await this.history(manager, row, 'assigned', null, terms, at, actor, ip);
      return row.id;
    });
    return this.detail(id);
  }

  async change(
    id: string,
    input: SubscriptionChangeInput,
    actor: string,
    ip: string | null,
  ) {
    return this.mutate(id, input.expectedVersion, async (manager, row) => {
      if (row.pendingChange)
        throw new ConflictException(
          'Remove the scheduled change before requesting another change.',
        );
      if (
        input.timing === 'renewal' &&
        (row.status === 'cancelled' || row.renewalAt <= new Date())
      )
        throw new BadRequestException(
          'A future renewal date is required for a scheduled change.',
        );
      const at = input.timing === 'renewal' ? row.renewalAt : new Date();
      const plan = await this.lockPlan(manager, input.planKey);
      if (plan.version !== input.expectedPlanVersion)
        throw new ConflictException(
          'This plan changed. Reload the plan before saving.',
        );
      const terms = captureTerms(plan, input.cycle, at);
      if (
        row.status !== 'cancelled' &&
        JSON.stringify(terms) === JSON.stringify(row.billing)
      )
        throw new BadRequestException(
          'The subscription already has these billing terms.',
        );
      const previous = row.billing;
      const action =
        row.status === 'cancelled'
          ? 'reactivated'
          : changeAction(previous, terms);
      if (input.timing === 'renewal')
        row.pendingChange = {
          action: 'change',
          effectiveAt: at.toISOString(),
          authorizedBy: actor,
          terms,
        };
      else this.applyTerms(row, terms, at);
      row.version++;
      await manager.save(row);
      await this.history(
        manager,
        row,
        input.timing === 'renewal' ? `${action}_scheduled` : action,
        previous,
        terms,
        at,
        actor,
        ip,
      );
    });
  }

  async cancel(
    id: string,
    input: SubscriptionCancelInput,
    actor: string,
    ip: string | null,
  ) {
    return this.mutate(id, input.expectedVersion, async (manager, row) => {
      if (row.status === 'cancelled')
        throw new BadRequestException(
          'This subscription is already cancelled.',
        );
      if (row.pendingChange)
        throw new ConflictException(
          'Remove the scheduled change before cancelling.',
        );
      if (input.timing === 'renewal' && row.renewalAt <= new Date())
        throw new BadRequestException('A future renewal date is required.');
      const at = input.timing === 'renewal' ? row.renewalAt : new Date();
      if (input.timing === 'renewal')
        row.pendingChange = {
          action: 'cancel',
          effectiveAt: at.toISOString(),
          authorizedBy: actor,
          terms: null,
        };
      else {
        row.status = 'cancelled';
        row.cancelledAt = at;
      }
      row.version++;
      await manager.save(row);
      await this.history(
        manager,
        row,
        input.timing === 'renewal' ? 'cancellation_scheduled' : 'cancelled',
        row.billing,
        null,
        at,
        actor,
        ip,
      );
    });
  }

  async clearPending(
    id: string,
    expectedVersion: number,
    actor: string,
    ip: string | null,
  ) {
    return this.mutate(id, expectedVersion, async (manager, row) => {
      if (!row.pendingChange)
        throw new BadRequestException('There is no scheduled change.');
      const removed = row.pendingChange;
      row.pendingChange = null;
      row.version++;
      await manager.save(row);
      await this.history(
        manager,
        row,
        'scheduled_change_removed',
        removed.terms,
        row.billing,
        new Date(),
        actor,
        ip,
      );
    });
  }

  async payment(
    id: string,
    input: SubscriptionPaymentInput,
    actor: string,
    ip: string | null,
  ) {
    return this.mutate(id, input.expectedVersion, async (manager, row) => {
      if (row.status === 'cancelled')
        throw new BadRequestException(
          'Payments cannot reactivate a cancelled subscription.',
        );
      const now = new Date();
      if (Date.parse(input.occurredAt) > now.getTime())
        throw new BadRequestException(
          'A payment cannot be recorded in the future.',
        );
      const due = row.renewalAt <= now;
      if (input.status === 'paid' && row.paymentStatus === 'paid' && !due)
        throw new ConflictException(
          'A successful payment is already recorded for this billing period.',
        );
      const amount =
        due &&
        row.billing.promotionEndsAt &&
        Date.parse(row.billing.promotionEndsAt) <= row.renewalAt.getTime()
          ? row.billing.regularAmountCents
          : row.billing.amountCents;
      if (input.amountCents !== amount || amount === 0)
        throw new BadRequestException(
          'Payment amount must match the agreed billing amount.',
        );
      try {
        await manager.save(
          manager.create(SubscriptionBillingRecord, {
            subscriptionId: row.id,
            status: input.status,
            amountCents: input.amountCents,
            billing: { ...row.billing, amountCents: amount },
            periodEndsAt: row.renewalAt,
            reference: input.reference,
            note: input.note,
            occurredAt: new Date(input.occurredAt),
            authorizedBy: actor,
          }),
        );
      } catch (error) {
        if (uniqueViolation(error))
          throw new ConflictException(
            'This payment reference has already been recorded.',
          );
        throw error;
      }
      row.paymentStatus = input.status;
      row.status = input.status === 'failed' ? 'past_due' : 'active';
      if (input.status === 'failed') row.failedPayments++;
      if (input.status === 'paid' && due) {
        if (amount !== row.billing.amountCents)
          row.billing = {
            ...row.billing,
            amountCents: amount,
            promotionEndsAt: null,
          };
        // One recorded payment covers one period; missed periods are not silently waived.
        row.renewalAt = nextRenewal(row.renewalAt, row.billing.cycle);
        if (row.renewalAt <= now) row.status = 'past_due';
      }
      row.version++;
      await manager.save(row);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_SUBSCRIPTION_PAYMENT_RECORDED,
        actorUserId: actor,
        ipAddress: ip,
        entityType: 'subscription',
        entityId: id,
        metadata: { ...input, source: 'staff_recorded', billing: row.billing },
      });
    });
  }

  /** Uses the caller's transaction when capability checks accompany a write. */
  async access(
    userId: string,
    manager?: EntityManager,
  ): Promise<{
    entitlements: PlanEntitlements;
    limits: PlanLimits;
    planKey: string;
  }> {
    if (!manager)
      return this.plans.manager.transaction(async (m) => {
        await this.lockUser(m, userId);
        return this.access(userId, m);
      });
    const user = await manager.findOneBy(User, { id: userId });
    if (!user) throw new NotFoundException('User not found.');
    let row = await manager.findOne(UserSubscription, {
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row) row = await this.enroll(manager, user);
    if (row) await this.applyPending(manager, row);
    const planKey = row.planKey;
    const plan = await manager.findOneBy(SubscriptionPlan, { key: planKey });
    const allowed = row.status === 'active';
    return {
      planKey,
      entitlements: allowed && plan ? plan.entitlements : emptyEntitlements,
      limits: allowed && plan ? plan.limits : emptyLimits,
    };
  }

  async applyDue() {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      await this.enrollNewCustomers();
      const rows = await this.plans.manager
        .createQueryBuilder(UserSubscription, 's')
        .innerJoin('s.user', 'user')
        .where(
          "s.pending_change IS NOT NULL AND (s.pending_change->>'effectiveAt')::timestamptz <= :now",
          { now: new Date() },
        )
        .orderBy('s.renewalAt', 'ASC')
        .take(100)
        .getMany();
      for (const row of rows)
        await this.plans.manager.transaction(async (manager) => {
          await this.lockUser(manager, row.userId);
          await this.applyPending(
            manager,
            await this.lockSubscription(manager, row.id),
          );
        });
    } finally {
      this.sweeping = false;
    }
  }

  private async enrollNewCustomers() {
    const users = await this.plans.manager
      .createQueryBuilder(User, 'user')
      .leftJoin(UserSubscription, 's', 's.user_id = user.id')
      .where('user.user_type = :type AND s.id IS NULL', {
        type: UserType.CUSTOMER,
      })
      .orderBy('user.createdAt', 'ASC')
      .take(100)
      .getMany();
    for (const user of users)
      await this.plans.manager.transaction(async (manager) => {
        const locked = await this.lockUser(manager, user.id);
        if (!(await manager.findOneBy(UserSubscription, { userId: user.id })))
          await this.enroll(manager, locked);
      });
  }
  private async enroll(manager: EntityManager, user: User) {
    const plan = await manager.findOne(SubscriptionPlan, {
      where: { isDefault: true },
      lock: { mode: 'pessimistic_read' },
    });
    if (!plan)
      throw new BadRequestException(
        'Configure a default subscription plan before enrolling customers.',
      );
    const at = new Date();
    const terms = captureTerms(plan, 'monthly', at);
    const row = await manager.save(
      manager.create(UserSubscription, {
        userId: user.id,
        planKey: plan.key,
        billing: terms,
        status: 'active',
        paymentStatus: 'not_required',
        startedAt: at,
        renewalAt: nextRenewal(at, 'monthly'),
        cancelledAt: null,
        pendingChange: null,
        failedPayments: 0,
        version: 1,
      }),
    );
    await this.history(
      manager,
      row,
      'default_assigned',
      null,
      terms,
      at,
      null,
      null,
    );
    return row;
  }

  private async mutate(
    id: string,
    expectedVersion: number,
    update: (manager: EntityManager, row: UserSubscription) => Promise<void>,
  ) {
    await this.plans.manager.transaction(async (manager) => {
      const existing = await manager.findOneBy(UserSubscription, { id });
      if (!existing) throw new NotFoundException('Subscription not found.');
      await this.lockUser(manager, existing.userId);
      const row = await this.lockSubscription(manager, id);
      await this.applyPending(manager, row);
      if (row.version !== expectedVersion)
        throw new ConflictException(
          'This subscription changed. Reload before saving.',
        );
      await update(manager, row);
    });
    return this.detail(id);
  }

  private async applyPending(manager: EntityManager, row: UserSubscription) {
    const pending = row.pendingChange;
    if (!pending || Date.parse(pending.effectiveAt) > Date.now()) return;
    const previous = row.billing;
    const at = new Date(pending.effectiveAt);
    if (pending.action === 'cancel') {
      row.status = 'cancelled';
      row.cancelledAt = at;
    } else if (pending.terms) this.applyTerms(row, pending.terms, at);
    row.pendingChange = null;
    row.version++;
    await manager.save(row);
    await this.history(
      manager,
      row,
      pending.action === 'cancel'
        ? 'cancelled'
        : changeAction(previous, row.billing),
      previous,
      pending.terms,
      at,
      pending.authorizedBy,
      null,
    );
  }
  private applyTerms(row: UserSubscription, terms: BillingTerms, at: Date) {
    row.planKey = terms.planKey;
    row.billing = terms;
    row.status = 'active';
    row.paymentStatus = terms.amountCents === 0 ? 'not_required' : 'pending';
    row.renewalAt = nextRenewal(at, terms.cycle);
    row.cancelledAt = null;
  }
  private async history(
    manager: EntityManager,
    row: UserSubscription,
    action: string,
    previous: BillingTerms | null,
    next: BillingTerms | null,
    effectiveAt: Date,
    actor: string | null,
    ip: string | null,
  ) {
    await manager.save(
      manager.create(SubscriptionHistory, {
        subscriptionId: row.id,
        action,
        previousPlanKey: previous?.planKey ?? null,
        newPlanKey: next?.planKey ?? null,
        previousBilling: previous,
        newBilling: next,
        effectiveAt,
        authorizedBy: actor,
      }),
    );
    await this.audit.recordTransactional(manager, {
      action: AuditAction.ADMIN_SUBSCRIPTION_CHANGED,
      actorUserId: actor,
      actorType: actor ? AuditActorType.ADMIN : AuditActorType.SYSTEM,
      ipAddress: ip,
      entityType: 'subscription',
      entityId: row.id,
      metadata: {
        action,
        previousBilling: previous,
        newBilling: next,
        effectiveAt: effectiveAt.toISOString(),
      },
    });
  }
  private async lockUser(manager: EntityManager, id: string) {
    const user = await manager.findOne(User, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user || user.userType !== UserType.CUSTOMER)
      throw new NotFoundException('Customer not found.');
    return user;
  }
  private async lockPlan(manager: EntityManager, key: string) {
    const plan = await manager.findOne(SubscriptionPlan, {
      where: { key },
      lock: { mode: 'pessimistic_read' },
    });
    if (!plan) throw new NotFoundException('Plan not found.');
    return plan;
  }
  private async lockSubscription(manager: EntityManager, id: string) {
    const row = await manager.findOne(UserSubscription, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row) throw new NotFoundException('Subscription not found.');
    return row;
  }
}

export function toAdminPlan(plan: SubscriptionPlan): AdminPlan {
  return {
    key: plan.key,
    name: plan.name,
    description: plan.description,
    tagline: plan.tagline,
    badge: plan.badge,
    ctaLabel: plan.ctaLabel,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    billingCycles: plan.billingCycles,
    features: plan.features,
    entitlements: plan.entitlements,
    limits: plan.limits,
    active: plan.active,
    isDefault: plan.isDefault,
    available: plan.available,
    availableFrom: plan.availableFrom?.toISOString() ?? null,
    availableUntil: plan.availableUntil?.toISOString() ?? null,
    sortOrder: plan.sortOrder,
    promotion: plan.promotion,
    version: plan.version,
  };
}
function toSubscription(row: UserSubscription) {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user ? `${row.user.firstName} ${row.user.lastName}` : '',
    userEmail: row.user?.email ?? '',
    planKey: row.planKey,
    planName: row.plan?.name ?? row.billing.planName,
    status: row.status,
    billing: row.billing,
    paymentStatus: row.paymentStatus,
    startedAt: row.startedAt.toISOString(),
    renewalAt: row.renewalAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    pendingChange: row.pendingChange,
    entitlements:
      row.status === 'active'
        ? (row.plan?.entitlements ?? emptyEntitlements)
        : emptyEntitlements,
    limits:
      row.status === 'active' ? (row.plan?.limits ?? emptyLimits) : emptyLimits,
    failedPayments: row.failedPayments,
    version: row.version,
  };
}
function pagination(query: { page: number; pageSize: number }, total: number) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
function uniqueViolation(error: unknown) {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}
