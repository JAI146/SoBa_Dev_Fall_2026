/**
 * Support and complaint cases. The case row holds current state; every
 * mutation is also written to `audit_events` through `AuditService.record()`,
 * and that trail is what the case history reads back.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuditAction,
  AuditActorType,
  AuditOutcome,
  SupportCaseStatus,
  UserStatus,
  UserType,
  type AuditActionValue,
  type SupportCaseAssignInput,
  type SupportCaseCategoriesResponse,
  type SupportCaseCategory as SupportCaseCategoryDto,
  type SupportCaseCategoryCreateInput,
  type SupportCaseCategoryUpdateInput,
  type SupportCaseCloseInput,
  type SupportCaseCreateInput,
  type SupportCaseDetail,
  type SupportCaseEscalateInput,
  type SupportCaseHistoryResponse,
  type SupportCaseListItem,
  type SupportCaseMessageInput,
  type SupportCaseMessageResponse,
  type SupportCaseNoteInput,
  type SupportCaseResolveInput,
  type SupportCasesQuery,
  type SupportCasesResponse,
  type SupportCaseStatusUpdateInput,
  type SupportCaseUpdateInput,
} from '@purposemint/contracts';
import { Not, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import type { RequestContext } from '../common/request-context';
import { AuditEvent } from '../entities/audit-event.entity';
import { SupportCaseCategory } from '../entities/support-case-category.entity';
import { SupportCase } from '../entities/support-case.entity';
import { User } from '../entities/user.entity';
import { MailService } from '../mail/mail.service';
import {
  canChangeStatus,
  canClose,
  canEscalate,
  canResolve,
  isClosed,
  statusAfterAssignment,
} from './support-case-transitions';

const CASE_ENTITY = 'support_case';
const HISTORY_LIMIT = 200;

@Injectable()
export class SupportCasesService {
  private readonly logger = new Logger(SupportCasesService.name);

  constructor(
    @InjectRepository(SupportCase)
    private readonly cases: Repository<SupportCase>,
    @InjectRepository(SupportCaseCategory)
    private readonly categories: Repository<SupportCaseCategory>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuditEvent)
    private readonly events: Repository<AuditEvent>,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  // ---- categories -------------------------------------------------------

  async listCategories(): Promise<SupportCaseCategoriesResponse> {
    const rows = await this.categories.find({
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
    return { items: rows.map((row) => this.toCategory(row)) };
  }

  async createCategory(
    principal: AuthPrincipal,
    input: SupportCaseCategoryCreateInput,
    context: RequestContext,
  ): Promise<SupportCaseCategoryDto> {
    const key = input.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60);
    if (!key) throw new BadRequestException('Enter a category name.');
    if (await this.categories.exists({ where: { key } })) {
      throw new ConflictException('A category with that name already exists.');
    }
    const last = await this.categories
      .createQueryBuilder('category')
      .select('MAX(category.sortOrder)', 'max')
      .getRawOne<{ max: number | null }>();
    const saved = await this.categories.save(
      this.categories.create({
        key,
        label: input.label,
        sortOrder: (last?.max ?? -1) + 1,
        active: true,
      }),
    );
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CATEGORY_CREATED,
      {
        entityType: 'support_case_category',
        entityId: saved.id,
        metadata: { label: saved.label },
      },
    );
    return this.toCategory(saved);
  }

  async updateCategory(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseCategoryUpdateInput,
    context: RequestContext,
  ): Promise<SupportCaseCategoryDto> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found.');
    const before = { ...this.toCategory(category) };
    if (input.label !== undefined) category.label = input.label;
    if (input.active !== undefined) category.active = input.active;
    if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
    const saved = await this.categories.save(category);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CATEGORY_UPDATED,
      {
        entityType: 'support_case_category',
        entityId: id,
        metadata: { before, after: this.toCategory(saved) },
      },
    );
    return this.toCategory(saved);
  }

  // ---- reads ------------------------------------------------------------

  async list(
    principal: AuthPrincipal,
    query: SupportCasesQuery,
    context: RequestContext,
  ): Promise<SupportCasesResponse> {
    const builder = this.cases
      .createQueryBuilder('case')
      .innerJoinAndSelect('case.user', 'customer')
      .innerJoinAndSelect('case.category', 'category')
      .leftJoinAndSelect('case.assignee', 'assignee');
    if (query.status)
      builder.andWhere('case.status = :status', { status: query.status });
    if (query.priority) {
      builder.andWhere('case.priority = :priority', {
        priority: query.priority,
      });
    }
    if (query.type) builder.andWhere('case.type = :type', { type: query.type });
    if (query.categoryId) {
      builder.andWhere('case.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.assignee === 'unassigned') {
      builder.andWhere('case.assigneeId IS NULL');
    } else if (query.assignee) {
      builder.andWhere('case.assigneeId = :assignee', {
        assignee: query.assignee,
      });
    }
    const search = query.search?.trim().toLowerCase();
    if (search) {
      const number = /^#?\d+$/.test(search)
        ? Number(search.replace('#', ''))
        : -1;
      builder.andWhere(
        `(case.caseNumber = :number OR LOWER(case.subject) LIKE :search
          OR LOWER(customer.email) LIKE :search
          OR LOWER(customer.firstName) LIKE :search
          OR LOWER(customer.lastName) LIKE :search)`,
        { number, search: `%${search}%` },
      );
    }
    const [rows, total] = await builder
      .orderBy('case.createdAt', 'DESC')
      .addOrderBy('case.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASES_LISTED,
      {
        entityType: CASE_ENTITY,
        metadata: { page: query.page, pageSize: query.pageSize },
      },
    );
    return {
      items: rows.map((row) => this.toListItem(row)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async get(
    principal: AuthPrincipal,
    id: string,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const row = await this.load(id);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_VIEWED,
      {
        entityType: CASE_ENTITY,
        entityId: id,
      },
    );
    return this.toDetail(row);
  }

  async history(id: string): Promise<SupportCaseHistoryResponse> {
    if (!(await this.cases.exists({ where: { id } }))) {
      throw new NotFoundException('Case not found.');
    }
    const rows = await this.events.find({
      where: {
        entityType: CASE_ENTITY,
        entityId: id,
        // Views are noise in a case timeline.
        action: Not(AuditAction.ADMIN_SUPPORT_CASE_VIEWED),
      },
      order: { createdAt: 'DESC' },
      take: HISTORY_LIMIT,
    });
    const actorIds = [
      ...new Set(
        rows.map((row) => row.actorUserId).filter((v): v is string => !!v),
      ),
    ];
    const actors = actorIds.length
      ? await this.users.find({
          where: actorIds.map((actorId) => ({ id: actorId })),
        })
      : [];
    const names = new Map(
      actors.map((actor) => [actor.id, this.fullName(actor)]),
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        outcome: row.outcome,
        createdAt: row.createdAt.toISOString(),
        actor: row.actorUserId
          ? {
              id: row.actorUserId,
              name: names.get(row.actorUserId) ?? 'Former staff member',
            }
          : null,
        metadata: row.metadata,
      })),
    };
  }

  // ---- mutations --------------------------------------------------------

  async create(
    principal: AuthPrincipal,
    input: SupportCaseCreateInput,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const customer = await this.users.findOne({
      where: { id: input.userId, userType: UserType.CUSTOMER },
    });
    if (!customer) throw new NotFoundException('Customer account not found.');
    await this.requireActiveCategory(input.categoryId);
    if (input.assigneeId) await this.requireAssignableStaff(input.assigneeId);

    const saved = await this.cases.save(
      this.cases.create({
        userId: customer.id,
        type: input.type,
        categoryId: input.categoryId,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        status: input.assigneeId
          ? SupportCaseStatus.ASSIGNED
          : SupportCaseStatus.NEW,
        assigneeId: input.assigneeId ?? null,
        createdById: principal.userId,
      }),
    );
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_CREATED,
      {
        entityType: CASE_ENTITY,
        entityId: saved.id,
        metadata: {
          caseNumber: saved.caseNumber,
          customerId: customer.id,
          type: saved.type,
          categoryId: saved.categoryId,
          priority: saved.priority,
          subject: saved.subject,
          assigneeId: saved.assigneeId,
        },
      },
    );
    return this.toDetail(await this.load(saved.id));
  }

  async update(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseUpdateInput,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const row = await this.loadOpen(id);
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (input.type !== undefined && input.type !== row.type) {
      changes.type = { from: row.type, to: input.type };
      row.type = input.type;
    }
    if (input.priority !== undefined && input.priority !== row.priority) {
      changes.priority = { from: row.priority, to: input.priority };
      row.priority = input.priority;
    }
    if (input.categoryId !== undefined && input.categoryId !== row.categoryId) {
      await this.requireActiveCategory(input.categoryId);
      changes.categoryId = { from: row.categoryId, to: input.categoryId };
      row.categoryId = input.categoryId;
    }
    if (Object.keys(changes).length === 0) return this.toDetail(row);
    await this.cases.save(row);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_UPDATED,
      {
        entityType: CASE_ENTITY,
        entityId: id,
        metadata: { caseNumber: row.caseNumber, changes },
      },
    );
    return this.toDetail(await this.load(id));
  }

  async assign(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseAssignInput,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const row = await this.loadOpen(id);
    if (input.assigneeId) await this.requireAssignableStaff(input.assigneeId);
    if (input.assigneeId === row.assigneeId) return this.toDetail(row);

    const previousAssigneeId = row.assigneeId;
    const previousStatus = row.status;
    row.assigneeId = input.assigneeId;
    row.status = statusAfterAssignment(row.status, input.assigneeId);
    await this.cases.save(row);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_ASSIGNED,
      {
        entityType: CASE_ENTITY,
        entityId: id,
        metadata: {
          caseNumber: row.caseNumber,
          previousAssigneeId,
          assigneeId: input.assigneeId,
          previousStatus,
          status: row.status,
        },
      },
    );
    return this.toDetail(await this.load(id));
  }

  async changeStatus(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseStatusUpdateInput,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const row = await this.loadOpen(id);
    if (!canChangeStatus(row.status, input.status)) {
      throw new ConflictException(
        `A ${row.status.replace(/_/g, ' ')} case cannot move to ${input.status.replace(/_/g, ' ')}.`,
      );
    }
    const previousStatus = row.status;
    row.status = input.status;
    // Reopening clears the resolution so the case reads as open again.
    if (previousStatus === SupportCaseStatus.RESOLVED) {
      row.resolution = null;
      row.resolvedAt = null;
    }
    await this.cases.save(row);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_STATUS_CHANGED,
      {
        entityType: CASE_ENTITY,
        entityId: id,
        metadata: {
          caseNumber: row.caseNumber,
          previousStatus,
          status: row.status,
          ...(previousStatus === SupportCaseStatus.RESOLVED
            ? { reopened: true }
            : {}),
        },
      },
    );
    return this.toDetail(await this.load(id));
  }

  async addNote(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseNoteInput,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const row = await this.loadOpen(id);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_NOTE_ADDED,
      {
        entityType: CASE_ENTITY,
        entityId: id,
        metadata: { caseNumber: row.caseNumber, body: input.body },
      },
    );
    return this.toDetail(row);
  }

  async escalate(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseEscalateInput,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const row = await this.loadOpen(id);
    if (!canEscalate(row.status)) {
      throw new ConflictException(
        `A ${row.status.replace(/_/g, ' ')} case cannot be escalated.`,
      );
    }
    if (input.assigneeId) await this.requireAssignableStaff(input.assigneeId);
    const previousStatus = row.status;
    const previousAssigneeId = row.assigneeId;
    row.status = SupportCaseStatus.ESCALATED;
    row.escalationReason = input.reason;
    row.escalatedAt = new Date();
    if (input.assigneeId) row.assigneeId = input.assigneeId;
    await this.cases.save(row);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_ESCALATED,
      {
        entityType: CASE_ENTITY,
        entityId: id,
        metadata: {
          caseNumber: row.caseNumber,
          previousStatus,
          reason: input.reason,
          previousAssigneeId,
          assigneeId: row.assigneeId,
        },
      },
    );
    return this.toDetail(await this.load(id));
  }

  async resolve(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseResolveInput,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const row = await this.loadOpen(id);
    if (!canResolve(row.status)) {
      throw new ConflictException('This case is already resolved.');
    }
    const previousStatus = row.status;
    row.status = SupportCaseStatus.RESOLVED;
    row.resolution = input.resolution;
    row.resolvedAt = new Date();
    await this.cases.save(row);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_RESOLVED,
      {
        entityType: CASE_ENTITY,
        entityId: id,
        metadata: {
          caseNumber: row.caseNumber,
          previousStatus,
          resolution: input.resolution,
        },
      },
    );
    return this.toDetail(await this.load(id));
  }

  async close(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseCloseInput,
    context: RequestContext,
  ): Promise<SupportCaseDetail> {
    const row = await this.loadOpen(id);
    if (!canClose(row.status)) {
      throw new ConflictException('Resolve the case before closing it.');
    }
    row.status = SupportCaseStatus.CLOSED;
    row.closedAt = new Date();
    await this.cases.save(row);
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_CLOSED,
      {
        entityType: CASE_ENTITY,
        entityId: id,
        metadata: {
          caseNumber: row.caseNumber,
          previousStatus: SupportCaseStatus.RESOLVED,
          ...(input.note ? { note: input.note } : {}),
        },
      },
    );
    return this.toDetail(await this.load(id));
  }

  async sendMessage(
    principal: AuthPrincipal,
    id: string,
    input: SupportCaseMessageInput,
    context: RequestContext,
  ): Promise<SupportCaseMessageResponse> {
    const row = await this.loadOpen(id);
    const customer = row.user!;
    try {
      await this.mail.sendCaseMessage({
        to: customer.email,
        firstName: customer.firstName,
        caseNumber: row.caseNumber,
        subject: input.subject,
        body: input.body,
      });
    } catch (error) {
      this.logger.error(
        `Case #${row.caseNumber} email failed`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.audit.record({
        action: AuditAction.ADMIN_SUPPORT_CASE_EMAIL_FAILED,
        outcome: AuditOutcome.FAILURE,
        actorUserId: principal.userId,
        actorType: AuditActorType.ADMIN,
        entityType: CASE_ENTITY,
        entityId: id,
        ipAddress: context.ipAddress,
        metadata: {
          caseNumber: row.caseNumber,
          to: customer.email,
          subject: input.subject,
        },
      });
      throw new ServiceUnavailableException(
        'The email could not be sent. Check the SMTP settings and try again.',
      );
    }
    await this.record(
      principal,
      context,
      AuditAction.ADMIN_SUPPORT_CASE_EMAIL_SENT,
      {
        entityType: CASE_ENTITY,
        entityId: id,
        metadata: {
          caseNumber: row.caseNumber,
          to: customer.email,
          subject: input.subject,
          body: input.body,
        },
      },
    );
    return { sentTo: customer.email };
  }

  // ---- helpers ----------------------------------------------------------

  private async load(id: string): Promise<SupportCase> {
    const row = await this.cases.findOne({
      where: { id },
      relations: { user: true, category: true, assignee: true },
    });
    if (!row) throw new NotFoundException('Case not found.');
    return row;
  }

  /** Closed cases are read-only. */
  private async loadOpen(id: string): Promise<SupportCase> {
    const row = await this.load(id);
    if (isClosed(row.status)) {
      throw new ConflictException(
        'This case is closed and can no longer be changed.',
      );
    }
    return row;
  }

  private async requireActiveCategory(id: string): Promise<void> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new BadRequestException('Choose a valid category.');
    if (!category.active)
      throw new BadRequestException('That category is no longer in use.');
  }

  private async requireAssignableStaff(id: string): Promise<void> {
    const staff = await this.users.findOne({
      where: { id, userType: UserType.ADMIN, status: UserStatus.ACTIVE },
    });
    if (!staff)
      throw new BadRequestException('Choose an active staff member to assign.');
  }

  private fullName(user: Pick<User, 'firstName' | 'lastName'>): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  private toCategory(row: SupportCaseCategory): SupportCaseCategoryDto {
    return {
      id: row.id,
      key: row.key,
      label: row.label,
      sortOrder: row.sortOrder,
      active: row.active,
    };
  }

  private toListItem(row: SupportCase): SupportCaseListItem {
    const customer = row.user!;
    return {
      id: row.id,
      caseNumber: row.caseNumber,
      type: row.type,
      subject: row.subject,
      status: row.status,
      priority: row.priority,
      category: { id: row.category!.id, label: row.category!.label },
      customer: {
        id: customer.id,
        name: this.fullName(customer),
        email: customer.email,
        timeZone: customer.timeZone,
      },
      assignee: row.assignee
        ? {
            id: row.assignee.id,
            name: this.fullName(row.assignee),
            email: row.assignee.email,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetail(row: SupportCase): Promise<SupportCaseDetail> {
    const creator = row.createdById
      ? await this.users.findOne({ where: { id: row.createdById } })
      : null;
    return {
      ...this.toListItem(row),
      description: row.description,
      escalationReason: row.escalationReason,
      escalatedAt: row.escalatedAt?.toISOString() ?? null,
      resolution: row.resolution,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      createdBy: creator
        ? { id: creator.id, name: this.fullName(creator), email: creator.email }
        : null,
    };
  }

  private record(
    principal: AuthPrincipal,
    context: RequestContext,
    action: AuditActionValue,
    details: {
      entityType: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.audit.record({
      action,
      actorUserId: principal.userId,
      actorType: AuditActorType.ADMIN,
      entityType: details.entityType,
      entityId: details.entityId ?? null,
      ipAddress: context.ipAddress,
      metadata: details.metadata ?? null,
    });
  }
}
