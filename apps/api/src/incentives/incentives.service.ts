/**
 * Seeds the inactive welcome program and manages programs, reviews, and events.
 * Transactions combine mutations with audits; locks, version checks, and request
 * keys protect concurrent writes. Records evidence without moving money.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  AuditAction,
  AuditActorType,
  UserType,
  type IncentiveEventInput,
  type IncentiveProgramInput,
  type IncentiveProgramCreate,
  type IncentiveReview,
} from '@purposemint/contracts';
import { AuditService } from '../audit/audit.service';
import { IncentiveProgram } from '../entities/incentive-program.entity';
import { UserIncentiveBenefit } from '../entities/user-incentive-benefit.entity';
import { IncentiveEvent } from '../entities/incentive-event.entity';
import { User } from '../entities/user.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { nextLedgerEntry } from './incentive-ledger';

const DEFAULT_RULES =
  'Provisional: an authorized staff member reviews and documents eligibility. Business eligibility criteria have not been approved. Review these rules before activation.';

@Injectable()
export class IncentivesService implements OnModuleInit {
  constructor(
    private readonly db: DataSource,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    // Never overwrite operator configuration on restart. The migration creates the table first.
    await this.db
      .createQueryBuilder()
      .insert()
      .into(IncentiveProgram)
      .values({
        key: 'welcome_bonus',
        name: '$10 Welcome Bonus',
        amountCents: 1000,
        currency: 'USD',
        active: false,
        rulesProvisional: true,
        eligibilityMode: 'staff_review',
        eligibilityDescription: DEFAULT_RULES,
        version: 1,
      })
      .orIgnore()
      .execute();
  }

  programs() {
    return this.db
      .getRepository(IncentiveProgram)
      .find({ order: { key: 'ASC' } });
  }

  async createProgram(input: IncentiveProgramCreate, actorUserId: string) {
    return this.db.transaction(async (manager) => {
      // A stable key keeps programs distinct even when their display names match.
      const program = await manager.save(
        IncentiveProgram,
        manager.create(IncentiveProgram, {
          ...input,
          key: `program_${randomUUID()}`,
          currency: 'USD',
          active: false,
          rulesProvisional: true,
          eligibilityMode: 'staff_review',
          version: 1,
        }),
      );
      await this.auditWrite(
        manager,
        actorUserId,
        AuditAction.INCENTIVE_PROGRAM_UPDATED,
        program.id,
        { operation: 'create', current: program },
      );
      return program;
    });
  }

  private async auditWrite(
    manager: EntityManager,
    actorUserId: string,
    action: (typeof AuditAction)[keyof typeof AuditAction],
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.audit.recordTransactional(manager, {
      actorUserId,
      actorType: AuditActorType.ADMIN,
      action,
      entityType: 'incentive',
      entityId,
      metadata,
    });
  }

  async updateProgram(
    id: string,
    input: IncentiveProgramInput,
    actorUserId: string,
  ) {
    return this.db.transaction(async (manager) => {
      const program = await manager.findOne(IncentiveProgram, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!program) throw new NotFoundException('Program not found.');
      if (program.version !== input.version)
        throw new ConflictException(
          'Program settings changed. Reload before saving.',
        );
      if (
        !input.rulesProvisional &&
        input.eligibilityDescription === DEFAULT_RULES
      )
        throw new BadRequestException(
          'Replace the provisional eligibility instructions with reviewed business criteria before approving the rules.',
        );
      const previous = { ...program };
      Object.assign(program, input, { version: program.version + 1 });
      await manager.save(program);
      await this.auditWrite(
        manager,
        actorUserId,
        AuditAction.INCENTIVE_PROGRAM_UPDATED,
        id,
        { previous, current: program },
      );
      return program;
    });
  }

  async review(input: IncentiveReview, actorUserId: string) {
    try {
      return await this.db.transaction(async (manager) => {
        const program = await manager.findOne(IncentiveProgram, {
          where: { id: input.programId },
          lock: { mode: 'pessimistic_read' },
        });
        if (!program) throw new NotFoundException('Program not found.');
        const user = await manager.findOneBy(User, {
          id: input.userId,
          userType: UserType.CUSTOMER,
        });
        if (!user) throw new NotFoundException('Customer not found.');
        const existingBenefit = await manager.findOne(UserIncentiveBenefit, {
          where: { userId: user.id, programId: program.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          existingBenefit &&
          (await manager.exists(IncentiveEvent, {
            where: { benefitId: existingBenefit.id, kind: 'award' },
          }))
        )
          throw new ConflictException(
            'An earned benefit keeps its original eligibility decision.',
          );
        const benefit = await manager.save(
          UserIncentiveBenefit,
          manager.create(UserIncentiveBenefit, {
            ...(existingBenefit ?? {}),
            userId: user.id,
            programId: program.id,
            eligible: input.eligible,
            eligibilityReason: input.reason,
            amountCents: program.amountCents,
            ruleSnapshot: program.eligibilityDescription,
            programVersion: program.version,
          }),
        );
        await manager.save(
          IncentiveEvent,
          manager.create(IncentiveEvent, {
            benefitId: benefit.id,
            kind: 'eligibility',
            amountCents: 0,
            actorUserId: actorUserId,
            reason: `${input.eligible ? 'Eligible' : 'Not eligible'}: ${input.reason}\nRules v${program.version}: ${program.eligibilityDescription}`,
            reference: `review:${randomUUID()}`,
            idempotencyKey: randomUUID(),
            requestFingerprint: '',
            occurredAt: new Date(),
          }),
        );
        await this.auditWrite(
          manager,
          actorUserId,
          AuditAction.INCENTIVE_REVIEWED,
          benefit.id,
          { eligible: input.eligible, programVersion: program.version },
        );
        return { id: benefit.id };
      });
    } catch (error) {
      return this.constraintError(error);
    }
  }

  /** Records evidence only. A future provider adapter must use an authenticated source-specific entry point. */
  async recordEvent(
    benefitId: string,
    input: IncentiveEventInput,
    actorUserId: string,
  ) {
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ benefitId, actorUserId, ...input }))
      .digest('hex');
    try {
      return await this.db.transaction(async (manager) => {
        const benefit = await manager.findOne(UserIncentiveBenefit, {
          where: { id: benefitId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!benefit) throw new NotFoundException('Benefit not found.');
        const duplicate = await manager.findOneBy(IncentiveEvent, {
          idempotencyKey: input.idempotencyKey,
        });
        if (duplicate) {
          if (duplicate.requestFingerprint !== fingerprint)
            throw new ConflictException(
              'This request key was already used for different data.',
            );
          return { id: duplicate.id };
        }
        const events = await manager.find(IncentiveEvent, {
          where: { benefitId },
          order: { recordedAt: 'ASC', id: 'ASC' },
        });
        const occurredAt = new Date(input.occurredAt);
        if (
          occurredAt.getTime() > Date.now() ||
          occurredAt < benefit.reviewedAt ||
          events.some((event) => event.occurredAt > occurredAt)
        )
          throw new BadRequestException(
            'Use a time after the eligibility review and previous financial events, no later than now.',
          );
        if (input.kind === 'award') {
          const program = await manager.findOne(IncentiveProgram, {
            where: { id: benefit.programId },
            lock: { mode: 'pessimistic_read' },
          });
          if (!program?.active || program.rulesProvisional)
            throw new BadRequestException(
              'Review the provisional rules and activate the program before recording an award.',
            );
          if (!benefit.eligible)
            throw new BadRequestException(
              'This customer has not been marked eligible.',
            );
          if (benefit.programVersion !== program.version)
            throw new ConflictException(
              'Program settings changed. Review eligibility again before awarding.',
            );
          const user = await manager.findOneBy(User, { id: benefit.userId });
          if (!user || user.status !== 'active')
            throw new BadRequestException(
              'Only active customers can receive a new award.',
            );
        }
        let goalTitle: string | null = null;
        if (input.goalId) {
          const goal = await manager.findOneBy(UserGoal, {
            id: input.goalId,
            userId: benefit.userId,
          });
          if (!goal)
            throw new BadRequestException(
              'The goal must belong to this customer.',
            );
          if (input.kind === 'allocation' && !goal.isActive)
            throw new BadRequestException('Choose an active goal.');
          goalTitle = goal.title;
        }
        const delta = nextLedgerEntry(input, events, benefit.amountCents);
        if (input.kind === 'reversal')
          goalTitle =
            events.find((event) => event.id === input.reversesEventId)
              ?.goalTitle ?? null;
        const event = await manager.save(
          IncentiveEvent,
          manager.create(IncentiveEvent, {
            ...delta,
            category: delta.category as IncentiveEvent['category'],
            goalTitle,
            benefitId,
            reason: input.reason,
            reference: input.reference,
            idempotencyKey: input.idempotencyKey,
            requestFingerprint: fingerprint,
            actorUserId: actorUserId,
            occurredAt,
          }),
        );
        await this.auditWrite(
          manager,
          actorUserId,
          AuditAction.INCENTIVE_EVENT_RECORDED,
          benefitId,
          {
            eventId: event.id,
            kind: event.kind,
            amountCents: event.amountCents,
          },
        );
        return { id: event.id };
      });
    } catch (error) {
      return this.constraintError(error);
    }
  }

  private constraintError(error: unknown): never {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505'
    )
      throw new ConflictException(
        'This customer benefit, award, reversal, or source reference is already recorded.',
      );
    throw error;
  }

  async recordRead(actorUserId: string, target: string) {
    await this.audit.record({
      actorUserId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.INCENTIVES_VIEWED,
      entityType: 'incentive',
      entityId: target,
    });
  }
}
