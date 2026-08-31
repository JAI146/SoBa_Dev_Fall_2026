import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Tier,
  type CommunityChallengePublic,
  type JoinChallengeResponse,
} from '@purposemint/contracts';
import { IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import { todayInTimeZone } from '../common/mappers/onboarding.mapper';
import { ChallengeParticipation } from '../entities/challenge-participation.entity';
import { CommunityChallenge } from '../entities/community-challenge.entity';
import { User } from '../entities/user.entity';

const JOIN_MESSAGE =
  "You're in. Take this challenge at the pace that works for you.";

@Injectable()
export class CommunityChallengesService {
  constructor(
    @InjectRepository(CommunityChallenge)
    private readonly challenges: Repository<CommunityChallenge>,
    @InjectRepository(ChallengeParticipation)
    private readonly participations: Repository<ChallengeParticipation>,
  ) {}

  async getCurrent(
    userId: string,
    knownUser?: User,
  ): Promise<CommunityChallengePublic | null> {
    const user =
      knownUser ??
      (await this.challenges.manager.findOne(User, { where: { id: userId } }));
    if (!user) throw new NotFoundException('User not found.');
    const activeMonth = monthStart(todayInTimeZone(user.timeZone));
    const challenge = await this.challenges.findOne({
      where: { activeMonth, isActive: true },
      order: { sortOrder: 'ASC' },
    });
    if (!challenge) return null;

    const [participantCount, completedCount, ownParticipation] =
      await Promise.all([
        this.participations.count({ where: { challengeId: challenge.id } }),
        this.participations.count({
          where: { challengeId: challenge.id, completedAt: Not(IsNull()) },
        }),
        this.participations.findOne({
          where: { challengeId: challenge.id, userId },
        }),
      ]);
    const eligible = user.tier === Tier.GROWTH || user.tier === Tier.ELEVATE;

    return {
      id: challenge.id,
      key: challenge.key,
      monthLabel: formatMonth(challenge.activeMonth),
      title: challenge.title,
      description: challenge.description,
      participantCount,
      completedPercent:
        participantCount === 0
          ? 0
          : Math.round((completedCount / participantCount) * 100),
      viewerState: !eligible
        ? 'read_only'
        : ownParticipation
          ? 'joined'
          : 'eligible',
      joinedAt: ownParticipation?.joinedAt.toISOString() ?? null,
      completedAt: ownParticipation?.completedAt?.toISOString() ?? null,
    };
  }

  async join(
    userId: string,
    challengeId: string,
  ): Promise<JoinChallengeResponse> {
    try {
      const result = await this.participations.manager.transaction(
        async (manager) => {
          const user = await manager.findOne(User, {
            where: { id: userId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!user) throw new NotFoundException('User not found.');
          if (user.tier !== Tier.GROWTH && user.tier !== Tier.ELEVATE) {
            throw new ForbiddenException(
              'Momentum or Elevation is required to join community challenges.',
            );
          }

          const challenge = await manager.findOne(CommunityChallenge, {
            where: {
              id: challengeId,
              activeMonth: monthStart(todayInTimeZone(user.timeZone)),
              isActive: true,
            },
          });
          if (!challenge) {
            throw new NotFoundException(
              "We couldn't find an active challenge to join.",
            );
          }

          const existing = await manager.findOneBy(ChallengeParticipation, {
            userId,
            challengeId,
          });
          if (existing) return { participation: existing, alreadyJoined: true };

          const participation = await manager.save(
            manager.create(ChallengeParticipation, {
              userId,
              challengeId,
              completedAt: null,
            }),
          );
          return { participation, alreadyJoined: false };
        },
      );
      return toJoinResponse(result.participation, result.alreadyJoined);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const participation = await this.participations.findOneBy({
        userId,
        challengeId,
      });
      if (!participation) throw error;
      return toJoinResponse(participation, true);
    }
  }
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function formatMonth(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  });
}

function toJoinResponse(
  participation: ChallengeParticipation,
  alreadyJoined: boolean,
): JoinChallengeResponse {
  return {
    challengeId: participation.challengeId,
    joinedAt: participation.joinedAt.toISOString(),
    alreadyJoined,
    message: JOIN_MESSAGE,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return Boolean(
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505',
  );
}
