import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminPermission,
  auditReportQuerySchema,
  auditReportResponseSchema,
  AuditAction,
  AuditActorType,
  UserStatus,
  UserType,
  employeeAuditDataQuerySchema,
  employeeAuditDataResponseSchema,
  savingsProgressDataQuerySchema,
  savingsProgressDataResponseSchema,
  hasAdminPermission,
  type AdminPermissionValue,
  type EmployeeAuditDataResponse,
  type SavingsProgressDataResponse,
} from '@purposemint/contracts';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import { AdminRolePermission } from '../entities/admin-role-permission.entity';
import { AdminUserPermission } from '../entities/admin-user-permission.entity';
import { AuditEvent } from '../entities/audit-event.entity';
import { CustomRole } from '../entities/custom-role.entity';
import { SavingsEntry } from '../entities/savings-entry.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { User } from '../entities/user.entity';

const DAY = 86400000;
const pageInfo = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
  hasMore: page * pageSize < total,
});
const money = (value: number | string) => Math.round(Number(value) * 100) / 100;
const progress = (saved: number, target: number) => ({
  remainingAmount: money(Math.max(0, target - saved)),
  progressPercent:
    target > 0 ? Math.round((saved / target) * 10000) / 100 : null,
});

/** Read-only application tools. Authorization runs here even without HTTP guards. */
@Injectable()
export class AssistantDataService {
  constructor(
    private readonly db: DataSource,
    private readonly audit: AuditService,
  ) {}

  private async permissions(manager: EntityManager, principal: AuthPrincipal) {
    // Refresh identity and overrides even when called directly by an agent.
    const user = await manager.findOneBy(User, { id: principal.userId });
    if (
      !user ||
      user.userType !== UserType.ADMIN ||
      user.status !== UserStatus.ACTIVE ||
      principal.userType !== UserType.ADMIN
    ) {
      throw new ForbiddenException(
        'An active administrator account is required.',
      );
    }
    const individual = await manager.findOneBy(AdminUserPermission, {
      userId: user.id,
    });
    if (individual) return individual.permissions;
    if (user.customRoleId) {
      const custom = await manager.findOneBy(CustomRole, {
        id: user.customRoleId,
      });
      if (!custom)
        throw new ForbiddenException('Assigned role is unavailable.');
      return custom.permissions;
    }
    const override = user.adminRole
      ? await manager.findOneBy(AdminRolePermission, {
          roleKey: user.adminRole,
        })
      : null;
    return Object.values(AdminPermission).filter((permission) =>
      override
        ? hasAdminPermission(null, permission, override.permissions)
        : hasAdminPermission(user.adminRole, permission),
    );
  }

  private require(
    permissions: readonly AdminPermissionValue[],
    required: AdminPermissionValue,
  ) {
    if (!hasAdminPermission(null, required, permissions)) {
      throw new ForbiddenException(
        "This data isn't available on your account.",
      );
    }
  }

  private dates(from?: string, to?: string, defaultWindow = false) {
    if (!from && !to && !defaultWindow) return { from: null, to: null };
    const end = to ?? new Date().toISOString().slice(0, 10);
    const start =
      from ?? new Date(Date.parse(end) - 30 * DAY).toISOString().slice(0, 10);
    if (start > end || Date.parse(end) - Date.parse(start) > 366 * DAY) {
      throw new BadRequestException(
        'Use an ordered date range of at most 366 days.',
      );
    }
    return { from: start, to: end };
  }

  private metadata(value: Record<string, unknown> | null) {
    const clean = this.audit.sanitize(value);
    if (clean && JSON.stringify(clean).length > 8000) {
      return { omitted: 'Metadata exceeds the assistant output limit.' };
    }
    return clean;
  }

