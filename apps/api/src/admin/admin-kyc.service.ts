import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuditAction,
  AuditActorType,
  KycStatus,
  UserType,
  kycStatusValues,
  type AdminKycEscalateInput,
  type AdminKycItem,
  type AdminKycQuery,
  type AdminKycResponse,
  type KycStatusValue,
} from '@purposemint/contracts';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import type { RequestContext } from '../common/request-context';
import { KycVerification } from '../entities/kyc-verification.entity';
import { User } from '../entities/user.entity';
import { type KycProvider, ManualKycProvider } from './kyc-provider';

export const KYC_STUCK_AFTER_DAYS = 3;

const KYC_LABELS: Record<KycStatusValue, string> = {
  [KycStatus.NOT_STARTED]: 'Not started',
  [KycStatus.IN_PROGRESS]: 'In progress',
  [KycStatus.VERIFIED]: 'Verified',
  [KycStatus.FAILED]: 'Failed',
  [KycStatus.REQUIRES_ACTION]: 'Requires action',
  [KycStatus.UNDER_REVIEW]: 'Under review',
};

// Statuses that should resolve on their own; they become "stuck" when they don't.
const STUCK_ELIGIBLE: readonly KycStatusValue[] = [
  KycStatus.IN_PROGRESS,
  KycStatus.REQUIRES_ACTION,
  KycStatus.UNDER_REVIEW,
];
const RETRYABLE: readonly KycStatusValue[] = [
  KycStatus.NOT_STARTED,
  KycStatus.FAILED,
  KycStatus.REQUIRES_ACTION,
];

type UserWithKyc = User & { kyc?: KycVerification | null };

