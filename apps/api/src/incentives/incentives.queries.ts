/**
 * Builds recipient lists, benefit histories, and analytics from the same event balances.
 * Filters select first-review cohorts in UTC; consistent database snapshots keep
 * totals and details aligned while other staff record activity.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  incentiveBenefitSchema,
  incentiveAnalyticsSchema,
  type IncentiveQuery,
  type IncentiveDetail,
} from '@purposemint/contracts';
import { IncentiveEvent } from '../entities/incentive-event.entity';
import { UserGoal } from '../entities/user-goal.entity';

interface BenefitReportRow {
  id: string;
  program_id: string;
  program_name: string;
  user_id: string;
  user_name: string;
  email: string;
  eligible: boolean;
  eligibility_reason: string;
  rule_snapshot: string;
  program_version: number;
  amount_cents: number;
  reviewed_at: Date | string;
  earned_at: Date | string | null;
  received_at: Date | string | null;
  earned: number;
  distributed: number;
  allocated: number;
  withdrawn: number;
  withdrawal_recorded: boolean;
  goal_titles: string[];
  status: string;
}

/** Read models share one balance calculation across lists, details and analytics. */
@Injectable()
export class IncentivesQueries {
  constructor(private readonly db: DataSource) {}
  private report(query: IncentiveQuery, benefitId?: string) {
    const params: unknown[] = [];
    const conditions: string[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    if (query.programId)
      conditions.push(`b.program_id = ${bind(query.programId)}`);
    if (query.userId) conditions.push(`b.user_id = ${bind(query.userId)}`);
    if (benefitId) conditions.push(`b.id = ${bind(benefitId)}`);
    if (query.search) {
      const p = bind(`%${query.search.replace(/[\\%_]/g, '\\$&')}%`);
      conditions.push(
        `(u.email ILIKE ${p} OR concat_ws(' ',u.first_name,u.last_name) ILIKE ${p})`,
      );
    }
    if (query.from)
      conditions.push(
        `b.reviewed_at >= (${bind(query.from)}::timestamp AT TIME ZONE 'UTC')`,
      );
    if (query.to)
      conditions.push(
        `b.reviewed_at < ((${bind(query.to)}::date + interval '1 day') AT TIME ZONE 'UTC')`,
      );
    const reportFilters: string[] = [];
    if (query.status) reportFilters.push(`status = ${bind(query.status)}`);
    const metricFilters = {
      eligible: 'eligible',
      earned: 'earned > 0',
      distributed: 'distributed > 0',
      allocated: 'allocated > 0',
      withdrawn: 'withdrawn > 0',
      remaining: 'distributed > withdrawn',
    };
    if (query.metric) reportFilters.push(metricFilters[query.metric]);
    const status = reportFilters.length
      ? `WHERE ${reportFilters.join(' AND ')}`
      : '';
    return {
      params,
      sql: `WITH totals AS (
      SELECT benefit_id, sum(earned_delta)::float8 earned, sum(distributed_delta)::float8 distributed,
        sum(allocated_delta)::float8 allocated, sum(withdrawn_delta)::float8 withdrawn,
        min(occurred_at) FILTER (WHERE kind='award') earned_at,
        min(occurred_at) FILTER (WHERE kind='distribution') received_at,
        bool_or(kind='withdrawal') withdrawal_recorded,
        array_agg(DISTINCT goal_title) FILTER (WHERE goal_title IS NOT NULL) goal_titles
      FROM incentive_events GROUP BY benefit_id
    ), balances AS (
      SELECT b.*, p.name program_name, concat_ws(' ',u.first_name,u.last_name) user_name, u.email,
        coalesce(t.earned,0) earned, coalesce(t.distributed,0) distributed,
        coalesce(t.allocated,0) allocated, coalesce(t.withdrawn,0) withdrawn,
        t.earned_at, t.received_at, coalesce(t.withdrawal_recorded,false) withdrawal_recorded,
        coalesce(t.goal_titles, ARRAY[]::varchar[]) goal_titles
      FROM user_incentive_benefits b JOIN users u ON u.id=b.user_id JOIN incentive_programs p ON p.id=b.program_id
      LEFT JOIN totals t ON t.benefit_id=b.id ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ), statuses AS (
      SELECT *, CASE WHEN withdrawn > 0 AND withdrawn=distributed THEN 'withdrawn'
        WHEN withdrawn > 0 THEN 'partially_withdrawn' WHEN allocated > 0 THEN 'applied'
        WHEN distributed > 0 THEN 'distributed' WHEN earned > 0 THEN 'earned'
        WHEN eligible THEN 'eligible' ELSE 'not_eligible' END status FROM balances
    ), filtered AS (SELECT * FROM statuses ${status})`,
    };
  }

  private mapBenefit(row: BenefitReportRow) {
    return incentiveBenefitSchema.parse({
      id: row.id,
      programId: row.program_id,
      programName: row.program_name,
      userId: row.user_id,
      userName: row.user_name,
      email: row.email,
      eligible: row.eligible,
      eligibilityReason: row.eligibility_reason,
      ruleSnapshot: row.rule_snapshot,
      programVersion: row.program_version,
      amountCents: row.amount_cents,
      reviewedAt: new Date(row.reviewed_at).toISOString(),
      earnedAt: row.earned_at ? new Date(row.earned_at).toISOString() : null,
      receivedAt: row.received_at
        ? new Date(row.received_at).toISOString()
        : null,
      status: row.status,
      earnedCents: row.earned,
      distributedCents: row.distributed,
      allocatedCents: row.allocated,
      withdrawnCents: row.withdrawn,
      remainingCents: row.distributed - row.withdrawn,
      unallocatedCents: row.distributed - row.withdrawn - row.allocated,
      hasReceived: !!row.received_at,
      withdrawalStatus: row.withdrawal_recorded ? 'recorded' : 'not_confirmed',
      goalTitles: row.goal_titles,
    });
  }

  async list(query: IncentiveQuery) {
    const { sql, params } = this.report(query);
    // One SQL snapshot keeps the count and page consistent during concurrent writes.
    const [result] = await this.db.query<
      { total: number; items: BenefitReportRow[] }[]
    >(
      `${sql} SELECT
      (SELECT count(*)::int FROM filtered) total,
      coalesce((SELECT json_agg(row_to_json(page)) FROM
        (SELECT * FROM filtered ORDER BY reviewed_at DESC,id LIMIT $${params.length + 1} OFFSET $${params.length + 2}) page),'[]') items`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return {
      items: result.items.map((row) => this.mapBenefit(row)),
      total: result.total,
      page: query.page,
      totalPages: Math.max(1, Math.ceil(result.total / query.pageSize)),
    };
  }

  async detail(id: string) {
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const { sql, params } = this.report({ page: 1, pageSize: 20 }, id);
      const [row] = await manager.query<BenefitReportRow[]>(
        `${sql} SELECT * FROM filtered`,
        params,
      );
      if (!row) throw new NotFoundException('Benefit not found.');
      const events = await manager.find(IncentiveEvent, {
        where: { benefitId: id },
        order: { recordedAt: 'ASC', id: 'ASC' },
      });
      const goals = await manager.find(UserGoal, {
        where: { userId: row.user_id },
        select: ['id', 'title'],
        order: { createdAt: 'DESC' },
      });
      const allocations = await manager.query<IncentiveDetail['allocations']>(
        `SELECT goal_id "goalId", category, sum(allocated_delta)::int "amountCents" FROM incentive_events WHERE benefit_id=$1 AND goal_id IS NOT NULL GROUP BY goal_id,category HAVING sum(allocated_delta)>0`,
        [id],
      );
      return {
        benefit: this.mapBenefit(row),
        goals,
        allocations,
        events: events.map((e) => ({
          id: e.id,
          kind: e.kind,
          amountCents: e.amountCents,
          reason: e.reason,
          reference: e.reference,
          occurredAt: e.occurredAt.toISOString(),
          recordedAt: e.recordedAt.toISOString(),
          actorUserId: e.actorUserId,
          goalId: e.goalId,
          goalTitle: e.goalTitle,
          category: e.category,
          reversesEventId: e.reversesEventId,
          source: e.source,
        })),
      };
    });
  }

