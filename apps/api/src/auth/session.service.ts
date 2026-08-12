import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuditAction,
  AuditOutcome,
  ClientType,
  type ClientTypeValue,
} from '@purposemint/contracts';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../common/request-context';
import type { Env } from '../config/env.validation';
import { UserSession } from '../entities/user-session.entity';

export interface IssuedSession {
  sessionId: string;
  familyId: string;
  /** Returned to the client exactly once. Only its SHA-256 is persisted. */
  refreshToken: string;
  expiresAt: Date;
  clientType: ClientTypeValue;
}

export const SessionRevokedReason = {
  LOGOUT: 'logout',
  LOGOUT_ALL: 'logout_all',
  PASSWORD_CHANGED: 'password_changed',
  PASSWORD_RESET: 'password_reset',
  REFRESH_REUSE_DETECTED: 'refresh_reuse_detected',
} as const;

export type SessionRevokedReasonValue =
  (typeof SessionRevokedReason)[keyof typeof SessionRevokedReason];

/**
 * Refresh sessions: issue, rotate, revoke.
 *
 * Every `/auth/refresh` mints a new row and stamps `rotatedAt` on the one it
 * replaces. Presenting an already-rotated token means the token leaked, so the
 * whole family is revoked rather than just the one row.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly ttlDays: Record<ClientTypeValue, number>;

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionsRepo: Repository<UserSession>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.ttlDays = {
      [ClientType.MOBILE]: config.get('REFRESH_TTL_DAYS_MOBILE', {
        infer: true,
      }),
      [ClientType.DASHBOARD]: config.get('REFRESH_TTL_DAYS_DASHBOARD', {
        infer: true,
      }),
    };
  }

  refreshTtlSeconds(clientType: ClientTypeValue): number {
    return this.ttlDays[clientType] * 86400;
  }

  async issue(params: {
    userId: string;
    clientType: ClientTypeValue;
    context: RequestContext;
    familyId?: string;
  }): Promise<IssuedSession> {
    return this.insert(this.sessionsRepo, params);
  }

  /**
   * Rotates a presented refresh token.
   *
   * The lookup and the swap run in one transaction with a row lock, so two
   * concurrent refreshes cannot both succeed and mint divergent chains. The
   * transaction only ever *returns* a verdict — revoking a family and writing
   * the audit event happen after it commits, because throwing from inside
   * would roll the revocation straight back.
   */
  async rotate(
    presentedToken: string,
    context: RequestContext,
  ): Promise<IssuedSession & { userId: string }> {
    const verdict = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(UserSession);
      const existing = await repo
        .createQueryBuilder('session')
        .setLock('pessimistic_write')
        .where('session.tokenHash = :tokenHash', {
          tokenHash: hashToken(presentedToken),
        })
        .getOne();

      if (!existing) return { kind: 'unknown' } as const;

      // Already exchanged once — someone is replaying a copy of the token.
      if (existing.rotatedAt) {
        return { kind: 'reuse', session: existing } as const;
      }

      if (existing.revokedAt || existing.expiresAt.getTime() <= Date.now()) {
        return { kind: 'dead' } as const;
      }

      await repo.update(existing.id, { rotatedAt: new Date() });

      const issued = await this.insert(repo, {
        userId: existing.userId,
        // The stored client type wins — a client cannot talk its way into a
        // longer-lived refresh token by claiming to be something else.
        clientType: existing.clientType,
        context,
        familyId: existing.familyId,
      });

      return { kind: 'rotated', issued, userId: existing.userId } as const;
    });

    if (verdict.kind === 'reuse') {
      const { session } = verdict;
      await this.revokeFamily(
        session.familyId,
        SessionRevokedReason.REFRESH_REUSE_DETECTED,
      );
      this.logger.warn(
        `Refresh reuse detected for session family ${session.familyId}; family revoked.`,
      );
      await this.audit.record({
        action: AuditAction.SESSION_REFRESH_REUSE_DETECTED,
        outcome: AuditOutcome.FAILURE,
        actorUserId: session.userId,
        entityType: 'user_session',
        entityId: session.id,
        ipAddress: context.ipAddress,
        metadata: { familyId: session.familyId },
      });
      throw this.genericRefreshFailure();
    }

    if (verdict.kind !== 'rotated') throw this.genericRefreshFailure();

    return { ...verdict.issued, userId: verdict.userId };
  }

  async revokeSession(
    sessionId: string,
    reason: SessionRevokedReasonValue,
  ): Promise<void> {
    await this.sessionsRepo.update(
      { id: sessionId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
  }

  /** Revokes every live session for a user, optionally sparing the current one. */
  async revokeAllForUser(
    userId: string,
    reason: SessionRevokedReasonValue,
    exceptSessionId?: string,
  ): Promise<void> {
    await this.sessionsRepo.update(
      {
        userId,
        revokedAt: IsNull(),
        ...(exceptSessionId ? { id: Not(exceptSessionId) } : {}),
      },
      { revokedAt: new Date(), revokedReason: reason },
    );
  }

  private async revokeFamily(
    familyId: string,
    reason: SessionRevokedReasonValue,
  ): Promise<void> {
    await this.sessionsRepo.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
  }

  private async insert(
    repo: Repository<UserSession>,
    params: {
      userId: string;
      clientType: ClientTypeValue;
      context: RequestContext;
      familyId?: string;
    },
  ): Promise<IssuedSession> {
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.refreshTtlSeconds(params.clientType) * 1000,
    );
    const session = await repo.save(
      repo.create({
        userId: params.userId,
        familyId: params.familyId ?? randomUUID(),
        tokenHash: hashToken(refreshToken),
        clientType: params.clientType,
        userAgent: params.context.userAgent,
        ipAddress: params.context.ipAddress,
        expiresAt,
      }),
    );

    return {
      sessionId: session.id,
      familyId: session.familyId,
      refreshToken,
      expiresAt,
      clientType: params.clientType,
    };
  }

  /** Every refresh failure looks the same from outside. */
  private genericRefreshFailure(): UnauthorizedException {
    return new UnauthorizedException(
      "That session has run out. Signing in again will get you straight back to where you were.",
    );
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