  async getEmployeeAuditData(
    principal: AuthPrincipal,
    input: unknown,
  ): Promise<EmployeeAuditDataResponse> {
    const parsed = employeeAuditDataQuerySchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid employee audit filters.');
    const query = parsed.data;
    const dates = this.dates(query.from, query.to, true);
    const result = await this.db.transaction(
      'REPEATABLE READ',
      async (manager) => {
        const permissions = await this.permissions(manager, principal);
        this.require(permissions, AdminPermission.AUDIT_LOGS_VIEW);
        if (query.includeDetails)
          this.require(permissions, AdminPermission.AUDIT_LOGS_FULL);
        const employee = await manager.findOne(User, {
          where: { id: query.employeeId, userType: UserType.ADMIN },
          select: { id: true, firstName: true, lastName: true },
        });
        if (!employee)
          throw new NotFoundException('Employee account not found.');
        const qb = manager
          .createQueryBuilder(AuditEvent, 'event')
          .where('event.actorUserId = :employeeId', { employeeId: employee.id })
          .andWhere('event.createdAt >= :from', {
            from: dates.from + 'T00:00:00.000Z',
          })
          .andWhere('event.createdAt < :until', {
            until: new Date(Date.parse(dates.to!) + DAY),
          })
          .select([
            'event.id',
            'event.actorUserId',
            'event.actorType',
            'event.action',
            'event.entityType',
            'event.entityId',
            'event.outcome',
            'event.createdAt',
          ]);
        if (query.includeDetails) qb.addSelect('event.metadata');
        if (query.action)
          qb.andWhere('event.action = :action', { action: query.action });
        if (query.outcome)
          qb.andWhere('event.outcome = :outcome', { outcome: query.outcome });
        const [events, total] = await qb
          .orderBy('event.createdAt', 'DESC')
          .addOrderBy('event.id', 'ASC')
          .skip((query.page - 1) * query.pageSize)
          .take(query.pageSize)
          .getManyAndCount();
        return employeeAuditDataResponseSchema.parse({
          source: 'audit_events',
          retrievedAt: new Date().toISOString(),
          employee: {
            id: employee.id,
            name: (employee.firstName + ' ' + employee.lastName).trim(),
          },
          filters: {
            ...dates,
            timeZone: 'UTC',
            action: query.action ?? null,
            outcome: query.outcome ?? null,
          },
          detailsIncluded: query.includeDetails,
          pagination: pageInfo(query.page, query.pageSize, total),
          items: events.map((event) => ({
            id: event.id,
            actorUserId: event.actorUserId,
            actorType: event.actorType,
            action: event.action,
            entityType: event.entityType,
            entityId: event.entityId,
            outcome: event.outcome,
            createdAt: event.createdAt.toISOString(),
            ...(query.includeDetails
              ? { metadata: this.metadata(event.metadata) }
              : {}),
          })),
        });
      },
    );
    await this.recordRead(
      principal,
      'assistant_employee_audit',
      query.employeeId,
    );
    return result;
  }

