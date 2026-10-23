import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  AdminPermission,
  AuditAction,
  AuditOutcome,
  UserType,
  hasAdminPermission,
  healthReportInputSchema,
  type HealthReport,
  type HealthReportInput,
  type MonitoredService,
  type SystemHealthResponse,
} from '@purposemint/contracts';
import { AuditEvent } from '../entities/audit-event.entity';
import { User } from '../entities/user.entity';
import { CustomRole } from '../entities/custom-role.entity';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';

export const REPORT_TTL_MS = 24 * 60 * 60 * 1000;
const catalog = [
  ['synctera_kyc', 'Synctera KYC', 'Synctera'],
  ['synctera_banking', 'Synctera Banking', 'Synctera'],
  ['synctera_payments', 'Synctera Payments', 'Synctera'],
  ['kiromoney', 'KiroMoney', 'Coaching'],
  ['notifications', 'Notification Provider', 'Communications'],
] as const;
export function providerServices(
  reports: HealthReport[],
  now: Date,
): MonitoredService[] {
  return catalog.map(([id, name, group]) => {
    // A customer incident cannot overwrite a provider's overall service status.
    const report = reports.find((r) => r.serviceId === id && !r.affectedUserId);
    const stale = Boolean(
      report && now.getTime() - Date.parse(report.recordedAt) >= REPORT_TTL_MS,
    );
    return {
      id,
      name,
      group,
      status: !report || stale ? 'action_required' : report.status,
      category: report?.category ?? 'undetermined',
      source: report ? 'staff_report' : 'not_monitored',
      summary: !report
        ? 'No provider monitor connected. Record a verified operational observation.'
        : stale
          ? 'Staff report expired after 24 hours. Recheck this service.'
          : report.summary,
      checkedAt: report?.recordedAt ?? null,
      latencyMs: null,
      stale,
    };
  });
}
export function overallHealth(
  services: MonitoredService[],
): SystemHealthResponse['overallStatus'] {
  return (
    (['failed', 'action_required', 'degraded', 'healthy'] as const).find(
      (status) => services.some((service) => service.status === status),
    ) ?? 'action_required'
  );
}
async function bounded<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Health observation timed out')),
          3000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
