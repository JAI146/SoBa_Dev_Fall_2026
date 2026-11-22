import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminRole,
  AuditAction,
  UserStatus,
  UserType,
  type AssistantBudget,
} from '@purposemint/contracts';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import type { Env } from '../config/env.validation';

import { assistantRetentionCutoff } from './assistant-retention.service';
const monthStart =
  "date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'";
const monthEnd =
  "(date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC'";
const currentMonth =
  'created_at >= ' + monthStart + ' AND created_at < ' + monthEnd;
const activeStaff =
  "u.user_type = 'admin' AND u.status = 'active' AND u.deleted_at IS NULL";
const builtIn =
  "(u.admin_role IS NOT DISTINCT FROM 'super_admin' AND u.custom_role_id IS NULL)";
const name =
  "COALESCE(NULLIF(u.display_name, ''), NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email)";
const role =
  "COALESCE(r.name, initcap(replace(u.admin_role::text, '_', ' ')), 'Administrator')";
const reportedUsage = "(settled OR created_at < now() - interval '2 minutes')";
const nanoPerDollar = 1_000_000_000;
const nanoPerCent = 10_000_000;
type Setting = {
  limitCents: number;
  mode: AssistantBudget['mode'];
  revision: number;
  month: string;
};
type Staff = {
  id: string;
  name: string;
  role: string;
  share: number;
  builtIn: boolean;
  lastActivity: Date | null;
};
export type AssistantModelUsage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number;
    cache_write_tokens?: number;
    cache_write_tokens_details?: { ttl_12h_tokens?: number };
  };
};

export function requireAssistantAdmin(principal: AuthPrincipal) {
  if (
    principal.userType !== UserType.ADMIN ||
    principal.status !== UserStatus.ACTIVE
  )
    throw new ForbiddenException(
      'Assistant access is available to active administrators.',
    );
}

export function requireAssistantSupervisor(principal: AuthPrincipal) {
  requireAssistantAdmin(principal);
  if (principal.adminRole !== AdminRole.SUPER_ADMIN || principal.customRoleId)
    throw new ForbiddenException('Only Super Admins can manage the assistant.');
}

function modelRates(model: string): [number, number, number] {
  switch (model.replace(/-\d{4}-\d{2}-\d{2}$/, '')) {
    // Nano-USD per token. Standard input, cached input, output.
    case 'gpt-6-luna':
      return [100, 10, 500];
    case 'gpt-4.1-mini':
      return [400, 100, 1600];
    default:
      throw new ServiceUnavailableException(
        'Assistant pricing is not configured for the selected model.',
      );
  }
}