  async getSavingsProgressData(
    principal: AuthPrincipal,
    input: unknown,
  ): Promise<SavingsProgressDataResponse> {
    const parsed = savingsProgressDataQuerySchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid savings progress filters.');
    const query = parsed.data;
    const dates = this.dates(query.from, query.to);
    const result = await this.db.transaction(
      'REPEATABLE READ',
      async (manager) => {
        const permissions = await this.permissions(manager, principal);
        this.require(permissions, AdminPermission.FINANCIAL_DATA_VIEW);
        this.require(permissions, AdminPermission.USER_MANAGEMENT_VIEW);
        const customers = manager
          .createQueryBuilder(User, 'user')
          .where('user.userType = :customerType', {
            customerType: UserType.CUSTOMER,
          });
        if (query.customerId)
          customers.andWhere('user.id = :customerId', {
            customerId: query.customerId,
          });
        const total = await customers.getCount();
        if (query.customerId && !total)
          throw new NotFoundException('Customer account not found.');
        const rows = await customers
          .leftJoin(UserGoal, 'goal', 'goal.user_id = user.id')
          .select('user.id', 'id')
          .addSelect('user.firstName', 'firstName')
          .addSelect('user.lastName', 'lastName')
          .addSelect('user.email', 'email')
          .addSelect('COALESCE(SUM(goal.saved_amount), 0)', 'savedAmount')
          .addSelect('COALESCE(SUM(goal.target_amount), 0)', 'targetAmount')
          .addSelect('COUNT(goal.id)', 'goalCount')
          .addSelect(
            'COALESCE(BOOL_OR(goal.is_pathway_eligible), false)',
            'pathwayEligible',
          )
          .groupBy('user.id')
          .orderBy('user.lastName', 'ASC')
          .addOrderBy('user.firstName', 'ASC')
          .addOrderBy('user.id', 'ASC')
          .offset(query.customerId ? 0 : (query.page - 1) * query.pageSize)
          .limit(query.customerId ? 1 : query.pageSize)
          .getRawMany<{
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            savedAmount: string;
            targetAmount: string;
            goalCount: string;
            pathwayEligible: boolean;
          }>();
        let goals: UserGoal[] = [],
          entries: SavingsEntry[] = [];
        let goalCount = 0,
          entryCount = 0;
        if (query.customerId) {
          [goals, goalCount] = await manager.findAndCount(UserGoal, {
            where: { userId: query.customerId },
            order: { createdAt: 'ASC', id: 'ASC' },
            skip: (query.goalPage - 1) * query.pageSize,
            take: query.pageSize,
          });
          const qb = manager
            .createQueryBuilder(SavingsEntry, 'entry')
            .where('entry.userId = :customerId', {
              customerId: query.customerId,
            })
            .select([
              'entry.id',
              'entry.userGoalId',
              'entry.amount',
              'entry.createdAt',
            ]);
          if (dates.from)
            qb.andWhere('entry.createdAt >= :from', {
              from: dates.from + 'T00:00:00.000Z',
            });
          if (dates.to)
            qb.andWhere('entry.createdAt < :until', {
              until: new Date(Date.parse(dates.to) + DAY),
            });
          [entries, entryCount] = await qb
            .orderBy('entry.createdAt', 'ASC')
            .addOrderBy('entry.id', 'ASC')
            .skip((query.entryPage - 1) * query.pageSize)
            .take(query.pageSize)
            .getManyAndCount();
        }
        return savingsProgressDataResponseSchema.parse({
          source: 'savings_progress',
          retrievedAt: new Date().toISOString(),
          verification: 'self_reported_not_bank_verified',
          filters: {
            ...dates,
            customerId: query.customerId ?? null,
            timeZone: 'UTC',
            dateFilterAppliesTo: 'entries_only_current_balances_are_all_time',
          },
          customers: {
            pagination: pageInfo(
              query.customerId ? 1 : query.page,
              query.customerId ? 1 : query.pageSize,
              total,
            ),
            items: rows.map((row) => {
              const savedAmount = money(row.savedAmount),
                targetAmount = money(row.targetAmount);
              return {
                id: row.id,
                name: (row.firstName + ' ' + row.lastName).trim(),
                email: row.email,
                savedAmount,
                targetAmount,
                ...progress(savedAmount, targetAmount),
                goalCount: Number(row.goalCount),
                pathwayEligible: row.pathwayEligible,
              };
            }),
          },
          goals: {
            pagination: pageInfo(query.goalPage, query.pageSize, goalCount),
            items: goals.map((goal) => ({
              id: goal.id,
              title: goal.title,
              savedAmount: money(goal.savedAmount),
              targetAmount: money(goal.targetAmount),
              ...progress(money(goal.savedAmount), money(goal.targetAmount)),
              isPathwayEligible: goal.isPathwayEligible,
              isFocus: goal.isFocus,
              isActive: goal.isActive,
            })),
          },
          entries: {
            pagination: pageInfo(query.entryPage, query.pageSize, entryCount),
            items: entries.map((entry) => ({
              id: entry.id,
              goalId: entry.userGoalId,
              amount: money(entry.amount),
              createdAt: entry.createdAt.toISOString(),
            })),
          },
        });
      },
    );
    await this.recordRead(
      principal,
      'assistant_savings_progress',
      query.customerId ?? null,
    );
    return result;
  }