@Injectable()
export class SystemHealthService {
  private snapshot: Promise<Omit<SystemHealthResponse, 'canReport'>> | null =
    null;
  private cachedAt = 0;
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly audit: AuditService,
  ) {}
  async overview(principal: AuthPrincipal): Promise<SystemHealthResponse> {
    const customRole = principal.customRoleId
      ? await this.db
          .getRepository(CustomRole)
          .findOneBy({ id: principal.customRoleId })
      : null;
    const canReport = principal.customRoleId
      ? Boolean(
          customRole &&
          hasAdminPermission(
            null,
            AdminPermission.SETTINGS_FULL,
            customRole.permissions,
          ),
        )
      : hasAdminPermission(principal.adminRole, AdminPermission.SETTINGS_FULL);
    if (!this.snapshot || Date.now() - this.cachedAt > 15000) {
      this.cachedAt = Date.now();
      this.snapshot = this.observe().catch((error: unknown) => {
        this.snapshot = null;
        throw error;
      });
    }
    return { ...(await this.snapshot), canReport };
  }
  private async observe(): Promise<Omit<SystemHealthResponse, 'canReport'>> {
    const start = Date.now();
    let databaseOk = true;
    try {
      await bounded(this.db.query('SELECT 1'));
    } catch {
      databaseOk = false;
    }
    const now = new Date();
    const services: MonitoredService[] = [
      {
        id: 'api',
        name: 'PurposeMint API',
        group: 'PurposeMint',
        status: 'healthy',
        category: 'purposemint',
        source: 'live_check',
        summary:
          'This authenticated health endpoint responded. Other API routes are not checked.',
        checkedAt: now.toISOString(),
        latencyMs: null,
        stale: false,
      },
      {
        id: 'database',
        name: 'PostgreSQL Database',
        group: 'PurposeMint',
        status: databaseOk ? 'healthy' : 'failed',
        category: 'purposemint',
        source: 'live_check',
        summary: databaseOk
          ? 'Database answered a read-only connectivity check.'
          : 'Database connectivity check failed or exceeded 3 seconds.',
        checkedAt: now.toISOString(),
        latencyMs: databaseOk ? Date.now() - start : null,
        stale: false,
      },
    ];
    let reportsAvailable = databaseOk;
    let reports: HealthReport[] = [];
    if (databaseOk) {
      try {
        // Keep the latest global report per service even when user incidents are numerous.
        const repo = this.db.getRepository(AuditEvent);
        const [recent, globals] = await bounded(
          Promise.all([
            repo.find({
              where: {
                action: AuditAction.SYSTEM_HEALTH_REPORTED,
                outcome: AuditOutcome.SUCCESS,
              },
              order: { createdAt: 'DESC', id: 'DESC' },
              take: 50,
            }),
            repo
              .createQueryBuilder('event')
              .distinctOn(['event.entityId'])
              .where('event.action = :action AND event.outcome = :outcome', {
                action: AuditAction.SYSTEM_HEALTH_REPORTED,
                outcome: AuditOutcome.SUCCESS,
              })
              .andWhere(
                "event.metadata -> 'current' ->> 'affectedUserId' IS NULL",
              )
              .orderBy('event.entityId')
              .addOrderBy('event.createdAt', 'DESC')
              .addOrderBy('event.id', 'DESC')
              .getMany(),
          ]),
        );
        const rows = [
          ...new Map(
            [...recent, ...globals].map((event) => [event.id, event]),
          ).values(),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        reports = rows.flatMap((event) => {
          const parsed = healthReportInputSchema.safeParse(
            event.metadata?.current,
          );
          return parsed.success
            ? [
                {
                  ...parsed.data,
                  id: event.id,
                  recordedAt: event.createdAt.toISOString(),
                  stale:
                    now.getTime() - event.createdAt.getTime() >= REPORT_TTL_MS,
                },
              ]
            : [];
        });
      } catch {
        reportsAvailable = false;
      }
    }
    services.push(...providerServices(reports, now));
    return {
      generatedAt: now.toISOString(),
      overallStatus: overallHealth(services),
      reportsAvailable,
      services,
      reports: reports.slice(0, 50),
    };
  }
  async report(
    principal: AuthPrincipal,
    input: HealthReportInput,
  ): Promise<void> {
    await this.db.transaction(async (manager) => {
      // Serialize observations for the same service so the previous state is accurate.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `system-health:${input.serviceId}`,
      ]);
      if (
        input.affectedUserId &&
        !(await manager
          .getRepository(User)
          .existsBy({ id: input.affectedUserId, userType: UserType.CUSTOMER }))
      )
        throw new NotFoundException('Customer not found.');
      const previous = await manager
        .getRepository(AuditEvent)
        .createQueryBuilder('event')
        .where('event.action = :action AND event.entityId = :service', {
          action: AuditAction.SYSTEM_HEALTH_REPORTED,
          service: input.serviceId,
        })
        .andWhere(
          "COALESCE(event.metadata -> 'current' ->> 'affectedUserId', '') = :user",
          { user: input.affectedUserId ?? '' },
        )
        .orderBy('event.createdAt', 'DESC')
        .addOrderBy('event.id', 'DESC')
        .getOne();
      await this.audit.recordTransactional(manager, {
        action: AuditAction.SYSTEM_HEALTH_REPORTED,
        actorUserId: principal.userId,
        entityType: 'system_health',
        entityId: input.serviceId,
        metadata: {
          previous: previous?.metadata?.current ?? null,
          current: input,
          source: 'staff_report',
        },
      });
    });
    this.snapshot = null;
  }
}
