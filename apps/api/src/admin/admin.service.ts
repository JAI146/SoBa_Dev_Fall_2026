import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuditAction,
  AuditActorType,
  AdminRole,
  UserStatus,
  OnboardingStatus,
  PathwayApplicationStatus,
  Tier,
  UserType,
  type AdminChecklistItem,
  type AdminChecklistUpdateInput,
  type AdminStaffCreateInput,
  type AdminStaffListItem,
  type AdminStaffQuery,
  type AdminStaffResponse,
  type AdminStaffUpdateInput,
  type AdminCustomRole,
  type AdminCustomRoleCreateInput,
  type AdminCustomRoleUpdateInput,
  type AdminCustomRolesResponse,
  type AdminOverviewResponse,
  type AdminPathwayApplicationDetailResponse,
  type AdminPathwayApplicationListItem,
  type AdminPathwayApplicationsQuery,
  type AdminPathwayApplicationsResponse,
  type AdminUpgradeIntentsQuery,
  type AdminUpgradeIntentsResponse,
  type AdminUserDetailResponse,
  type AdminUserListItem,
  type AdminUsersQuery,
  type AdminUsersResponse,
  type AdminSavingsCustomersResponse,
  type AdminSavingsCustomerDetail,
  type AdminProgressLevelsResponse,
  type AdminProgressLevelUsersResponse,
  type PaginationQuery,
  type TierValue,
} from '@purposemint/contracts';
import { MoreThanOrEqual, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { toUserGoalPublic } from '../common/mappers/onboarding.mapper';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import {
  SessionRevokedReason,
  SessionService,
} from '../auth/session.service';
import type { Env } from '../config/env.validation';
import { toValuePublic } from '../common/mappers/onboarding.mapper';
import type { RequestContext } from '../common/request-context';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { PathwayApplication } from '../entities/pathway-application.entity';
import { PathwayChecklistItem } from '../entities/pathway-checklist-item.entity';
import { Pathway } from '../entities/pathway.entity';
import { Reflection } from '../entities/reflection.entity';
import { SavingsEntry } from '../entities/savings-entry.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { UpgradeIntent } from '../entities/upgrade-intent.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { UserHabit } from '../entities/user-habit.entity';
import { UserValue } from '../entities/user-value.entity';
import { User } from '../entities/user.entity';
import { Value } from '../entities/value.entity';
import { CustomRole } from '../entities/custom-role.entity';

const ACTIVE_WINDOW_DAYS = 30;
const TIER_LABELS: Record<TierValue, string> = {
  [Tier.FREE]: 'Starter',
  [Tier.GROWTH]: 'Momentum',
  [Tier.ELEVATE]: 'Elevation',
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CustomRole)
    private readonly customRoles: Repository<CustomRole>,
    @InjectRepository(UserGoal) private readonly goals: Repository<UserGoal>,
    @InjectRepository(UserHabit)
    private readonly habits: Repository<UserHabit>,
    @InjectRepository(UserValue)
    private readonly userValues: Repository<UserValue>,
    @InjectRepository(HabitCompletion)
    private readonly habitCompletions: Repository<HabitCompletion>,
    @InjectRepository(SavingsEntry)
    private readonly savingsEntries: Repository<SavingsEntry>,
    @InjectRepository(Reflection)
    private readonly reflections: Repository<Reflection>,
    @InjectRepository(Pathway) private readonly pathways: Repository<Pathway>,
    @InjectRepository(PathwayApplication)
    private readonly applications: Repository<PathwayApplication>,
    @InjectRepository(PathwayChecklistItem)
    private readonly checklistItems: Repository<PathwayChecklistItem>,
    @InjectRepository(UpgradeIntent)
    private readonly upgradeIntents: Repository<UpgradeIntent>,
    @InjectRepository(SubscriptionPlan)
    private readonly plans: Repository<SubscriptionPlan>,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
    config: ConfigService<Env, true>,
  ) {
    this.bcryptRounds = config.get('BCRYPT_ROUNDS', { infer: true });
  }

  private readonly bcryptRounds: number;

  async listCustomRoles(
    principal: AuthPrincipal,
    context: RequestContext,
  ): Promise<AdminCustomRolesResponse> {
    const roles = await this.customRoles.find({ order: { name: 'ASC' } });
    await this.record(principal, context, AuditAction.ADMIN_CUSTOM_ROLES_LISTED, {
      entityType: 'custom_role',
    });
    return { items: roles.map((role) => this.toCustomRole(role)) };
  }

  async createCustomRole(
    principal: AuthPrincipal,
    input: AdminCustomRoleCreateInput,
    context: RequestContext,
  ): Promise<AdminCustomRole> {
    const role = await this.customRoles.save(
      this.customRoles.create(input),
    );
    await this.record(principal, context, AuditAction.ADMIN_CUSTOM_ROLE_CREATED, {
      entityType: 'custom_role',
      entityId: role.id,
    });
    return this.toCustomRole(role);
  }

  async updateCustomRole(
    principal: AuthPrincipal,
    id: string,
    input: AdminCustomRoleUpdateInput,
    context: RequestContext,
  ): Promise<AdminCustomRole> {
    const role = await this.customRoles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Custom role not found.');
    Object.assign(role, input);
    const saved = await this.customRoles.save(role);
    await this.record(principal, context, AuditAction.ADMIN_CUSTOM_ROLE_UPDATED, {
      entityType: 'custom_role',
      entityId: id,
    });
    return this.toCustomRole(saved);
  }

  async deleteCustomRole(
    principal: AuthPrincipal,
    id: string,
    context: RequestContext,
  ): Promise<{ message: string }> {
    const role = await this.customRoles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Custom role not found.');
    const assigned = await this.users.count({ where: { customRoleId: id } });
    if (assigned > 0) {
      throw new ForbiddenException('Remove all users from this role before deleting it.');
    }
    await this.customRoles.remove(role);
    await this.record(principal, context, AuditAction.ADMIN_CUSTOM_ROLE_DELETED, {
      entityType: 'custom_role',
      entityId: id,
    });
    return { message: 'Custom role deleted.' };
  }

  async listStaff(
    principal: AuthPrincipal,
    query: AdminStaffQuery,
    context: RequestContext,
  ): Promise<AdminStaffResponse> {
    const builder = this.users
      .createQueryBuilder('user')
      .where('user.userType = :userType', { userType: UserType.ADMIN });
    const search = query.search?.trim().toLowerCase();
    if (search) {
      builder.andWhere(
        `(LOWER(user.email) LIKE :search OR LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search)`,
        { search: `%${search}%` },
      );
    }
    const [staff, total] = await builder
      .orderBy('user.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    await this.record(principal, context, AuditAction.ADMIN_STAFF_LISTED, {
      entityType: 'admin_staff',
      metadata: { page: query.page, pageSize: query.pageSize },
    });
    return {
      items: staff.map((user) => this.toStaffListItem(user)),
      ...this.pagination(query.page, query.pageSize, total),
    };
  }

  async createStaff(
    principal: AuthPrincipal,
    input: AdminStaffCreateInput,
    context: RequestContext,
  ): Promise<AdminStaffListItem> {
    const email = input.email.trim().toLowerCase();
    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException('An account with that email already exists.');
    }
    const user = await this.users.save(
      this.users.create({
        email,
        passwordHash: await bcrypt.hash(input.password, this.bcryptRounds),
        firstName: input.firstName,
        lastName: input.lastName,
        userType: UserType.ADMIN,
        adminRole: input.adminRole,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        notificationPreferences: {},
        policyAgreements: {},
      }),
    );
    await this.record(principal, context, AuditAction.ADMIN_STAFF_CREATED, {
      entityType: 'user',
      entityId: user.id,
      metadata: { adminRole: user.adminRole },
    });
    return this.toStaffListItem(user);
  }

  async updateStaff(
    principal: AuthPrincipal,
    id: string,
    input: AdminStaffUpdateInput,
    context: RequestContext,
  ): Promise<AdminStaffListItem> {
    const user = await this.users.findOne({
      where: { id, userType: UserType.ADMIN },
    });
    if (!user) throw new NotFoundException('Staff account not found.');
    if (id === principal.userId && input.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }

    const wasActiveSuperAdmin =
      user.adminRole === AdminRole.SUPER_ADMIN && user.status === UserStatus.ACTIVE;
    const becomesInactiveSuperAdmin =
      wasActiveSuperAdmin &&
      (input.adminRole !== undefined && input.adminRole !== AdminRole.SUPER_ADMIN ||
        input.status === UserStatus.SUSPENDED);
    if (becomesInactiveSuperAdmin) {
      const activeSuperAdmins = await this.users.count({
        where: {
          userType: UserType.ADMIN,
          adminRole: AdminRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
      if (activeSuperAdmins <= 1) {
        throw new ForbiddenException('At least one active Super Admin is required.');
      }
    }

    Object.assign(user, {
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.adminRole !== undefined ? { adminRole: input.adminRole } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
    try {
      await this.users.save(user);
    } catch (error) {
      if (String(error).toLowerCase().includes('uq_users_email')) {
        throw new ConflictException('An account with that email already exists.');
      }
      throw error;
    }

    if (user.status === UserStatus.SUSPENDED) {
      await this.sessions.revokeAllForUser(
        user.id,
        SessionRevokedReason.LOGOUT_ALL,
      );
    }
    await this.record(
      principal,
      context,
      user.status === UserStatus.SUSPENDED
        ? AuditAction.ADMIN_STAFF_DEACTIVATED
        : AuditAction.ADMIN_STAFF_UPDATED,
      { entityType: 'user', entityId: user.id, metadata: { adminRole: user.adminRole } },
    );
    return this.toStaffListItem(user);
  }

  async overview(
    principal: AuthPrincipal,
    context: RequestContext,
  ): Promise<AdminOverviewResponse> {
    const activeSince = new Date(
      Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const [
      totalUsers,
      completedOnboarding,
      submittedPathwayApplications,
      activeUsers,
      newUsers,
      totalGoalsCreated,
      activeHabits,
      tierRows,
      pathwayRows,
      intentRows,
    ] = await Promise.all([
      this.users.count({ where: { userType: UserType.CUSTOMER } }),
      this.users.count({
        where: {
          userType: UserType.CUSTOMER,
          onboardingStatus: OnboardingStatus.COMPLETED,
        },
      }),
      this.applications.count({
        where: { status: PathwayApplicationStatus.SUBMITTED },
      }),
      this.users.count({
        where: {
          userType: UserType.CUSTOMER,
          lastLoginAt: MoreThanOrEqual(activeSince),
        },
      }),
      this.users.count({
        where: {
          userType: UserType.CUSTOMER,
          createdAt: MoreThanOrEqual(activeSince),
        },
      }),
      this.goals.count(),
      this.habits.count({ where: { isActive: true } }),
      this.users
        .createQueryBuilder('user')
        .select('user.tier', 'key')
        .addSelect('COUNT(user.id)', 'count')
        .where('user.userType = :userType', { userType: UserType.CUSTOMER })
        .groupBy('user.tier')
        .getRawMany<{ key: TierValue; count: string }>(),
      this.applications
        .createQueryBuilder('application')
        .innerJoin('application.pathway', 'pathway')
        .select('application.pathwayKey', 'key')
        .addSelect('pathway.title', 'label')
        .addSelect('COUNT(application.id)', 'count')
        .where('application.status = :status', {
          status: PathwayApplicationStatus.SUBMITTED,
        })
        .groupBy('application.pathwayKey')
        .addGroupBy('pathway.title')
        .orderBy('pathway.title', 'ASC')
        .getRawMany<{ key: string; label: string; count: string }>(),
      this.plans
        .createQueryBuilder('plan')
        .leftJoin(UpgradeIntent, 'intent', 'intent.plan_key = plan.key')
        .select('plan.key', 'key')
        .addSelect('plan.name', 'label')
        .addSelect('COUNT(intent.id)', 'count')
        .groupBy('plan.key')
        .addGroupBy('plan.name')
        .addGroupBy('plan.sortOrder')
        .orderBy('plan.sortOrder', 'ASC')
        .getRawMany<{ key: TierValue; label: string; count: string }>(),
    ]);

    const tierCounts = new Map(
      tierRows.map((row) => [row.key, Number(row.count)]),
    );
    const response: AdminOverviewResponse = {
      totalUsers,
      usersByTier: Object.values(Tier).map((key) => ({
        key,
        label: TIER_LABELS[key],
        count: tierCounts.get(key) ?? 0,
      })),
      onboardingCompletionRate:
        totalUsers === 0
          ? 0
          : Number(((completedOnboarding / totalUsers) * 100).toFixed(1)),
      submittedPathwayApplications,
      pathwayApplicationsByPathway: pathwayRows.map((row) => ({
        key: row.key,
        label: row.label,
        count: Number(row.count),
      })),
      upgradeIntentsByPlan: intentRows.map((row) => ({
        key: row.key,
        label: row.label,
        count: Number(row.count),
      })),
      activeUsers: { count: activeUsers, windowDays: ACTIVE_WINDOW_DAYS },
      newUsers: { count: newUsers, windowDays: ACTIVE_WINDOW_DAYS },
      totalGoalsCreated,
      activeHabits,
    };

    await this.record(principal, context, AuditAction.ADMIN_OVERVIEW_VIEWED, {
      entityType: 'admin_overview',
    });
    return response;
  }

  async listUsers(
    principal: AuthPrincipal,
    query: AdminUsersQuery,
    context: RequestContext,
  ): Promise<AdminUsersResponse> {
    const builder = this.users
      .createQueryBuilder('user')
      .where('user.userType = :userType', { userType: UserType.CUSTOMER });
    const search = query.search?.trim().toLowerCase();
    if (search) {
      builder.andWhere(
        `(LOWER(user.email) LIKE :search OR LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(COALESCE(user.displayName, '')) LIKE :search)`,
        { search: `%${search}%` },
      );
    }
    const [users, total] = await builder
      .orderBy('user.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    await this.record(principal, context, AuditAction.ADMIN_USERS_LISTED, {
      entityType: 'users',
      metadata: {
        page: query.page,
        pageSize: query.pageSize,
        searched: Boolean(search),
      },
    });
    return {
      items: users.map((user) => this.toUserListItem(user)),
      ...this.pagination(query.page, query.pageSize, total),
    };
  }

  async listProgressLevels(
    principal: AuthPrincipal,
    context: RequestContext,
  ): Promise<AdminProgressLevelsResponse> {
    const rows = await this.users
      .createQueryBuilder('user')
      .select('user.currentLevel', 'level')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.userType = :userType', { userType: UserType.CUSTOMER })
      .groupBy('user.currentLevel')
      .getRawMany<{ level: number | null; count: string }>();
    const counts = new Map(
      rows.map((row) => [Number(row.level), Number(row.count)]),
    );
    const unassignedCount = Number(
      rows.find((row) => row.level === null)?.count ?? 0,
    );

    await this.record(principal, context, AuditAction.ADMIN_OVERVIEW_VIEWED, {
      entityType: 'progress_levels',
    });
    return {
      levels: [1, 2, 3, 4, 5].map((level) => ({
        level,
        count: counts.get(level) ?? 0,
      })),
      unassignedCount,
    };
  }

  async listProgressLevelUsers(
    principal: AuthPrincipal,
    level: number,
    query: PaginationQuery,
    context: RequestContext,
  ): Promise<AdminProgressLevelUsersResponse> {
    const [users, total] = await this.users.findAndCount({
      where: { userType: UserType.CUSTOMER, currentLevel: level },
      order: { currentLevelAssignedAt: 'DESC', id: 'ASC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    await this.record(principal, context, AuditAction.ADMIN_USERS_LISTED, {
      entityType: 'progress_level_users',
      metadata: { level, page: query.page, pageSize: query.pageSize },
    });
    return {
      level,
      items: users.flatMap((user) =>
        user.currentLevelAssignedAt && user.currentLevelSource
          ? [
              {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                assignedAt: user.currentLevelAssignedAt.toISOString(),
                source: user.currentLevelSource,
              },
            ]
          : [],
      ),
      ...this.pagination(query.page, query.pageSize, total),
    };
  }

  async listSavingsCustomers(
    principal: AuthPrincipal,
    context: RequestContext,
  ): Promise<AdminSavingsCustomersResponse> {
    const rows = await this.users
      .createQueryBuilder('user')
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
      .where('user.userType = :userType', { userType: UserType.CUSTOMER })
      .groupBy('user.id')
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
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

    await this.record(principal, context, AuditAction.ADMIN_USERS_LISTED, {
      entityType: 'savings_customers',
      metadata: { count: rows.length },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: `${row.firstName} ${row.lastName}`.trim(),
        email: row.email,
        savedAmount: Number(row.savedAmount),
        targetAmount: Number(row.targetAmount),
        goalCount: Number(row.goalCount),
        pathwayEligible: row.pathwayEligible,
      })),
    };
  }

  async getSavingsCustomer(
    principal: AuthPrincipal,
    id: string,
    context: RequestContext,
  ): Promise<AdminSavingsCustomerDetail> {
    const user = await this.users.findOne({
      where: { id, userType: UserType.CUSTOMER },
    });
    if (!user) throw new NotFoundException('Customer account not found.');

    const [goals, entries] = await Promise.all([
      this.goals.find({ where: { userId: id }, order: { createdAt: 'ASC' } }),
      this.savingsEntries.find({
        where: { userId: id },
        order: { createdAt: 'ASC', id: 'ASC' },
      }),
    ]);
    const entriesByGoal = new Map<string, SavingsEntry[]>();
    for (const entry of entries) {
      const existing = entriesByGoal.get(entry.userGoalId) ?? [];
      existing.push(entry);
      entriesByGoal.set(entry.userGoalId, existing);
    }

    await this.record(principal, context, AuditAction.ADMIN_USER_VIEWED, {
      entityType: 'savings_customer',
      entityId: id,
    });
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      goals: goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        savedAmount: goal.savedAmount,
        targetAmount: goal.targetAmount,
        isPathwayEligible: goal.isPathwayEligible,
        isFocus: goal.isFocus,
        isActive: goal.isActive,
        entries: (entriesByGoal.get(goal.id) ?? []).map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          createdAt: entry.createdAt.toISOString(),
        })),
      })),
    };
  }

  async getUser(
    principal: AuthPrincipal,
    id: string,
    context: RequestContext,
  ): Promise<AdminUserDetailResponse> {
    const user = await this.users.findOne({
      where: { id, userType: UserType.CUSTOMER },
    });
    if (!user) throw new NotFoundException('Customer account not found.');

    const [goals, habits, pathwayApplications, userValues, activityCounts] =
      await Promise.all([
        this.goals.find({
          where: { userId: id },
          order: { createdAt: 'DESC' },
        }),
        this.habits.find({
          where: { userId: id },
          relations: { sourceTemplate: true },
          order: { createdAt: 'DESC' },
        }),
        this.applications.find({
          where: { userId: id },
          relations: {
            user: true,
            pathway: true,
            applicationPartners: { partner: true },
            checklistItems: true,
          },
          order: { submittedAt: 'DESC', createdAt: 'DESC' },
        }),
        this.userValues.find({
          where: { userId: id },
          relations: { value: true },
        }),
        this.userActivityCounts(id),
      ]);

    const values = userValues
      .map((row) => row.value)
      .filter((value): value is Value => Boolean(value))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toValuePublic);

    await this.record(principal, context, AuditAction.ADMIN_USER_VIEWED, {
      entityType: 'user',
      entityId: id,
    });
    return {
      ...this.toUserListItem(user),
      country: user.country,
      state: user.state,
      city: user.city,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      goals: goals.map((goal) => {
        const progress = toUserGoalPublic(goal);
        return {
          id: goal.id,
          title: goal.title,
          targetAmount: goal.targetAmount,
          savedAmount: goal.savedAmount,
          remainingAmount: progress.remainingAmount,
          progressPercent: progress.progressPercent,
          isActive: goal.isActive,
          isFocus: goal.isFocus,
          isPathwayEligible: goal.isPathwayEligible,
          createdAt: goal.createdAt.toISOString(),
        };
      }),
      habits: habits.flatMap((habit) =>
        habit.sourceTemplate
          ? [
              {
                id: habit.id,
                title: habit.sourceTemplate.title,
                frequency: habit.sourceTemplate.frequency,
                category: habit.sourceTemplate.category,
                isActive: habit.isActive,
                createdAt: habit.createdAt.toISOString(),
              },
            ]
          : [],
      ),
      pathwayApplications: pathwayApplications.map((application) =>
        this.toApplicationListItem(application),
      ),
      values,
      activityCounts,
    };
  }

  async listPathwayApplications(
    principal: AuthPrincipal,
    query: AdminPathwayApplicationsQuery,
    context: RequestContext,
  ): Promise<AdminPathwayApplicationsResponse> {
    const builder = this.applications
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.user', 'user')
      .innerJoinAndSelect('application.pathway', 'pathway')
      .leftJoinAndSelect(
        'application.applicationPartners',
        'applicationPartner',
      )
      .leftJoinAndSelect('applicationPartner.partner', 'partner')
      .leftJoinAndSelect('application.checklistItems', 'checklistItem')
      .distinct(true);
    if (query.pathwayKey) {
      builder.andWhere('application.pathwayKey = :pathwayKey', {
        pathwayKey: query.pathwayKey,
      });
    }
    if (query.status) {
      builder.andWhere('application.status = :status', {
        status: query.status,
      });
    }
    const countBuilder = builder.clone();
    const [applications, total, pathways] = await Promise.all([
      builder
        .orderBy('application.submittedAt', 'DESC', 'NULLS LAST')
        .addOrderBy('application.createdAt', 'DESC')
        .skip((query.page - 1) * query.pageSize)
        .take(query.pageSize)
        .getMany(),
      countBuilder.getCount(),
      this.pathways.find({ order: { sortOrder: 'ASC' } }),
    ]);

    await this.record(
      principal,
      context,
      AuditAction.ADMIN_PATHWAY_APPLICATIONS_LISTED,
      {
        entityType: 'pathway_applications',
        metadata: {
          page: query.page,
          pageSize: query.pageSize,
          pathwayKey: query.pathwayKey ?? null,
          status: query.status ?? null,
        },
      },
    );
    return {
      items: applications.map((application) =>
        this.toApplicationListItem(application),
      ),
      pathways: pathways.map((pathway) => ({
        key: pathway.key,
        title: pathway.title,
      })),
      ...this.pagination(query.page, query.pageSize, total),
    };
  }

  async getPathwayApplication(
    principal: AuthPrincipal,
    id: string,
    context: RequestContext,
  ): Promise<AdminPathwayApplicationDetailResponse> {
    const application = await this.applications.findOne({
      where: { id },
      relations: {
        user: true,
        pathway: true,
        applicationPartners: { partner: true },
        checklistItems: { checklistTemplate: true },
      },
    });
    if (!application?.user || !application.pathway) {
      throw new NotFoundException('Pathway application not found.');
    }

    await this.record(
      principal,
      context,
      AuditAction.ADMIN_PATHWAY_APPLICATION_VIEWED,
      {
        entityType: 'pathway_application',
        entityId: id,
        metadata: { userId: application.userId },
      },
    );
    return {
      id: application.id,
      applicant: this.toApplicant(application.user),
      pathway: this.toPathwaySummary(application.pathway),
      attestedAmount: application.attestedAmount,
      attestationAcceptedAt:
        application.attestationAcceptedAt?.toISOString() ?? null,
      verificationMethod: application.verificationMethod,
      status: application.status,
      submittedAt: application.submittedAt?.toISOString() ?? null,
      selectedPartners: (application.applicationPartners ?? [])
        .flatMap((row) =>
          row.partner
            ? [
                {
                  id: row.partner.id,
                  name: row.partner.name,
                  partnerType: row.partner.partnerType,
                  description: row.partner.description,
                  locationLabel: row.partner.locationLabel,
                  capabilityTags: row.partner.capabilityTags,
                },
              ]
            : [],
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
      checklistItems: (application.checklistItems ?? [])
        .flatMap((item) =>
          item.checklistTemplate ? [this.toChecklistItem(item)] : [],
        )
        .sort((left, right) => left.sortOrder - right.sortOrder),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }

  async updateChecklistItem(
    principal: AuthPrincipal,
    id: string,
    input: AdminChecklistUpdateInput,
    context: RequestContext,
  ): Promise<AdminChecklistItem> {
    const result = await this.checklistItems.manager.transaction(
      async (manager) => {
        const application = await manager
          .getRepository(PathwayApplication)
          .createQueryBuilder('application')
          .innerJoin(
            'application.checklistItems',
            'checklistItem',
            'checklistItem.id = :id',
            { id },
          )
          .where('application.status = :status', {
            status: PathwayApplicationStatus.SUBMITTED,
          })
          .setLock('pessimistic_write')
          .getOne();
        if (!application) {
          throw new NotFoundException(
            'Checklist item for a submitted application not found.',
          );
        }

        const item = await manager
          .getRepository(PathwayChecklistItem)
          .createQueryBuilder('item')
          .innerJoinAndSelect('item.checklistTemplate', 'checklistTemplate')
          .where('item.id = :id', { id })
          .andWhere('item.applicationId = :applicationId', {
            applicationId: application.id,
          })
          .getOne();
        if (!item) {
          throw new NotFoundException(
            'Checklist item for a submitted application not found.',
          );
        }
        item.isComplete = input.isComplete;
        item.completedAt = input.isComplete ? new Date() : null;
        return {
          item: await manager.save(item),
          userId: application.userId,
        };
      },
    );

    await this.record(
      principal,
      context,
      AuditAction.ADMIN_PATHWAY_CHECKLIST_UPDATED,
      {
        entityType: 'pathway_checklist_item',
        entityId: id,
        metadata: {
          applicationId: result.item.applicationId,
          isComplete: result.item.isComplete,
          userId: result.userId,
        },
      },
    );
    return this.toChecklistItem(result.item);
  }

  async listUpgradeIntents(
    principal: AuthPrincipal,
    query: AdminUpgradeIntentsQuery,
    context: RequestContext,
  ): Promise<AdminUpgradeIntentsResponse> {
    const [intents, total, groups] = await Promise.all([
      this.upgradeIntents.find({
        relations: { user: true, plan: true },
        order: { createdAt: 'DESC' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.upgradeIntents.count(),
      this.plans
        .createQueryBuilder('plan')
        .leftJoin(UpgradeIntent, 'intent', 'intent.plan_key = plan.key')
        .select('plan.key', 'key')
        .addSelect('plan.name', 'label')
        .addSelect('COUNT(intent.id)', 'count')
        .groupBy('plan.key')
        .addGroupBy('plan.name')
        .addGroupBy('plan.sortOrder')
        .orderBy('plan.sortOrder', 'ASC')
        .getRawMany<{ key: TierValue; label: string; count: string }>(),
    ]);

    await this.record(
      principal,
      context,
      AuditAction.ADMIN_UPGRADE_INTENTS_LISTED,
      {
        entityType: 'upgrade_intents',
        metadata: { page: query.page, pageSize: query.pageSize },
      },
    );
    return {
      groups: groups.map((group) => ({
        key: group.key,
        label: group.label,
        count: Number(group.count),
      })),
      items: intents.flatMap((intent) =>
        intent.user && intent.plan
          ? [
              {
                id: intent.id,
                user: this.toApplicant(intent.user),
                planKey: intent.planKey,
                planName: intent.plan.name,
                createdAt: intent.createdAt.toISOString(),
              },
            ]
          : [],
      ),
      ...this.pagination(query.page, query.pageSize, total),
    };
  }

  private async userActivityCounts(userId: string) {
    const [
      goals,
      activeGoals,
      habits,
      activeHabits,
      habitCompletions,
      savingsEntries,
      pathwayApplications,
      submittedPathwayApplications,
      reflections,
    ] = await Promise.all([
      this.goals.count({ where: { userId } }),
      this.goals.count({ where: { userId, isActive: true } }),
      this.habits.count({ where: { userId } }),
      this.habits.count({ where: { userId, isActive: true } }),
      this.habitCompletions.count({ where: { userId } }),
      this.savingsEntries.count({ where: { userId } }),
      this.applications.count({ where: { userId } }),
      this.applications.count({
        where: { userId, status: PathwayApplicationStatus.SUBMITTED },
      }),
      this.reflections.count({ where: { userId } }),
    ]);
    return {
      goals,
      activeGoals,
      habits,
      activeHabits,
      habitCompletions,
      savingsEntries,
      pathwayApplications,
      submittedPathwayApplications,
      reflections,
    };
  }

  private toUserListItem(user: User): AdminUserListItem {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      email: user.email,
      tier: user.tier,
      status: user.status,
      onboardingStatus: user.onboardingStatus,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      timeZone: user.timeZone,
    };
  }

  private toStaffListItem(user: User): AdminStaffListItem {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      adminRole: user.adminRole!,
      status: user.status as 'active' | 'suspended',
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }

  private toCustomRole(role: CustomRole): AdminCustomRole {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  private toApplicant(user: User) {
    return {
      id: user.id,
      name: user.displayName ?? `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      timeZone: user.timeZone,
    };
  }

  private toPathwaySummary(pathway: Pathway) {
    return {
      key: pathway.key,
      title: pathway.title,
      minimumAmount: pathway.minimumAmount,
    };
  }

  private toApplicationListItem(
    application: PathwayApplication,
  ): AdminPathwayApplicationListItem {
    if (!application.user || !application.pathway) {
      throw new NotFoundException('Pathway application data is incomplete.');
    }
    const checklist = application.checklistItems ?? [];
    return {
      id: application.id,
      applicant: this.toApplicant(application.user),
      pathway: this.toPathwaySummary(application.pathway),
      attestedAmount: application.attestedAmount,
      verificationMethod: application.verificationMethod,
      status: application.status,
      selectedPartners: (application.applicationPartners ?? []).flatMap(
        (row) =>
          row.partner ? [{ id: row.partner.id, name: row.partner.name }] : [],
      ),
      checklistProgress: {
        completed: checklist.filter((item) => item.isComplete).length,
        total: checklist.length,
      },
      submittedAt: application.submittedAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
    };
  }

  private toChecklistItem(item: PathwayChecklistItem): AdminChecklistItem {
    if (!item.checklistTemplate) {
      throw new NotFoundException('Checklist template not found.');
    }
    return {
      id: item.id,
      category: item.checklistTemplate.category,
      title: item.checklistTemplate.title,
      description: item.checklistTemplate.description,
      isComplete: item.isComplete,
      completedAt: item.completedAt?.toISOString() ?? null,
      sortOrder: item.checklistTemplate.sortOrder,
    };
  }

  private pagination(page: number, pageSize: number, total: number) {
    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  private record(
    principal: AuthPrincipal,
    context: RequestContext,
    action: Parameters<AuditService['record']>[0]['action'],
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