  async getAuditReport(principal: AuthPrincipal, input: unknown) {
    const parsed = auditReportQuerySchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid audit report filters.');
    const query = parsed.data;
    if (
      query.action &&
      !Object.values(AuditAction).includes(
        query.action as (typeof AuditAction)[keyof typeof AuditAction],
      )
    )
      throw new BadRequestException(
        'Unknown audit action. Use an exact action from the tool action enum.',
      );
    const dates = this.dates(query.from, query.to, true);
    const result = await this.db.transaction(
      'REPEATABLE READ',
      async (manager) => {
        const permissions = await this.permissions(manager, principal);
        this.require(permissions, AdminPermission.AUDIT_LOGS_VIEW);
        if (query.includeDetails)
          this.require(permissions, AdminPermission.AUDIT_LOGS_FULL);
        const base = manager
          .createQueryBuilder(AuditEvent, 'event')
          .leftJoin(
            User,
            'actor',
            'actor.id = event.actorUserId AND actor.userType = :adminType',
            { adminType: UserType.ADMIN },
          )
          .where('event.createdAt >= :from', {
            from: dates.from + 'T00:00:00.000Z',
          })
          .andWhere('event.createdAt < :until', {
            until: new Date(Date.parse(dates.to!) + DAY),
          });
        if (query.employeeId)
          base.andWhere('event.actorUserId = :employeeId', {
            employeeId: query.employeeId,
          });
        if (query.employeeName)
          base.andWhere(
            "LOWER(CONCAT(actor.firstName, ' ', actor.lastName)) LIKE :name ESCAPE '!'",
            {
              name:
                '%' +
                query.employeeName
                  .toLowerCase()
                  .replace(/[!%_]/g, '!  private recordRead(') +
                '%',
            },
          );
        if (query.action)
          base.andWhere('event.action = :action', { action: query.action });
        if (query.outcome)
          base.andWhere('event.outcome = :outcome', { outcome: query.outcome });
        if (query.entityType)
          base.andWhere('event.entityType = :entityType', {
            entityType: query.entityType,
          });
        if (query.entityId)
          base.andWhere('event.entityId = :entityId', {
            entityId: query.entityId,
          });
        const nameSql =
          "COALESCE(NULLIF(TRIM(CONCAT(actor.firstName, ' ', actor.lastName)), ''), CASE WHEN event.actorUserId IS NULL THEN 'System / unidentified actor' ELSE 'Unknown or unavailable actor' END)";
        const total = await base.clone().getCount();
        const grouped = async (expression: string, actor = false) => {
          const qb = base
            .clone()
            .select(expression, 'name')
            .addSelect('COUNT(*)', 'count')
            .groupBy(expression);
          if (actor)
            qb.addSelect('event.actorUserId', 'actorId').addGroupBy(
              'event.actorUserId',
            );
          const rows = await qb
            .orderBy('COUNT(*)', 'DESC')
            .addOrderBy(expression, 'ASC')
            .limit(51)
            .getRawMany<{
              name: string | null;
              count: string;
              actorId?: string | null;
            }>();
          return {
            items: rows
              .slice(0, 50)
              .map((row) => ({
                name: row.name ?? 'Unknown',
                count: Number(row.count),
                ...(actor ? { actorId: row.actorId ?? null } : {}),
              })),
            hasMore: rows.length > 50,
          };
        };
        const byAction = await grouped('event.action');
        const byOutcome = await grouped('event.outcome');
        const byActor = await grouped(nameSql, true);
        const byDay = await grouped(
          "TO_CHAR(event.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
        );
        const qb = base
          .clone()
          .select('event.id', 'id')
          .addSelect('event.actorUserId', 'actorUserId')
          .addSelect('event.actorType', 'actorType')
          .addSelect(nameSql, 'actorName')
          .addSelect('actor.adminRole', 'actorRole')
          .addSelect('event.action', 'action')
          .addSelect('event.entityType', 'entityType')
          .addSelect('event.entityId', 'entityId')
          .addSelect('event.outcome', 'outcome')
          .addSelect('event.createdAt', 'createdAt');
        if (query.includeDetails) qb.addSelect('event.metadata', 'metadata');
        const rows = await qb
          .orderBy('event.createdAt', 'DESC')
          .addOrderBy('event.id', 'ASC')
          .offset((query.page - 1) * query.pageSize)
          .limit(query.pageSize)
          .getRawMany();
        return auditReportResponseSchema.parse({
          source: 'audit_events',
          retrievedAt: new Date().toISOString(),
          filters: {
            ...dates,
            timeZone: 'UTC',
            employeeId: query.employeeId ?? null,
            employeeName: query.employeeName ?? null,
            action: query.action ?? null,
            outcome: query.outcome ?? null,
            entityType: query.entityType ?? null,
            entityId: query.entityId ?? null,
            actorScope: 'all_matching_actors_unless_filtered',
          },
          detailsIncluded: query.includeDetails,
          pagination: pageInfo(query.page, query.pageSize, total),
          summary: {
            scope: 'all_matching_records_not_just_page',
            total,
            byAction,
            byOutcome,
            byActor,
            byDay,
          },
          items: rows.map((row) => ({
            ...row,
            createdAt: new Date(row.createdAt).toISOString(),
            ...(query.includeDetails
              ? { metadata: this.metadata(row.metadata) }
              : {}),
          })),
        });
      },
    );
    await this.recordRead(
      principal,
      'assistant_audit_report',
      query.employeeId ?? null,
    );
    return result;
  }

  private recordRead(
    principal: AuthPrincipal,
    entityType: string,
    entityId: string | null,
  ) {
    return this.audit.record({
      action: entityId
        ? AuditAction.ADMIN_USER_VIEWED
        : AuditAction.ADMIN_USERS_LISTED,
      actorUserId: principal.userId,
      actorType: AuditActorType.ADMIN,
      entityType,
      entityId,
      metadata: { source: 'assistant_data_tool' },
    });
  }
}
