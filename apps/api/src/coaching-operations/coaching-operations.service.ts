import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  AuditAction,
  AuditOutcome,
  coachingOperationSchema,
  coachingGenerationSchema,
  notificationStatusSchema,
  coachingEventSchema,
  coachingErrorSchema,
  coachingFlagSchema,
  coachingSourceSchema,
  healthReportInputSchema,
  type CoachingOperationsQuery,
} from '@purposemint/contracts';
import { CoachingOperation } from '../entities/coaching-operation.entity';
import { AuditEvent } from '../entities/audit-event.entity';
const TTL_MS = 24 * 3600000;
export function publicCoachingOperation(row: CoachingOperation) {
  // Explicit allowlist projection prevents accidental future columns leaking into responses.
  return coachingOperationSchema.parse({
    id: row.id,
    eventType: coachingEventSchema.safeParse(row.eventType).success
      ? row.eventType
      : 'unknown_event',
    generationStatus: coachingGenerationSchema.safeParse(row.generationStatus)
      .success
      ? row.generationStatus
      : 'blocked',
    deliveryStatus: notificationStatusSchema.safeParse(row.deliveryStatus)
      .success
      ? row.deliveryStatus
      : 'blocked',
    errorCode:
      row.errorCode === null
        ? null
        : coachingErrorSchema.safeParse(row.errorCode).success
          ? row.errorCode
          : 'unknown_error',
    safetyFlags: Array.isArray(row.safetyFlags)
      ? [
          ...new Set(
            row.safetyFlags.filter(
              (flag) => coachingFlagSchema.safeParse(flag).success,
            ),
          ),
        ]
      : [],
    source: coachingSourceSchema.safeParse(row.source).success
      ? row.source
      : 'development_sample',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
@Injectable()
export class CoachingOperationsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}
  async overview(query: CoachingOperationsQuery) {
    const repo = this.db.getRepository(CoachingOperation),
      qb = repo.createQueryBuilder('operation');
    for (const key of [
      'eventType',
      'generationStatus',
      'deliveryStatus',
      'source',
    ] as const)
      if (query[key])
        qb.andWhere(`operation.${key} = :${key}`, { [key]: query[key] });
    if (query.safetyFlag)
      qb.andWhere('operation.safetyFlags @> CAST(:flags AS jsonb)', {
        flags: JSON.stringify([query.safetyFlag]),
      });
    const [rows, total] = await qb
      .orderBy('operation.createdAt', 'DESC')
      .addOrderBy('operation.id', 'DESC')
      .skip((query.page - 1) * 20)
      .take(20)
      .getManyAndCount();
    const totals = await repo
      .createQueryBuilder('operation')
      .select('COUNT(*)', 'total')
      .addSelect(
        "COUNT(*) FILTER (WHERE operation.generationStatus = 'generated')",
        'generated',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE operation.generationStatus = 'failed' OR operation.deliveryStatus = 'failed')",
        'failed',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE operation.safetyFlags @> '["review_required"]'::jsonb)`,
        'reviewRequired',
      )
      .getRawOne<{
        total: string;
        generated: string;
        failed: string;
        reviewRequired: string;
      }>();
    const observation = await this.db
      .getRepository(AuditEvent)
      .createQueryBuilder('event')
      .where(
        'event.action = :action AND event.outcome = :outcome AND event.entityId = :service',
        {
          action: AuditAction.SYSTEM_HEALTH_REPORTED,
          outcome: AuditOutcome.SUCCESS,
          service: 'kiromoney',
        },
      )
      .andWhere("event.metadata -> 'current' ->> 'affectedUserId' IS NULL")
      .orderBy('event.createdAt', 'DESC')
      .addOrderBy('event.id', 'DESC')
      .getOne();
    const report = healthReportInputSchema.safeParse(
      observation?.metadata?.current,
    );
    const valid =
      observation && report.success && report.data.serviceId === 'kiromoney';
    const stale = Boolean(
      valid && Date.now() - observation.createdAt.getTime() >= TTL_MS,
    );
    return {
      items: rows.map(publicCoachingOperation),
      total,
      page: query.page,
      pageSize: 20 as const,
      counts: {
        total: Number(totals?.total ?? 0),
        generated: Number(totals?.generated ?? 0),
        failed: Number(totals?.failed ?? 0),
        reviewRequired: Number(totals?.reviewRequired ?? 0),
      },
      service: {
        status: valid && !stale ? report.data.status : 'action_required',
        source: valid ? 'staff_report' : 'not_monitored',
        checkedAt: valid ? observation.createdAt.toISOString() : null,
        stale,
      },
      integrationAvailable: false as const,
    };
  }
}
