/**
 * Read-only aggregates for the analytics workspace. Every figure counts
 * customers only and excludes soft-deleted accounts. Weeks are UTC, and each
 * report's queries share one snapshot so its sections always agree. Pages and
 * CSV exports call the same build methods, so they cannot disagree either.
 */
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  AdminPermission,
  AuditAction,
  AuditActorType,
  HabitFrequency,
  OnboardingStatus,
  UserStatus,
  hasAdminPermission,
  type AdminAnalyticsAccess,
  type AdminAnalyticsQuery,
  type AdminUserAnalyticsResponse,
  type AdminWellnessAnalyticsResponse,
  type AdminPathwayAnalyticsResponse,
  type AdminCommercialAnalyticsResponse,
  type AdminRetentionResponse,
  type AdminAnalyticsExport,
  type AnalyticsReportKey,
  type AnalyticsRange,
  utcToday,
  analyticsExportColumns,
  retentionWeekValues,
  type AdminPermissionValue,
  type HabitFrequencyValue,
  type OnboardingStatusValue,
  type UserStatusValue,
} from '@purposemint/contracts';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import type { RequestContext } from '../common/request-context';
import { AuditEvent } from '../entities/audit-event.entity';
import { CustomRole } from '../entities/custom-role.entity';
import {
  pathwayRows,
  retentionRows,
  subscriptionRows,
  userAnalyticsRows,
  wellnessRows,
} from './analytics-export';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The resolved reporting window. A preset ends now; a custom range runs from
 * the start of its first day to the end of its last day (UTC), never past now.
 */
interface ReportWindow {
  start: Date;
  end: Date;
  days: number;
}

function resolveWindow(range: AnalyticsRange, now = new Date()): ReportWindow {
  if (!range.from || !range.to) {
    return {
      start: new Date(now.getTime() - range.days * DAY_MS),
      end: now,
      days: range.days,
    };
  }
  const endOfLastDay = Date.parse(`${range.to}T00:00:00Z`) + DAY_MS;
  return {
    start: new Date(`${range.from}T00:00:00Z`),
    end: new Date(Math.min(endOfLastDay, now.getTime())),
    days: range.days,
  };
}

/** The last instant inside a window, for week series that must not run past it. */
function lastInstant(end: Date): Date {
  return new Date(end.getTime() - 1);
}

/** What audit rows record about the range a report covered. */
function rangeMetadata(range: AnalyticsRange) {
  return range.from && range.to
    ? { windowDays: range.days, from: range.from, to: range.to }
    : { windowDays: range.days };
}

/** Runs a report's queries in one transaction (one consistent snapshot). */
type SnapshotRunner = <T>(
  work: (manager: EntityManager) => Promise<T>,
) => Promise<T>;
/** Matches the overview's active window; also used by retention later. */
const INACTIVE_WINDOW_DAYS = 30;

const STATUS_LABELS: Record<UserStatusValue, string> = {
  [UserStatus.ACTIVE]: 'Active',
  [UserStatus.PENDING_EMAIL]: 'Pending email',
  [UserStatus.SUSPENDED]: 'Suspended',
};

const ONBOARDING_LABELS: Record<OnboardingStatusValue, string> = {
  [OnboardingStatus.NOT_STARTED]: 'Not started',
  [OnboardingStatus.IN_PROGRESS]: 'In progress',
  [OnboardingStatus.COMPLETED]: 'Completed',
};

const FREQUENCY_LABELS: Record<HabitFrequencyValue, string> = {
  [HabitFrequency.DAILY]: 'Daily',
  [HabitFrequency.WEEKLY]: 'Weekly',
  [HabitFrequency.AS_NEEDED]: 'As needed',
};

/** Share of target saved; each goal falls in exactly one bucket. */
const GOAL_BUCKETS = [
  { key: 'not_started', label: 'Nothing saved yet' },
  { key: 'under_25', label: '1 to 24%' },
  { key: 'under_50', label: '25 to 49%' },
  { key: 'under_75', label: '50 to 74%' },
  { key: 'under_100', label: '75 to 99%' },
  { key: 'reached', label: 'Reached target' },
] as const;

interface SavingsTotalsRow {
  total_saved: number;
  starting_total: number;
  saved_in_window: number;
  savers_in_window: number;
}

interface SavingsWeekRow {
  week_start: string;
  amount: number;
}

interface HabitRow {
  frequency: HabitFrequencyValue;
  days: number;
  habits: number;
  completed: number;
  expected: number;
}

interface LevelRow {
  level: number | null;
  count: number;
}

interface LevelSourceRow {
  mock: number;
  calculated: number;
  manual: number;
}

interface PathwayApplicationRow {
  key: string;
  label: string;
  draft: number;
  submitted: number;
}

interface ChecklistRow {
  applications: number;
  fully_complete: number;
  average_progress: number | null;
}

interface PartnerRow {
  key: string;
  label: string;
  partner_type: string;
  pathway_key: string;
  count: number;
}

interface EligibilityRow {
  key: string;
  label: string;
  minimum_amount: number;
  eligible_customers: number;
}

interface PremiumTotalsRow {
  total_customers: number;
  paid_customers: number;
  new_paid: number;
  with_eligible_goals: number;
  demo_levels: boolean;
}

interface PlanRow {
  key: string;
  label: string;
  price_monthly: number;
  count: number;
}

/** A paid subscription: still in force and billed above zero. */
const PAID_SUBSCRIPTION = `s.status IN ('active', 'past_due')
  AND COALESCE((s.billing->>'amountCents')::numeric, 0) > 0`;

/**
 * A history row that moves a subscription from free (or nothing) to a plan
 * billed above zero. Staff creating a paid subscription is an `assigned` row
 * with no previous billing, so brand new paid subscriptions count too.
 * Legacy imports are data migration, not customer activity, and do not.
 */
const FREE_TO_PAID_MOVE = `h.action IN ('upgraded', 'assigned', 'plan_changed')
  AND COALESCE((h.new_billing->>'amountCents')::numeric, 0) > 0
  AND COALESCE((h.previous_billing->>'amountCents')::numeric, 0) = 0`;

interface PlanLookupRow {
  key: string;
  label: string;
  price_monthly: number;
}

interface ConversionRow {
  action: string;
  plan_key: string;
  count: number;
}

interface IntentRow {
  plan_key: string;
  intents: number;
  converted: number;
  matched: number;
}

interface CancellationRow {
  plan_key: string;
  cancelled: number;
  scheduled: number;
  cancelled_amount: number;
}

