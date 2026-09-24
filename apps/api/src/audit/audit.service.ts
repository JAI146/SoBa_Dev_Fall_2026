import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuditActorType,
  AuditOutcome,
  type AuditActionValue,
  type AuditActorTypeValue,
  type AuditOutcomeValue,
} from '@purposemint/contracts';
import { EntityManager, Repository } from 'typeorm';
import { AuditEvent } from '../entities/audit-event.entity';

export interface AuditInput {
  action: AuditActionValue;
  outcome?: AuditOutcomeValue;
  actorUserId?: string | null;
  actorType?: AuditActorTypeValue;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Any metadata key whose name suggests credential material is dropped before
 * the row is written. Callers are expected not to pass these at all — this is
 * the backstop, not the policy.
 */
const FORBIDDEN_METADATA_KEY =
  /(password|secret|token|otp|code|hash|authorization|cookie)/i;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  // Uses the caller’s transaction and lets failures roll back the mutation; record() stays best-effort.
  /** Financial/admin mutations must commit their audit record atomically. */
  async recordTransactional(
    manager: EntityManager,
    input: AuditInput,
  ): Promise<void> {
    await manager.save(
      AuditEvent,
      manager.create(AuditEvent, {
        action: input.action,
        outcome: input.outcome ?? AuditOutcome.SUCCESS,
        actorUserId: input.actorUserId ?? null,
        actorType: input.actorType ?? AuditActorType.ADMIN,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: this.sanitize(input.metadata),
      }),
    );
  }

  /**
   * Never throws. A failed audit write must not turn a successful login into a
   * 500 — it is logged loudly instead.
   */
  async record(input: AuditInput): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          action: input.action,
          outcome: input.outcome ?? AuditOutcome.SUCCESS,
          actorUserId: input.actorUserId ?? null,
          actorType: input.actorType ?? AuditActorType.USER,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          ipAddress: input.ipAddress ?? null,
          metadata: this.sanitize(input.metadata),
        }),
      );
    } catch (error) {
      this.logger.error(
        `Could not write audit event ${input.action}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private sanitize(
    metadata: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null {
    if (!metadata) return null;
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (FORBIDDEN_METADATA_KEY.test(key)) {
        this.logger.warn(`Dropped audit metadata key "${key}" — looks secret.`);
        continue;
      }
      safe[key] = value;
    }
    return Object.keys(safe).length > 0 ? safe : null;
  }
}