@Injectable()
export class AdminKycService {
  private readonly provider: KycProvider = new ManualKycProvider();

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(KycVerification)
    private readonly verifications: Repository<KycVerification>,
    private readonly audit: AuditService,
  ) {}

  async list(
    principal: AuthPrincipal,
    query: AdminKycQuery,
    context: RequestContext,
  ): Promise<AdminKycResponse> {
    const stuckBefore = this.stuckBefore();
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndMapOne('u.kyc', KycVerification, 'kyc', 'kyc.userId = u.id')
      .where('u.userType = :type', { type: UserType.CUSTOMER });

    if (query.search) {
      const search = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        new Brackets((where) =>
          where
            .where('u.email ILIKE :search', { search })
            .orWhere('u.firstName ILIKE :search', { search })
            .orWhere('u.lastName ILIKE :search', { search })
            .orWhere('u.displayName ILIKE :search', { search }),
        ),
      );
    }
    if (query.status === KycStatus.NOT_STARTED) {
      qb.andWhere('(kyc.status IS NULL OR kyc.status = :status)', {
        status: query.status,
      });
    } else if (query.status) {
      qb.andWhere('kyc.status = :status', { status: query.status });
    }
    if (query.stuck) {
      qb.andWhere('kyc.status IN (:...eligible)', {
        eligible: STUCK_ELIGIBLE,
      }).andWhere('kyc.statusChangedAt < :stuckBefore', { stuckBefore });
    }

    const [rows, total] = await qb
      .orderBy('kyc.statusChangedAt', 'ASC', 'NULLS LAST')
      .addOrderBy('u.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    const summary = await this.summary(stuckBefore);
    await this.record(principal, context, AuditAction.ADMIN_KYC_LISTED, {
      entityType: 'kyc_verifications',
      metadata: {
        page: query.page,
        status: query.status ?? null,
        stuck: query.stuck ?? null,
      },
    });

    return {
      summary,
      items: (rows as UserWithKyc[]).map((user) =>
        this.toItem(user, user.kyc ?? null, stuckBefore),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async retry(
    principal: AuthPrincipal,
    userId: string,
    context: RequestContext,
  ): Promise<AdminKycItem> {
    const { user, record } = await this.load(userId);
    const stuckBefore = this.stuckBefore();
    const item = this.toItem(user, record, stuckBefore);
    if (!item.canRetry) {
      throw new BadRequestException(
        'This verification cannot be retried in its current state.',
      );
    }

    const result = await this.provider.retryVerification(user.id);
    const now = new Date();
    const next = this.verifications.create({
      ...(record ?? { userId: user.id }),
      status: KycStatus.IN_PROGRESS,
      provider: this.provider.name,
      providerReference: result.providerReference,
      failureCode: null,
      failureReason: null,
      attemptCount: (record?.attemptCount ?? 0) + 1,
      statusChangedAt: now,
      lastRetryAt: now,
    });
    const saved = await this.verifications.save(next);

    await this.record(principal, context, AuditAction.ADMIN_KYC_RETRIED, {
      entityType: 'kyc_verification',
      entityId: user.id,
      metadata: {
        previousStatus: record?.status ?? KycStatus.NOT_STARTED,
        attemptCount: saved.attemptCount,
        provider: saved.provider,
      },
    });
    return this.toItem(user, saved, stuckBefore);
  }

  async escalate(
    principal: AuthPrincipal,
    userId: string,
    input: AdminKycEscalateInput,
    context: RequestContext,
  ): Promise<AdminKycItem> {
    const { user, record } = await this.load(userId);
    const status = record?.status ?? KycStatus.NOT_STARTED;
    if (status === KycStatus.VERIFIED) {
      throw new BadRequestException('Verified customers cannot be escalated.');
    }
    if (record?.escalatedAt) {
      throw new ConflictException('This case has already been escalated.');
    }

    const now = new Date();
    const saved = await this.verifications.save(
      this.verifications.create({
        ...(record ?? {
          userId: user.id,
          provider: this.provider.name,
          attemptCount: 0,
        }),
        status: KycStatus.UNDER_REVIEW,
        statusChangedAt:
          status === KycStatus.UNDER_REVIEW
            ? (record?.statusChangedAt ?? now)
            : now,
        escalatedAt: now,
        escalatedBy: principal.userId,
        escalationNote: input.note,
      }),
    );

    await this.record(principal, context, AuditAction.ADMIN_KYC_ESCALATED, {
      entityType: 'kyc_verification',
      entityId: user.id,
      metadata: { previousStatus: status },
    });
    return this.toItem(user, saved, this.stuckBefore());
  }

  private async load(userId: string) {
    const user = await this.users.findOne({
      where: { id: userId, userType: UserType.CUSTOMER },
    });
    if (!user) throw new NotFoundException('Customer account not found.');
    const record = await this.verifications.findOne({ where: { userId } });
    return { user, record };
  }

  private async summary(
    stuckBefore: Date,
  ): Promise<AdminKycResponse['summary']> {
    const customerCount = await this.users.count({
      where: { userType: UserType.CUSTOMER },
    });
    const base = this.verifications
      .createQueryBuilder('kyc')
      .innerJoin(User, 'u', 'u.id = kyc.userId AND u.userType = :type', {
        type: UserType.CUSTOMER,
      });
    const [grouped, stuck, escalated] = await Promise.all([
      base
        .clone()
        .select('kyc.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('kyc.status')
        .getRawMany<{ status: KycStatusValue; count: string }>(),
      base
        .clone()
        .where('kyc.status IN (:...eligible)', { eligible: STUCK_ELIGIBLE })
        .andWhere('kyc.statusChangedAt < :stuckBefore', { stuckBefore })
        .getCount(),
      base.clone().where('kyc.escalatedAt IS NOT NULL').getCount(),
    ]);

    const counts = new Map<KycStatusValue, number>(
      grouped.map((row) => [row.status, Number(row.count)]),
    );
    const tracked = [...counts.values()].reduce((sum, n) => sum + n, 0);
    counts.set(
      KycStatus.NOT_STARTED,
      (counts.get(KycStatus.NOT_STARTED) ?? 0) + customerCount - tracked,
    );

    return {
      counts: kycStatusValues.map((key) => ({
        key,
        label: KYC_LABELS[key],
        count: counts.get(key) ?? 0,
      })),
      stuck,
      escalated,
      stuckAfterDays: KYC_STUCK_AFTER_DAYS,
    };
  }

  private stuckBefore(): Date {
    return new Date(Date.now() - KYC_STUCK_AFTER_DAYS * 86_400_000);
  }

  private toItem(
    user: User,
    record: KycVerification | null,
    stuckBefore: Date,
  ): AdminKycItem {
    const status = record?.status ?? KycStatus.NOT_STARTED;
    const isStuck =
      !!record &&
      STUCK_ELIGIBLE.includes(status) &&
      record.statusChangedAt < stuckBefore;
    return {
      user: {
        id: user.id,
        name: user.displayName ?? `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        timeZone: user.timeZone,
      },
      status,
      provider: record?.provider ?? this.provider.name,
      failureCode: record?.failureCode ?? null,
      failureReason: record?.failureReason ?? null,
      attemptCount: record?.attemptCount ?? 0,
      statusChangedAt: record?.statusChangedAt.toISOString() ?? null,
      lastRetryAt: record?.lastRetryAt?.toISOString() ?? null,
      isStuck,
      canRetry: RETRYABLE.includes(status) || isStuck,
      escalatedAt: record?.escalatedAt?.toISOString() ?? null,
      escalationNote: record?.escalationNote ?? null,
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