interface PaymentRow {
  failed_records: number;
  failed_amount: number;
  paid_records: number;
  paid_amount: number;
  past_due: number;
  past_due_amount: number;
  open_failed_payments: number;
}

const CONVERSION_ACTIONS = [
  { key: 'upgraded', label: 'Upgraded' },
  { key: 'assigned', label: 'Assigned by staff' },
  { key: 'plan_changed', label: 'Plan changed' },
] as const;

/** Billed amount per month, in dollars, from a subscription's billing terms. */
const MONTHLY_AMOUNT = `COALESCE((s.billing->>'amountCents')::numeric, 0) / 100
  / CASE WHEN s.billing->>'cycle' = 'yearly' THEN 12 ELSE 1 END`;

interface RetentionCellRow {
  week_start: string;
  week: number;
  size: number;
  available: boolean;
  active: number;
}

interface ActiveShareRow {
  total_customers: number;
  active_7: number;
  active_30: number;
}

/**
 * One row per customer and day with any activity: a habit completion, savings
 * entry, reflection or sign-in session. Timestamps become UTC dates.
 */
const CUSTOMER_ACTIVITY_DAYS = `
  SELECT user_id, completed_on AS active_on FROM habit_completions
  UNION SELECT user_id, (created_at AT TIME ZONE 'UTC')::date FROM savings_entries
  UNION SELECT user_id, reflected_on FROM reflections
  UNION SELECT user_id, (created_at AT TIME ZONE 'UTC')::date FROM user_sessions`;

interface AcquisitionRow {
  total_customers: number;
  new_customers: number;
  previous_new_customers: number;
  new_verified: number;
}

interface WeekRow {
  week_start: string;
  count: number;
}

interface GroupRow {
  key: string;
  count: number;
}

interface CohortRow {
  cohort_size: number;
  verified: number;
  onboarding_started: number;
  onboarding_completed: number;
  first_goal: number;
  first_savings: number;
  first_habit: number;
  first_reflection: number;
  activated: number;
  median_days_to_onboarding: number | null;
  funnel_verified: number;
  funnel_started: number;
  funnel_completed: number;
  funnel_goal: number;
  funnel_savings: number;
  funnel_application: number;
  funnel_submitted: number;
  lapsed_onboarded: number;
  lapsed_inactive: number;
  deletion_requested: number;
}