@Injectable()
export class AssistantControlService {
  constructor(
    private readonly db: DataSource,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private async settings(
    manager = this.db.manager,
    lock = false,
  ): Promise<Setting> {
    const [row]: Setting[] =
      await manager.query(`SELECT limit_cents AS "limitCents", mode,
      revision, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM') AS month
      FROM assistant_settings WHERE singleton ${lock ? 'FOR UPDATE' : ''}`);
    return row;
  }

  private async staff(
    manager = this.db.manager,
    lock = false,
  ): Promise<Staff[]> {
    return manager.query(`SELECT u.id, ${name} AS name, ${role} AS role,
      ${builtIn} AS "builtIn", COALESCE(CASE WHEN a.status IN ('approved', 'builtin') THEN a.share END, CASE WHEN s.mode = 'balanced' THEN 0 ELSE 10000 END) AS share,
      (SELECT max(t.created_at) FROM assistant_turns t WHERE t.user_id = u.id AND t.created_at >= ${assistantRetentionCutoff}) AS "lastActivity"
      FROM users u CROSS JOIN assistant_settings s
      LEFT JOIN assistant_access a ON a.user_id = u.id
      LEFT JOIN custom_roles r ON r.id = u.custom_role_id
      WHERE ${activeStaff} AND (${builtIn} OR a.status = 'approved') ORDER BY name, u.id ${lock ? 'FOR SHARE OF u' : ''}`);
  }

  private async eligibility(
    userId: string,
    mode: Setting['mode'],
    manager: EntityManager,
  ) {
    const [row]: {
      builtIn: boolean;
      status: string | null;
      share: number | null;
    }[] = await manager.query(
      `SELECT ${builtIn} AS "builtIn", a.status, a.share
       FROM users u LEFT JOIN assistant_access a ON a.user_id = u.id WHERE u.id = $1 AND ${activeStaff}`,
      [userId],
    );
    if (!row)
      throw new ForbiddenException(
        'Assistant access is available to active administrators.',
      );
    const approved = row.builtIn || row?.status === 'approved';
    const share = approved
      ? ((row?.status === 'approved' || row?.status === 'builtin'
          ? row.share
          : null) ?? (mode === 'balanced' ? 0 : 10000))
      : 0;
    return {
      approved,
      share,
      access: approved
        ? share
          ? 'available'
          : 'paused'
        : row?.status === 'builtin'
          ? 'none'
          : (row?.status ?? 'none'),
    };
  }

  private async totals(
    userId: string,
    manager: EntityManager,
    includeReservations: boolean,
  ) {
    const [row]: { overall: string; personal: string }[] = await manager.query(
      `SELECT COALESCE(sum(nano_usd), 0) AS overall,
         COALESCE(sum(nano_usd) FILTER (WHERE user_id = $1), 0) AS personal
       FROM assistant_usage WHERE ${currentMonth} ${includeReservations ? '' : 'AND ' + reportedUsage}`,
      [userId],
    );
    return { overall: Number(row.overall), personal: Number(row.personal) };
  }

  async status(userId: string) {
    const settings = await this.settings();
    const access = await this.eligibility(
      userId,
      settings.mode,
      this.db.manager,
    );
    const { personal } = await this.totals(userId, this.db.manager, false);
    return {
      access:
        access.access === 'available' && !settings.limitCents
          ? 'paused'
          : access.access,
      usedDollars: personal / nanoPerDollar,
      limitDollars: (settings.limitCents * access.share) / 1_000_000,
      month: settings.month,
    };
  }

  async requestAccess(userId: string, note: string) {
    await this.db.transaction(async (manager) => {
      const settings = await this.settings(manager, true);
      const { approved, access } = await this.eligibility(
        userId,
        settings.mode,
        manager,
      );
      if (approved || access === 'pending')
        throw new ConflictException(
          'You already have access or a pending request.',
        );
      await manager.query(
        `INSERT INTO assistant_access (user_id, status, request_note) VALUES ($1, 'pending', $2)
        ON CONFLICT (user_id) DO UPDATE SET status = 'pending', request_note = EXCLUDED.request_note,
          requested_at = now(), decided_at = NULL, decided_by = NULL`,
        [userId, note],
      );
    });
    return this.status(userId);
  }

  async pendingCount() {
    const [row]: { count: number }[] = await this.db.query(
      `SELECT count(*)::int AS count FROM assistant_access a JOIN users u ON u.id = a.user_id
        WHERE a.status = 'pending' AND ${activeStaff} AND NOT ${builtIn}`,
    );
    return row;
  }

  async decision(
    userId: string,
    actor: string,
    decision: 'approve' | 'deny' | 'revoke',
  ) {
    await this.db.transaction(async (manager) => {
      const settings = await this.settings(manager, true);
      const next = { approve: 'approved', deny: 'denied', revoke: 'revoked' }[
        decision
      ];
      const rows: { id: string }[] = await manager.query(
        `WITH changed AS (
        UPDATE assistant_access a SET status = $3, decided_by = $2, decided_at = now(), share = $5
        FROM users u WHERE a.user_id = $1 AND u.id = a.user_id AND ${activeStaff}
          AND NOT ${builtIn} AND a.status = $4 RETURNING a.user_id AS id
      ) SELECT id FROM changed`,
        [
          userId,
          actor,
          next,
          decision === 'revoke' ? 'approved' : 'pending',
          settings.mode === 'balanced' ? 0 : 10000,
        ],
      );
      if (!rows.length)
        throw new ConflictException(
          'This access entry has changed. Reload and try again.',
        );
      if (decision !== 'deny')
        await manager.query(
          'UPDATE assistant_settings SET revision = revision + 1 WHERE singleton',
        );
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_ASSISTANT_ACCESS_CHANGED,
        actorUserId: actor,
        entityType: 'assistant_access',
        entityId: userId,
        metadata: { decision },
      });
    });
    return this.pendingCount();
  }

  async saveBudget(budget: AssistantBudget, actor: string) {
    await this.db.transaction(async (manager) => {
      const settings = await this.settings(manager, true);
      const staff = await this.staff(manager, true);
      if (
        settings.revision !== budget.revision ||
        staff.length !== Object.keys(budget.shares).length ||
        staff.some(({ id }) => !Object.hasOwn(budget.shares, id))
      )
        throw new ConflictException(
          'The budget or access list changed. Reload before saving.',
        );
      if (
        budget.mode === 'balanced' &&
        Object.values(budget.shares).reduce((sum, share) => sum + share, 0) >
          10000
      )
        throw new BadRequestException(
          'Balanced shares must add up to 100% or less.',
        );
      await manager.query(
        `UPDATE assistant_settings SET limit_cents = $1, mode = $2,
        revision = revision + 1 WHERE singleton`,
        [budget.limitCents, budget.mode],
      );
      if (budget.mode === 'balanced') {
        // Accounts outside the current allocation return with zero share if reactivated later.
        await manager.query(
          'UPDATE assistant_access SET share = 0 WHERE NOT (user_id = ANY($1::uuid[])) AND share <> 0',
          [staff.map(({ id }) => id)],
        );
      }
      await manager.query(
        `INSERT INTO assistant_access (user_id, status, request_note, share)
        SELECT u.id, CASE WHEN ${builtIn} THEN 'builtin' ELSE 'approved' END, '', value::int FROM jsonb_each_text($1::jsonb) AS shares(key, value) JOIN users u ON u.id = key::uuid
        ON CONFLICT (user_id) DO UPDATE SET share = EXCLUDED.share, status = EXCLUDED.status`,
        [JSON.stringify(budget.shares)],
      );
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_ASSISTANT_BUDGET_CHANGED,
        actorUserId: actor,
        entityType: 'assistant_settings',
        metadata: {
          limitCents: budget.limitCents,
          mode: budget.mode,
          shares: budget.shares,
        },
      });
    });
  }

  async overview() {
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const settings = await this.settings(manager);
      const staff = await this.staff(manager);
      const requests: { requestedAt: Date }[] =
        await manager.query(`SELECT u.id, ${name} AS name,
        ${role} AS role, a.request_note AS note, a.requested_at AS "requestedAt"
        FROM assistant_access a JOIN users u ON u.id = a.user_id LEFT JOIN custom_roles r ON r.id = u.custom_role_id
        WHERE a.status = 'pending' AND ${activeStaff} AND NOT ${builtIn} ORDER BY a.requested_at DESC`);
      const daily: { day: string; dollars: number }[] =
        await manager.query(`SELECT
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, (sum(nano_usd) / 1000000000)::float8 AS dollars
        FROM assistant_usage WHERE ${currentMonth} AND ${reportedUsage} GROUP BY 1 ORDER BY 1`);
      const spend: { id: string; name: string; dollars: number }[] =
        await manager.query(`SELECT
        COALESCE(x.user_id::text, 'former') AS id, CASE WHEN u.id IS NULL THEN 'Former staff' ELSE ${name} END AS name,
        (sum(x.nano_usd) / 1000000000)::float8 AS dollars FROM assistant_usage x LEFT JOIN users u ON u.id = x.user_id
        WHERE ${currentMonth.replaceAll('created_at', 'x.created_at')} AND ${reportedUsage.replace('created_at', 'x.created_at')} GROUP BY 1, 2 ORDER BY 3 DESC`);
      const shares = Object.fromEntries(
        staff.map(({ id, share }) => [id, share]),
      );
      return {
        budget: {
          limitCents: settings.limitCents,
          mode: settings.mode,
          revision: settings.revision,
          shares,
        },
        model: this.config.get('OPENAI_MODEL', { infer: true }),
        month: settings.month,
        daily,
        spend,
        requests: requests.map((request) => ({
          ...request,
          requestedAt: request.requestedAt.toISOString(),
        })),
        admins: staff.map(({ id, name, role, builtIn, lastActivity }) => ({
          id,
          name,
          role,
          builtIn,
          lastActivity: lastActivity?.toISOString() ?? null,
        })),
      };
    });
  }

  async assertAvailable(userId: string) {
    const status = await this.status(userId);
    if (status.access !== 'available')
      throw new ForbiddenException(
        'Assistant access is required and your budget must be above zero.',
      );
  }

  async reserve(userId: string, model: string, body: object) {
    const [input, cachedInput, output] = modelRates(model);
    // UTF-8 bytes plus framing headroom conservatively bound text input tokens.
    const luna = model.startsWith('gpt-6-luna');
    const inputBound = Buffer.byteLength(JSON.stringify(body)) + 4096;
    const longEstimate = luna && inputBound > 272000;
    const estimate = Math.ceil(
      inputBound * input * (luna ? 2.5 : 1) * (longEstimate ? 2 : 1) +
        2000 * output * (longEstimate ? 1.5 : 1),
    );
    const id = randomUUID();
    await this.db.transaction(async (manager) => {
      const settings = await this.settings(manager, true);
      const access = await this.eligibility(userId, settings.mode, manager);
      if (!access.approved || !access.share)
        throw new ForbiddenException(
          'Your assistant access or budget has changed.',
        );
      const totals = await this.totals(userId, manager, true);
      const limit = settings.limitCents * nanoPerCent;
      if (
        totals.overall + estimate > limit ||
        totals.personal + estimate >
          Number((BigInt(limit) * BigInt(access.share)) / 10000n)
      )
        throw new HttpException(
          'There is not enough AI budget left for this request. Try a shorter chat or contact your Super Admin.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      await manager.query(
        'INSERT INTO assistant_usage (id, user_id, nano_usd) VALUES ($1, $2, $3)',
        [id, userId, estimate],
      );
    });
    return async (usage?: AssistantModelUsage, rejected = false) => {
      if (!usage && !rejected) return;
      const cached = Math.min(
        usage?.input_tokens ?? 0,
        usage?.input_tokens_details?.cached_tokens ?? 0,
      );
      const writes = luna
        ? (usage?.input_tokens_details?.cache_write_tokens ?? 0)
        : 0;
      const longWrites = Math.min(
        writes,
        usage?.input_tokens_details?.cache_write_tokens_details
          ?.ttl_12h_tokens ?? 0,
      );
      const longContext = luna && (usage?.input_tokens ?? 0) > 272000;
      const cost = usage
        ? Math.ceil(
            ((usage.input_tokens - cached - writes) * input +
              cached * cachedInput +
              (writes - longWrites) * input * 1.25 +
              longWrites * input * 2.5) *
              (longContext ? 2 : 1) +
              usage.output_tokens * output * (longContext ? 1.5 : 1),
          )
        : 0;
      await this.db.query(
        'UPDATE assistant_usage SET nano_usd = $2, settled = true WHERE id = $1',
        [id, cost],
      );
    };
  }

  async transcript(
    userId: string,
    filters: {
      from?: string;
      to?: string;
      search?: string;
      prompts: boolean;
      answers: boolean;
      searchPrompts?: boolean;
      searchAnswers?: boolean;
      cursor?: string;
    },
  ) {
    const rows: { id: string; at: Date }[] = await this.db.query(
      `SELECT id, conversation_id AS "conversationId", created_at AS at,
      CASE WHEN $5 THEN prompt END AS prompt, CASE WHEN $6 THEN answer END AS answer,
      CASE WHEN $6 THEN charts END AS charts
      FROM assistant_turns
      WHERE user_id = $1 AND created_at >= ${assistantRetentionCutoff} AND ($2::date IS NULL OR created_at >= ($2::date::timestamp AT TIME ZONE 'UTC'))
        AND ($3::date IS NULL OR created_at < (($3::date + 1)::timestamp AT TIME ZONE 'UTC'))
        AND ($5 OR answer IS NOT NULL)
        AND ($4 = '' OR ($8 AND strpos(lower(prompt), lower($4)) > 0) OR ($9 AND strpos(lower(answer), lower($4)) > 0))
        AND ($7::uuid IS NULL OR (created_at, id) < (SELECT created_at, id FROM assistant_turns WHERE user_id = $1 AND id = $7))
      ORDER BY created_at DESC, id DESC LIMIT 51`,
      [
        userId,
        filters.from ?? null,
        filters.to ?? null,
        filters.search ?? '',
        filters.prompts,
        filters.answers,
        filters.cursor ?? null,
        filters.searchPrompts ?? filters.prompts,
        filters.searchAnswers ?? filters.answers,
      ],
    );
    const turns = rows
      .slice(0, 50)
      .map((row) => ({ ...row, at: row.at.toISOString() }));
    return { turns, next: rows.length > 50 ? turns.at(-1)!.id : null };
  }
}