  async analytics(query: IncentiveQuery) {
    const { sql, params } = this.report(query);
    // Cohort: first eligibility review date in UTC. All subsequent lifecycle events are included.
    const [row] = await this.db.query<unknown[]>(
      `${sql} SELECT
      count(DISTINCT user_id) FILTER (WHERE eligible)::int "eligibleUsers",
      count(*) FILTER (WHERE earned>0)::int "earnedCount",
      coalesce(sum(earned),0)::float8 "earnedCents", coalesce(sum(distributed),0)::float8 "distributedCents",
      coalesce(sum(allocated),0)::float8 "allocatedCents", coalesce(sum(withdrawn),0)::float8 "withdrawnCents",
      coalesce(sum(distributed-withdrawn),0)::float8 "remainingCents",
      coalesce((SELECT json_agg(c) FROM (SELECT category, sum(allocated_delta)::float8 "amountCents"
        FROM incentive_events WHERE benefit_id IN (SELECT id FROM filtered) AND category IS NOT NULL GROUP BY category ORDER BY category) c),'[]') categories,
      coalesce((SELECT json_agg(a) FROM (SELECT to_char(occurred_at AT TIME ZONE 'UTC','YYYY-MM-DD') date,
        sum(earned_delta)::float8 "earnedCents", sum(distributed_delta)::float8 "distributedCents"
        FROM incentive_events WHERE benefit_id IN (SELECT id FROM filtered) AND (earned_delta<>0 OR distributed_delta<>0)
        GROUP BY 1 ORDER BY 1) a),'[]') activity
      FROM filtered`,
      params,
    );
    return incentiveAnalyticsSchema.parse(row);
  }
}