const CUSTOMER = `u.user_type = 'customer' AND u.deleted_at IS NULL`;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(CustomRole)
    private readonly customRoles: Repository<CustomRole>,
    private readonly audit: AuditService,
  ) {}

  /** Pages read each report in its own repeatable-read snapshot. */
  private readonly snapshot: SnapshotRunner = (work) =>
    this.dataSource.transaction('REPEATABLE READ', work);

  /**
   * Builds one report's CSV from the same build method its page uses. The
   * audit row is written first, in the same transaction and allowed to throw:
   * if it cannot be saved, the export fails and no rows are returned.
   */
  async exportReport(
    principal: AuthPrincipal,
    report: AnalyticsReportKey,
    query: AdminAnalyticsQuery,
    context: RequestContext,
  ): Promise<AdminAnalyticsExport> {
    const headers = [...analyticsExportColumns];
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const metadata = { report, ...rangeMetadata(query), columns: headers };
      const event = await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_REPORT_EXPORTED,
        actorUserId: principal.userId,
        actorType: AuditActorType.ADMIN,
        entityType: 'analytics',
        entityId: report,
        ipAddress: context.ipAddress,
        metadata: { ...metadata, rowCount: null },
      });
      const run: SnapshotRunner = (work) => work(manager);
      const rows = await this.exportRows(report, resolveWindow(query), run);
      // Same transaction, so the row count lands before anything commits.
      await manager.update(AuditEvent, event.id, {
        metadata: { ...metadata, rowCount: rows.length },
      });
      const span =
        query.from && query.to
          ? `${query.from}-to-${query.to}`
          : `${query.days}d-${utcToday()}`;
      return {
        filename: `purposemint-${report}-analytics-${span}.csv`,
        headers,
        rows,
      };
    });
  }

  private async exportRows(
    report: AnalyticsReportKey,
    window: ReportWindow,
    run: SnapshotRunner,
  ): Promise<AdminAnalyticsExport['rows']> {
    switch (report) {
      case 'users':
        return userAnalyticsRows(await this.buildUserAnalytics(window, run));
      case 'wellness':
        return wellnessRows(await this.buildWellnessAnalytics(window, run));
      case 'pathways':
        return pathwayRows(await this.buildPathwayAnalytics(window, run));
      case 'subscriptions':
        return subscriptionRows(
          await this.buildCommercialAnalytics(window, run),
        );
      case 'retention':
        return retentionRows(await this.buildRetention(window, run));
    }
  }

  async access(principal: AuthPrincipal): Promise<AdminAnalyticsAccess> {
    const custom = principal.customRoleId
      ? await this.customRoles.findOneBy({ id: principal.customRoleId })
      : null;
    // Mirrors PermissionsGuard: a custom role replaces the built-in role.
    const allows = (permission: AdminPermissionValue) =>
      principal.customRoleId
        ? Boolean(
            custom && hasAdminPermission(null, permission, custom.permissions),
          )
        : hasAdminPermission(principal.adminRole, permission);
    return {
      canView: allows(AdminPermission.REPORTS_VIEW),
      canExport: allows(AdminPermission.REPORTS_FULL),
    };
  }

  async userAnalytics(
    principal: AuthPrincipal,
    query: AdminAnalyticsQuery,
    context: RequestContext,
  ): Promise<AdminUserAnalyticsResponse> {
    const response = await this.buildUserAnalytics(
      resolveWindow(query),
      this.snapshot,
    );
    await this.record(principal, context, {
      report: 'user_analytics',
      ...rangeMetadata(query),
    });
    return response;
  }

  /** Acquisition, activation and drop off. Shared by the page and its CSV export. */
  private async buildUserAnalytics(
    window: ReportWindow,
    run: SnapshotRunner,
  ): Promise<AdminUserAnalyticsResponse> {
    const now = new Date();
    const { start: windowStart, end: windowEnd } = window;
    // The equal-length span immediately before the window.
    const previousStart = new Date(
      windowStart.getTime() - (windowEnd.getTime() - windowStart.getTime()),
    );
    const inactiveSince = new Date(
      now.getTime() - INACTIVE_WINDOW_DAYS * DAY_MS,
    );

    const { acquisition, weeks, statuses, onboarding, cohort } = await run(
      async (manager) => {
        const [acquisitionRow] = await manager.query<AcquisitionRow[]>(
          `SELECT
             COUNT(*)::int AS total_customers,
             COUNT(*) FILTER (WHERE u.created_at >= $1 AND u.created_at < $3)::int AS new_customers,
             COUNT(*) FILTER (WHERE u.created_at >= $2 AND u.created_at < $1)::int AS previous_new_customers,
             COUNT(*) FILTER (WHERE u.created_at >= $1 AND u.created_at < $3
               AND u.email_verified_at IS NOT NULL)::int AS new_verified
           FROM users u WHERE ${CUSTOMER}`,
          [windowStart, previousStart, windowEnd],
        );
        const weekRows = await manager.query<WeekRow[]>(
          `SELECT to_char(weeks.week_start, 'YYYY-MM-DD') AS week_start,
             COUNT(u.id)::int AS count
           FROM generate_series(
             date_trunc('week', $1::timestamptz AT TIME ZONE 'UTC'),
             date_trunc('week', $2::timestamptz AT TIME ZONE 'UTC'),
             interval '1 week'
           ) AS weeks(week_start)
           LEFT JOIN users u ON ${CUSTOMER} AND u.created_at >= $1
             AND u.created_at < $3
             AND date_trunc('week', u.created_at AT TIME ZONE 'UTC') = weeks.week_start
           GROUP BY weeks.week_start
           ORDER BY weeks.week_start`,
          [windowStart, lastInstant(windowEnd), windowEnd],
        );
        const statusRows = await manager.query<GroupRow[]>(
          `SELECT u.status::text AS key, COUNT(*)::int AS count
           FROM users u WHERE ${CUSTOMER} AND u.created_at >= $1
             AND u.created_at < $2
           GROUP BY u.status`,
          [windowStart, windowEnd],
        );
        const onboardingRows = await manager.query<GroupRow[]>(
          `SELECT u.onboarding_status::text AS key, COUNT(*)::int AS count
           FROM users u WHERE ${CUSTOMER} AND u.created_at >= $1
             AND u.created_at < $2
           GROUP BY u.onboarding_status`,
          [windowStart, windowEnd],
        );
        const [cohortRow] = await manager.query<CohortRow[]>(
          `WITH cohort AS (
             SELECT u.id, u.created_at, u.email_verified_at, u.onboarding_status,
               u.onboarding_completed_at, u.delete_account_requested_at,
               EXISTS (SELECT 1 FROM user_goals g WHERE g.user_id = u.id) AS has_goal,
               EXISTS (SELECT 1 FROM savings_entries s WHERE s.user_id = u.id) AS has_savings,
               EXISTS (SELECT 1 FROM habit_completions h WHERE h.user_id = u.id) AS has_habit,
               EXISTS (SELECT 1 FROM reflections r WHERE r.user_id = u.id) AS has_reflection,
               EXISTS (SELECT 1 FROM pathway_applications a WHERE a.user_id = u.id) AS has_application,
               EXISTS (SELECT 1 FROM pathway_applications a
                 WHERE a.user_id = u.id AND a.status = 'submitted') AS has_submitted,
               (
                 EXISTS (SELECT 1 FROM habit_completions h
                   WHERE h.user_id = u.id AND h.completed_on >= ($2::timestamptz AT TIME ZONE 'UTC')::date)
                 OR EXISTS (SELECT 1 FROM savings_entries s
                   WHERE s.user_id = u.id AND s.created_at >= $2)
                 OR EXISTS (SELECT 1 FROM reflections r
                   WHERE r.user_id = u.id AND r.reflected_on >= ($2::timestamptz AT TIME ZONE 'UTC')::date)
                 OR EXISTS (SELECT 1 FROM user_sessions us
                   WHERE us.user_id = u.id AND us.created_at >= $2)
               ) AS recently_active
             FROM users u WHERE ${CUSTOMER} AND u.created_at >= $1
               AND u.created_at < $3
           ), staged AS (
             SELECT c.*,
               c.email_verified_at IS NOT NULL AS s_verified,
               c.onboarding_status <> 'not_started' AS s_started,
               c.onboarding_status = 'completed' AS s_completed
             FROM cohort c
           )
           SELECT
             COUNT(*)::int AS cohort_size,
             COUNT(*) FILTER (WHERE s_verified)::int AS verified,
             COUNT(*) FILTER (WHERE s_started)::int AS onboarding_started,
             COUNT(*) FILTER (WHERE s_completed)::int AS onboarding_completed,
             COUNT(*) FILTER (WHERE has_goal)::int AS first_goal,
             COUNT(*) FILTER (WHERE has_savings)::int AS first_savings,
             COUNT(*) FILTER (WHERE has_habit)::int AS first_habit,
             COUNT(*) FILTER (WHERE has_reflection)::int AS first_reflection,
             COUNT(*) FILTER (WHERE s_completed AND (has_savings OR has_habit))::int AS activated,
             percentile_cont(0.5) WITHIN GROUP (
               ORDER BY EXTRACT(EPOCH FROM onboarding_completed_at - created_at) / 86400
             ) FILTER (WHERE onboarding_completed_at IS NOT NULL) AS median_days_to_onboarding,
             COUNT(*) FILTER (WHERE s_verified)::int AS funnel_verified,
             COUNT(*) FILTER (WHERE s_verified AND s_started)::int AS funnel_started,
             COUNT(*) FILTER (WHERE s_verified AND s_completed)::int AS funnel_completed,
             COUNT(*) FILTER (WHERE s_verified AND s_completed AND has_goal)::int AS funnel_goal,
             COUNT(*) FILTER (WHERE s_verified AND s_completed AND has_goal AND has_savings)::int AS funnel_savings,
             COUNT(*) FILTER (WHERE s_verified AND s_completed AND has_goal AND has_savings
               AND has_application)::int AS funnel_application,
             COUNT(*) FILTER (WHERE s_verified AND s_completed AND has_goal AND has_savings
               AND has_submitted)::int AS funnel_submitted,
             COUNT(*) FILTER (WHERE s_completed)::int AS lapsed_onboarded,
             COUNT(*) FILTER (WHERE s_completed AND NOT recently_active)::int AS lapsed_inactive,
             COUNT(*) FILTER (WHERE delete_account_requested_at IS NOT NULL)::int AS deletion_requested
           FROM staged`,
          [windowStart, inactiveSince, windowEnd],
        );
        return {
          acquisition: acquisitionRow,
          weeks: weekRows,
          statuses: statusRows,
          onboarding: onboardingRows,
          cohort: cohortRow,
        };
      },
    );

    const statusCounts = new Map(statuses.map((row) => [row.key, row.count]));
    const onboardingCounts = new Map(
      onboarding.map((row) => [row.key, row.count]),
    );
    const median = cohort.median_days_to_onboarding;

    const response: AdminUserAnalyticsResponse = {
      windowDays: window.days,
      generatedAt: now.toISOString(),
      acquisition: {
        totalCustomers: acquisition.total_customers,
        newCustomers: acquisition.new_customers,
        previousPeriodNewCustomers: acquisition.previous_new_customers,
        emailVerifiedRate: this.percent(
          acquisition.new_verified,
          acquisition.new_customers,
        ),
        weekly: weeks.map((row) => ({
          weekStart: row.week_start,
          count: row.count,
        })),
        byStatus: Object.values(UserStatus).map((key) => ({
          key,
          label: STATUS_LABELS[key],
          count: statusCounts.get(key) ?? 0,
        })),
      },
      activation: {
        cohortSize: cohort.cohort_size,
        activated: cohort.activated,
        activationRate: this.percent(cohort.activated, cohort.cohort_size),
        medianDaysToOnboarding:
          median === null ? null : Number(Number(median).toFixed(1)),
        milestones: [
          {
            key: 'email_verified',
            label: 'Verified email',
            count: cohort.verified,
          },
          {
            key: 'onboarding_completed',
            label: 'Completed onboarding',
            count: cohort.onboarding_completed,
          },
          {
            key: 'first_goal',
            label: 'Created a goal',
            count: cohort.first_goal,
          },
          {
            key: 'first_savings',
            label: 'Logged savings',
            count: cohort.first_savings,
          },
          {
            key: 'first_habit',
            label: 'Completed a habit',
            count: cohort.first_habit,
          },
          {
            key: 'first_reflection',
            label: 'Wrote a reflection',
            count: cohort.first_reflection,
          },
        ],
      },
      dropOff: {
        funnel: [
          { key: 'registered', label: 'Registered', count: cohort.cohort_size },
          {
            key: 'email_verified',
            label: 'Verified email',
            count: cohort.funnel_verified,
          },
          {
            key: 'onboarding_started',
            label: 'Started onboarding',
            count: cohort.funnel_started,
          },
          {
            key: 'onboarding_completed',
            label: 'Completed onboarding',
            count: cohort.funnel_completed,
          },
          {
            key: 'first_goal',
            label: 'Created a goal',
            count: cohort.funnel_goal,
          },
          {
            key: 'first_savings',
            label: 'Logged savings',
            count: cohort.funnel_savings,
          },
          {
            key: 'application_started',
            label: 'Started a pathway application',
            count: cohort.funnel_application,
          },
          {
            key: 'application_submitted',
            label: 'Submitted an application',
            count: cohort.funnel_submitted,
          },
        ],
        onboardingStatus: Object.values(OnboardingStatus).map((key) => ({
          key,
          label: ONBOARDING_LABELS[key],
          count: onboardingCounts.get(key) ?? 0,
        })),
        lapsed: {
          onboardedCustomers: cohort.lapsed_onboarded,
          inactiveCustomers: cohort.lapsed_inactive,
          inactiveWindowDays: INACTIVE_WINDOW_DAYS,
        },
        deletionRequested: cohort.deletion_requested,
      },
    };

    return response;
  }

  async wellnessAnalytics(
    principal: AuthPrincipal,
    query: AdminAnalyticsQuery,
    context: RequestContext,
  ): Promise<AdminWellnessAnalyticsResponse> {
    const response = await this.buildWellnessAnalytics(
      resolveWindow(query),
      this.snapshot,
    );
    await this.record(principal, context, {
      report: 'wellness_analytics',
      ...rangeMetadata(query),
    });
    return response;
  }

  /** Savings, goals, habits and levels. Shared by the page and its CSV export. */
  private async buildWellnessAnalytics(
    window: ReportWindow,
    run: SnapshotRunner,
  ): Promise<AdminWellnessAnalyticsResponse> {
    const now = new Date();
    const { start: windowStart, end: windowEnd } = window;
    // Habit check-ins are calendar dates; periods end on today's UTC date.
    const today = now.toISOString().slice(0, 10);

    const { totals, weeks, goals, habits, levels, sources } = await run(
      async (manager) => {
        const [totalsRow] = await manager.query<SavingsTotalsRow[]>(
          `SELECT
             COALESCE(SUM(s.amount), 0)::float8 AS total_saved,
             COALESCE(SUM(s.amount) FILTER (WHERE s.created_at < $1), 0)::float8 AS starting_total,
             COALESCE(SUM(s.amount) FILTER (WHERE s.created_at >= $1 AND s.created_at < $2), 0)::float8 AS saved_in_window,
             COUNT(DISTINCT s.user_id) FILTER (WHERE s.created_at >= $1 AND s.created_at < $2)::int AS savers_in_window
           FROM savings_entries s JOIN users u ON u.id = s.user_id
           WHERE ${CUSTOMER}`,
          [windowStart, windowEnd],
        );
        const weekRows = await manager.query<SavingsWeekRow[]>(
          `SELECT to_char(weeks.week_start, 'YYYY-MM-DD') AS week_start,
             COALESCE(SUM(s.amount), 0)::float8 AS amount
           FROM generate_series(
             date_trunc('week', $1::timestamptz AT TIME ZONE 'UTC'),
             date_trunc('week', $2::timestamptz AT TIME ZONE 'UTC'),
             interval '1 week'
           ) AS weeks(week_start)
           LEFT JOIN (
             savings_entries s JOIN users u ON u.id = s.user_id AND ${CUSTOMER}
           ) ON s.created_at >= $1 AND s.created_at < $3
             AND date_trunc('week', s.created_at AT TIME ZONE 'UTC') = weeks.week_start
           GROUP BY weeks.week_start
           ORDER BY weeks.week_start`,
          [windowStart, lastInstant(windowEnd), windowEnd],
        );
        const [goalRow] = await manager.query<Record<string, number>[]>(
          `SELECT
             COUNT(*)::int AS active_goals,
             COUNT(*) FILTER (WHERE g.saved_amount >= g.target_amount)::int AS reached,
             COUNT(*) FILTER (WHERE g.saved_amount < g.target_amount AND g.saved_amount <= 0)::int AS not_started,
             COUNT(*) FILTER (WHERE g.saved_amount > 0 AND g.saved_amount < g.target_amount * 0.25)::int AS under_25,
             COUNT(*) FILTER (WHERE g.saved_amount >= g.target_amount * 0.25 AND g.saved_amount < g.target_amount * 0.5)::int AS under_50,
             COUNT(*) FILTER (WHERE g.saved_amount >= g.target_amount * 0.5 AND g.saved_amount < g.target_amount * 0.75)::int AS under_75,
             COUNT(*) FILTER (WHERE g.saved_amount >= g.target_amount * 0.75 AND g.saved_amount < g.target_amount)::int AS under_100
           FROM user_goals g JOIN users u ON u.id = g.user_id
           WHERE ${CUSTOMER} AND g.is_active`,
        );
        // Each habit is measured from the later of the period start and the
        // day it was added, so new habits are not penalised for days before
        // they existed. Duplicate check-ins on one date count once.
        const habitRows = await manager.query<HabitRow[]>(
          `WITH habits AS (
             SELECT h.id, t.frequency::text AS frequency,
               (h.created_at AT TIME ZONE 'UTC')::date AS created_on
             FROM user_habits h
             JOIN habit_templates t ON t.id = h.source_template_id
             JOIN users u ON u.id = h.user_id
             WHERE ${CUSTOMER} AND h.is_active
           ), measured AS (
             SELECT hb.frequency, p.days,
               GREATEST($1::date - p.days + 1, hb.created_on) AS period_start,
               hb.id
             FROM habits hb CROSS JOIN (VALUES (7), (30)) AS p(days)
           ), counted AS (
             SELECT m.frequency, m.days,
               GREATEST($1::date - m.period_start + 1, 0) AS active_days,
               (SELECT COUNT(DISTINCT c.completed_on) FROM habit_completions c
                 WHERE c.user_habit_id = m.id
                   AND c.completed_on BETWEEN m.period_start AND $1::date) AS done
             FROM measured m
           )
           SELECT frequency, days, COUNT(*)::int AS habits,
             SUM(CASE frequency
               WHEN 'daily' THEN LEAST(done, active_days)
               WHEN 'weekly' THEN LEAST(done, active_days / 7.0)
               ELSE (done > 0)::int END)::float8 AS completed,
             SUM(CASE frequency
               WHEN 'daily' THEN active_days
               WHEN 'weekly' THEN active_days / 7.0
               ELSE 1 END)::float8 AS expected
           FROM counted
           GROUP BY frequency, days`,
          [today],
        );
        // Mirrors listProgressLevels, limited to accounts that are not deleted.
        const levelRows = await manager.query<LevelRow[]>(
          `SELECT u.current_level AS level, COUNT(*)::int AS count
           FROM users u WHERE ${CUSTOMER}
           GROUP BY u.current_level`,
        );
        const [sourceRow] = await manager.query<LevelSourceRow[]>(
          `SELECT
             COUNT(*) FILTER (WHERE u.current_level_source = 'mock')::int AS mock,
             COUNT(*) FILTER (WHERE u.current_level_source = 'calculated')::int AS calculated,
             COUNT(*) FILTER (WHERE u.current_level_source = 'manual')::int AS manual
           FROM users u WHERE ${CUSTOMER} AND u.current_level IS NOT NULL`,
        );
        return {
          totals: totalsRow,
          weeks: weekRows,
          goals: goalRow,
          habits: habitRows,
          levels: levelRows,
          sources: sourceRow,
        };
      },
    );

    let cumulative = totals.starting_total;
    const habitPeriod = (frequency: HabitFrequencyValue, days: number) => {
      const row = habits.find(
        (item) => item.frequency === frequency && item.days === days,
      );
      const completed = this.round(row?.completed ?? 0);
      const expected = this.round(row?.expected ?? 0);
      return {
        completed,
        expected,
        rate: this.percent(row?.completed ?? 0, row?.expected ?? 0),
      };
    };
    const levelCounts = new Map(
      levels.map((row) => [row.level, row.count] as const),
    );

    const response: AdminWellnessAnalyticsResponse = {
      windowDays: window.days,
      generatedAt: now.toISOString(),
      savings: {
        totalSaved: this.round(totals.total_saved),
        startingTotal: this.round(totals.starting_total),
        savedInWindow: this.round(totals.saved_in_window),
        saversInWindow: totals.savers_in_window,
        weekly: weeks.map((row) => {
          cumulative += row.amount;
          return {
            weekStart: row.week_start,
            amount: this.round(row.amount),
            cumulative: this.round(cumulative),
          };
        }),
      },
      goals: {
        activeGoals: goals.active_goals ?? 0,
        reachedTarget: goals.reached ?? 0,
        buckets: GOAL_BUCKETS.map((bucket) => ({
          ...bucket,
          count: goals[bucket.key] ?? 0,
        })),
      },
      habits: {
        byFrequency: Object.values(HabitFrequency).map((key) => ({
          key,
          label: FREQUENCY_LABELS[key],
          activeHabits:
            habits.find((row) => row.frequency === key && row.days === 7)
              ?.habits ?? 0,
          last7Days: habitPeriod(key, 7),
          last30Days: habitPeriod(key, 30),
        })),
      },
      levels: {
        levels: [1, 2, 3, 4, 5].map((level) => ({
          level,
          count: levelCounts.get(level) ?? 0,
        })),
        unassignedCount: levelCounts.get(null) ?? 0,
        sources,
      },
    };

    return response;
  }

  async pathwayAnalytics(
    principal: AuthPrincipal,
    query: AdminAnalyticsQuery,
    context: RequestContext,
  ): Promise<AdminPathwayAnalyticsResponse> {
    const response = await this.buildPathwayAnalytics(
      resolveWindow(query),
      this.snapshot,
    );
    await this.record(principal, context, {
      report: 'pathway_analytics',
      ...rangeMetadata(query),
    });
    return response;
  }

  /** Pathway applications, partners, eligibility and plans. Shared by the page and its CSV export. */
  private async buildPathwayAnalytics(
    window: ReportWindow,
    run: SnapshotRunner,
  ): Promise<AdminPathwayAnalyticsResponse> {
    const now = new Date();
    const { start: windowStart, end: windowEnd } = window;
    // Applications started in the window by customers who are not deleted.
    const windowApplications = `SELECT a.id, a.pathway_key, a.status
      FROM pathway_applications a JOIN users u ON u.id = a.user_id
      WHERE ${CUSTOMER} AND a.created_at >= $1 AND a.created_at < $2`;

    const { applications, checklist, partners, eligibility, totals, plans } =
      await run(async (manager) => {
        const applicationRows = await manager.query<PathwayApplicationRow[]>(
          `WITH apps AS (${windowApplications})
           SELECT p.key, p.title AS label,
             COUNT(a.id) FILTER (WHERE a.status = 'draft')::int AS draft,
             COUNT(a.id) FILTER (WHERE a.status = 'submitted')::int AS submitted
           FROM pathways p LEFT JOIN apps a ON a.pathway_key = p.key
           GROUP BY p.key, p.title, p.sort_order
           ORDER BY p.sort_order`,
          [windowStart, windowEnd],
        );
        const [checklistRow] = await manager.query<ChecklistRow[]>(
          `WITH apps AS (${windowApplications}), progress AS (
             SELECT a.id, COUNT(i.id) AS items,
               COUNT(i.id) FILTER (WHERE i.is_complete) AS done
             FROM apps a
             LEFT JOIN pathway_checklist_items i ON i.application_id = a.id
             GROUP BY a.id
           )
           SELECT COUNT(*)::int AS applications,
             COUNT(*) FILTER (WHERE items > 0 AND done = items)::int AS fully_complete,
             (AVG(CASE WHEN items > 0 THEN done::float8 / items ELSE 0 END) * 100)::float8
               AS average_progress
           FROM progress`,
          [windowStart, windowEnd],
        );
        // Every partner is listed so unpicked partners show as zero.
        const partnerRows = await manager.query<PartnerRow[]>(
          `WITH apps AS (${windowApplications}), picks AS (
             SELECT ap.partner_id FROM apps a
             JOIN pathway_application_partners ap ON ap.application_id = a.id
           )
           SELECT pr.id::text AS key, pr.name AS label, pr.partner_type,
             pr.pathway_key, COUNT(pk.partner_id)::int AS count
           FROM partners pr LEFT JOIN picks pk ON pk.partner_id = pr.id
           GROUP BY pr.id, pr.name, pr.partner_type, pr.pathway_key, pr.sort_order
           HAVING pr.is_active OR COUNT(pk.partner_id) > 0
           ORDER BY count DESC, pr.pathway_key, pr.sort_order`,
          [windowStart, windowEnd],
        );
        const eligibilityRows = await manager.query<EligibilityRow[]>(
          `WITH sums AS (
             SELECT u.id, SUM(g.saved_amount) AS saved
             FROM users u
             JOIN user_goals g ON g.user_id = u.id
               AND g.is_pathway_eligible AND g.is_active
             WHERE ${CUSTOMER}
             GROUP BY u.id
           )
           SELECT p.key, p.title AS label,
             p.minimum_amount::float8 AS minimum_amount,
             COUNT(s.id)::int AS eligible_customers
           FROM pathways p LEFT JOIN sums s ON s.saved >= p.minimum_amount
           GROUP BY p.key, p.title, p.minimum_amount, p.sort_order
           ORDER BY p.sort_order`,
        );
        const [totalsRow] = await manager.query<PremiumTotalsRow[]>(
          `SELECT
             (SELECT COUNT(*) FROM users u WHERE ${CUSTOMER})::int AS total_customers,
             COUNT(DISTINCT s.user_id)::int AS paid_customers,
             -- Same rule as the commercial free to paid figure, so they agree.
             (SELECT COUNT(*) FROM subscription_history h
               JOIN user_subscriptions s ON s.id = h.subscription_id
               JOIN users u ON u.id = s.user_id
               WHERE ${CUSTOMER} AND ${FREE_TO_PAID_MOVE}
                 AND h.effective_at >= $1 AND h.effective_at < $2)::int AS new_paid,
             (SELECT COUNT(DISTINCT u.id) FROM users u
               JOIN user_goals g ON g.user_id = u.id
                 AND g.is_pathway_eligible AND g.is_active
               WHERE ${CUSTOMER})::int AS with_eligible_goals,
             EXISTS (SELECT 1 FROM users u
               WHERE ${CUSTOMER} AND u.current_level_source = 'mock') AS demo_levels
           FROM user_subscriptions s JOIN users u ON u.id = s.user_id
           WHERE ${CUSTOMER} AND ${PAID_SUBSCRIPTION}`,
          [windowStart, windowEnd],
        );
        // Paid plans always appear; a free plan only if someone pays for it.
        const planRows = await manager.query<PlanRow[]>(
          `SELECT pl.key, pl.name AS label,
             pl.price_monthly::float8 AS price_monthly,
             COUNT(s.id)::int AS count
           FROM subscription_plans pl
           LEFT JOIN (
             user_subscriptions s JOIN users u ON u.id = s.user_id AND ${CUSTOMER}
           ) ON s.plan_key = pl.key AND ${PAID_SUBSCRIPTION}
           GROUP BY pl.key, pl.name, pl.price_monthly, pl.sort_order
           HAVING pl.price_monthly > 0 OR COUNT(s.id) > 0
           ORDER BY pl.sort_order`,
        );
        return {
          applications: applicationRows,
          checklist: checklistRow,
          partners: partnerRows,
          eligibility: eligibilityRows,
          totals: totalsRow,
          plans: planRows,
        };
      });

    const draft = applications.reduce((sum, row) => sum + row.draft, 0);
    const submitted = applications.reduce((sum, row) => sum + row.submitted, 0);
    const partnerTypes = new Map<string, number>();
    for (const row of partners) {
      partnerTypes.set(
        row.partner_type,
        (partnerTypes.get(row.partner_type) ?? 0) + row.count,
      );
    }

    const response: AdminPathwayAnalyticsResponse = {
      windowDays: window.days,
      generatedAt: now.toISOString(),
      applications: {
        total: draft + submitted,
        byStatus: [
          { key: 'draft', label: 'Draft', count: draft },
          { key: 'submitted', label: 'Submitted', count: submitted },
        ],
        byPathway: applications,
      },
      checklist: {
        applications: checklist.applications,
        fullyComplete: checklist.fully_complete,
        averageProgress: Number((checklist.average_progress ?? 0).toFixed(1)),
      },
      partners: {
        selections: partners.reduce((sum, row) => sum + row.count, 0),
        byPartner: partners.map((row) => ({
          key: row.key,
          label: row.label,
          count: row.count,
          partnerType: row.partner_type,
          pathwayKey: row.pathway_key,
        })),
        byType: [...partnerTypes]
          .map(([label, count]) => ({ key: label, label, count }))
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      },
      eligibility: {
        customersWithEligibleGoals: totals.with_eligible_goals,
        byPathway: eligibility.map((row) => ({
          key: row.key,
          label: row.label,
          minimumAmount: row.minimum_amount,
          eligibleCustomers: row.eligible_customers,
        })),
      },
      premium: {
        totalCustomers: totals.total_customers,
        paidCustomers: totals.paid_customers,
        paidRate: this.percent(totals.paid_customers, totals.total_customers),
        newPaidInWindow: totals.new_paid,
        byPlan: plans.map((row) => ({
          key: row.key,
          label: row.label,
          count: row.count,
          priceMonthly: row.price_monthly,
        })),
      },
      demoLevelsPresent: totals.demo_levels,
    };

    return response;
  }

  async commercialAnalytics(
    principal: AuthPrincipal,
    query: AdminAnalyticsQuery,
    context: RequestContext,
  ): Promise<AdminCommercialAnalyticsResponse> {
    const response = await this.buildCommercialAnalytics(
      resolveWindow(query),
      this.snapshot,
    );
    await this.record(principal, context, {
      report: 'commercial_analytics',
      ...rangeMetadata(query),
    });
    return response;
  }

  /** Subscription conversion, cancellation and payments. Shared by the page and its CSV export. */
  private async buildCommercialAnalytics(
    window: ReportWindow,
    run: SnapshotRunner,
  ): Promise<AdminCommercialAnalyticsResponse> {
    const now = new Date();
    const { start: windowStart, end: windowEnd } = window;
    const subscriber = `user_subscriptions s JOIN users u ON u.id = s.user_id`;

    const { plans, conversions, intents, cancellations, payments } = await run(
      async (manager) => {
        const planRows = await manager.query<PlanLookupRow[]>(
          `SELECT key, name AS label, price_monthly::float8 AS price_monthly
           FROM subscription_plans ORDER BY sort_order`,
        );
        const conversionRows = await manager.query<ConversionRow[]>(
          `SELECT h.action, h.new_plan_key AS plan_key, COUNT(*)::int AS count
           FROM subscription_history h
           JOIN ${subscriber} ON s.id = h.subscription_id
           WHERE ${CUSTOMER} AND ${FREE_TO_PAID_MOVE}
             AND h.effective_at >= $1 AND h.effective_at < $2
           GROUP BY h.action, h.new_plan_key`,
          [windowStart, windowEnd],
        );
        const intentRows = await manager.query<IntentRow[]>(
          `SELECT i.plan_key, COUNT(*)::int AS intents,
             COUNT(s.id)::int AS converted,
             COUNT(s.id) FILTER (WHERE s.plan_key = i.plan_key)::int AS matched
           FROM upgrade_intents i
           JOIN users u ON u.id = i.user_id
           LEFT JOIN user_subscriptions s ON s.user_id = i.user_id
             AND ${PAID_SUBSCRIPTION}
           WHERE ${CUSTOMER} AND i.created_at >= $1 AND i.created_at < $2
           GROUP BY i.plan_key`,
          [windowStart, windowEnd],
        );
        const cancellationRows = await manager.query<CancellationRow[]>(
          `SELECT plan_key, SUM(cancelled)::int AS cancelled,
             SUM(scheduled)::int AS scheduled,
             SUM(amount)::float8 AS cancelled_amount
           FROM (
             SELECT s.plan_key, 1 AS cancelled, 0 AS scheduled,
               ${MONTHLY_AMOUNT} AS amount
             FROM ${subscriber}
             WHERE ${CUSTOMER} AND s.status = 'cancelled'
               AND s.cancelled_at >= $1 AND s.cancelled_at < $2
             UNION ALL
             SELECT h.previous_plan_key, 0, 1, 0
             FROM subscription_history h
             JOIN ${subscriber} ON s.id = h.subscription_id
             WHERE ${CUSTOMER} AND h.action = 'cancellation_scheduled'
               AND h.recorded_at >= $1 AND h.recorded_at < $2
           ) events
           GROUP BY plan_key`,
          [windowStart, windowEnd],
        );
        const [paymentRow] = await manager.query<PaymentRow[]>(
          `SELECT
             COALESCE(SUM(b.failed), 0)::int AS failed_records,
             COALESCE(SUM(b.failed_amount), 0)::float8 AS failed_amount,
             COALESCE(SUM(b.paid), 0)::int AS paid_records,
             COALESCE(SUM(b.paid_amount), 0)::float8 AS paid_amount,
             (SELECT COUNT(*) FROM ${subscriber}
               WHERE ${CUSTOMER} AND s.status = 'past_due')::int AS past_due,
             (SELECT COALESCE(SUM(${MONTHLY_AMOUNT}), 0) FROM ${subscriber}
               WHERE ${CUSTOMER} AND s.status = 'past_due')::float8 AS past_due_amount,
             (SELECT COALESCE(SUM(s.failed_payments), 0) FROM ${subscriber}
               WHERE ${CUSTOMER} AND s.status <> 'cancelled')::int AS open_failed_payments
           FROM (
             SELECT (r.status = 'failed')::int AS failed,
               CASE WHEN r.status = 'failed' THEN r.amount_cents / 100.0 ELSE 0 END AS failed_amount,
               (r.status = 'paid')::int AS paid,
               CASE WHEN r.status = 'paid' THEN r.amount_cents / 100.0 ELSE 0 END AS paid_amount
             FROM subscription_billing_records r
             JOIN ${subscriber} ON s.id = r.subscription_id
             WHERE ${CUSTOMER} AND r.occurred_at >= $1 AND r.occurred_at < $2
           ) b`,
          [windowStart, windowEnd],
        );
        return {
          plans: planRows,
          conversions: conversionRows,
          intents: intentRows,
          cancellations: cancellationRows,
          payments: paymentRow,
        };
      },
    );

    // Paid plans always appear; any other plan only when it has activity.
    const planRows = (keys: string[]) =>
      plans.filter((plan) => plan.price_monthly > 0 || keys.includes(plan.key));
    const planLabel = (key: string) =>
      plans.find((plan) => plan.key === key)?.label ?? key;
    const sumBy = <T>(rows: T[], pick: (row: T) => number) =>
      rows.reduce((sum, row) => sum + pick(row), 0);

    const freeToPaid = sumBy(conversions, (row) => row.count);
    const intentTotal = sumBy(intents, (row) => row.intents);
    const converted = sumBy(intents, (row) => row.converted);

    const response: AdminCommercialAnalyticsResponse = {
      windowDays: window.days,
      generatedAt: now.toISOString(),
      conversions: {
        freeToPaid,
        byPlan: planRows(conversions.map((row) => row.plan_key)).map(
          (plan) => ({
            key: plan.key,
            label: plan.label,
            count: sumBy(
              conversions.filter((row) => row.plan_key === plan.key),
              (row) => row.count,
            ),
          }),
        ),
        byAction: CONVERSION_ACTIONS.map((action) => ({
          ...action,
          count: sumBy(
            conversions.filter((row) => row.action === action.key),
            (row) => row.count,
          ),
        })),
      },
      intents: {
        intents: intentTotal,
        convertedToPaid: converted,
        matchedPlan: sumBy(intents, (row) => row.matched),
        conversionRate: this.percent(converted, intentTotal),
        byPlan: planRows(intents.map((row) => row.plan_key)).map((plan) => {
          const row = intents.find((item) => item.plan_key === plan.key);
          return {
            key: plan.key,
            label: planLabel(plan.key),
            intents: row?.intents ?? 0,
            converted: row?.converted ?? 0,
          };
        }),
      },
      cancellations: {
        cancelled: sumBy(cancellations, (row) => row.cancelled),
        scheduled: sumBy(cancellations, (row) => row.scheduled),
        cancelledMonthlyAmount: this.round(
          sumBy(cancellations, (row) => row.cancelled_amount),
        ),
        byPlan: planRows(cancellations.map((row) => row.plan_key)).map(
          (plan) => {
            const row = cancellations.find(
              (item) => item.plan_key === plan.key,
            );
            return {
              key: plan.key,
              label: plan.label,
              cancelled: row?.cancelled ?? 0,
              scheduled: row?.scheduled ?? 0,
            };
          },
        ),
      },
      payments: {
        failedRecords: payments.failed_records,
        failedAmount: this.round(payments.failed_amount),
        paidRecords: payments.paid_records,
        paidAmount: this.round(payments.paid_amount),
        pastDueSubscriptions: payments.past_due,
        pastDueMonthlyAmount: this.round(payments.past_due_amount),
        openFailedPayments: payments.open_failed_payments,
      },
    };

    return response;
  }

  async retention(
    principal: AuthPrincipal,
    query: AdminAnalyticsQuery,
    context: RequestContext,
  ): Promise<AdminRetentionResponse> {
    const response = await this.buildRetention(
      resolveWindow(query),
      this.snapshot,
    );
    await this.record(principal, context, {
      report: 'retention',
      ...rangeMetadata(query),
    });
    return response;
  }

  /** Weekly cohort retention and recent activity. Shared by the page and its CSV export. */
  private async buildRetention(
    window: ReportWindow,
    run: SnapshotRunner,
  ): Promise<AdminRetentionResponse> {
    const now = new Date();
    const { start: windowStart, end: windowEnd } = window;
    const today = now.toISOString().slice(0, 10);

    const { cells, share } = await run(async (manager) => {
      // A week counts once it has fully ended (its last day is before
      // today) for every member of the cohort.
      const cellRows = await manager.query<RetentionCellRow[]>(
        `WITH cohort AS (
             SELECT u.id, (u.created_at AT TIME ZONE 'UTC')::date AS signup_on,
               date_trunc('week', u.created_at AT TIME ZONE 'UTC')::date AS cohort_week
             FROM users u WHERE ${CUSTOMER} AND u.created_at >= $1
               AND u.created_at < $4
           ), activity AS (
             SELECT a.user_id, a.active_on
             FROM (${CUSTOMER_ACTIVITY_DAYS}) a
             JOIN cohort c ON c.id = a.user_id
           ), member_weeks AS (
             SELECT c.cohort_week, w.week,
               c.signup_on + 7 * w.week + 6 < $2::date AS elapsed,
               EXISTS (
                 SELECT 1 FROM activity a
                 WHERE a.user_id = c.id
                   AND a.active_on BETWEEN c.signup_on + 7 * w.week
                     AND c.signup_on + 7 * w.week + 6
               ) AS active
             FROM cohort c CROSS JOIN unnest($3::int[]) AS w(week)
           )
           SELECT to_char(cohort_week, 'YYYY-MM-DD') AS week_start, week,
             COUNT(*)::int AS size, bool_and(elapsed) AS available,
             COUNT(*) FILTER (WHERE active)::int AS active
           FROM member_weeks
           GROUP BY cohort_week, week
           ORDER BY cohort_week, week`,
        [windowStart, today, [...retentionWeekValues], windowEnd],
      );
      // Last 7 days is today and the six days before it; 30 days likewise.
      const [shareRow] = await manager.query<ActiveShareRow[]>(
        `WITH activity AS (${CUSTOMER_ACTIVITY_DAYS})
           SELECT COUNT(*)::int AS total_customers,
             COUNT(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM activity a WHERE a.user_id = u.id
                 AND a.active_on BETWEEN $1::date - 6 AND $1::date
             ))::int AS active_7,
             COUNT(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM activity a WHERE a.user_id = u.id
                 AND a.active_on BETWEEN $1::date - 29 AND $1::date
             ))::int AS active_30
           FROM users u WHERE ${CUSTOMER}`,
        [today],
      );
      return { cells: cellRows, share: shareRow };
    });

    const cohorts = new Map<
      string,
      AdminRetentionResponse['cohorts'][number]
    >();
    for (const row of cells) {
      const cohort = cohorts.get(row.week_start) ?? {
        weekStart: row.week_start,
        size: row.size,
        cells: [],
      };
      cohort.cells.push({
        week: row.week,
        available: row.available,
        active: row.available ? row.active : null,
        rate: row.available ? this.percent(row.active, row.size) : null,
      });
      cohorts.set(row.week_start, cohort);
    }

    const response: AdminRetentionResponse = {
      windowDays: window.days,
      generatedAt: now.toISOString(),
      overall: {
        totalCustomers: share.total_customers,
        activeLast7Days: share.active_7,
        activeLast7DaysRate: this.percent(
          share.active_7,
          share.total_customers,
        ),
        activeLast30Days: share.active_30,
        activeLast30DaysRate: this.percent(
          share.active_30,
          share.total_customers,
        ),
      },
      cohorts: [...cohorts.values()],
    };

    return response;
  }

  /** Rounds money and fractional check-ins to two decimals. */
  private round(value: number) {
    return Math.round(value * 100) / 100;
  }

  private percent(part: number, whole: number) {
    return whole === 0 ? 0 : Number(((part / whole) * 100).toFixed(1));
  }

  private record(
    principal: AuthPrincipal,
    context: RequestContext,
    metadata: Record<string, unknown>,
  ) {
    return this.audit.record({
      action: AuditAction.ADMIN_ANALYTICS_VIEWED,
      actorUserId: principal.userId,
      actorType: AuditActorType.ADMIN,
      entityType: 'analytics',
      entityId: null,
      ipAddress: context.ipAddress,
      metadata,
    });
  }
}
