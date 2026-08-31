import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ReflectionKind,
  type CreateMoodEntryInput,
  type CreateReflectionInput,
  type DeleteReflectionResponse,
  type ReflectionJourneyPublic,
  type ReflectionListQuery,
  type ReflectionPublic,
  type ReflectionsListResponse,
  type UpdateReflectionInput,
} from '@purposemint/contracts';
import { EntityManager, Repository } from 'typeorm';
import { todayInTimeZone } from '../common/mappers/onboarding.mapper';
import { ReflectionThemeMatch } from '../entities/reflection-theme-match.entity';
import { ReflectionTheme } from '../entities/reflection-theme.entity';
import { Reflection } from '../entities/reflection.entity';
import { User } from '../entities/user.entity';

const STABLE_BAND = 0.35;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

@Injectable()
export class ReflectionsService {
  constructor(
    @InjectRepository(Reflection)
    private readonly reflections: Repository<Reflection>,
    @InjectRepository(ReflectionTheme)
    private readonly themes: Repository<ReflectionTheme>,
  ) {}

  async list(
    userId: string,
    query: ReflectionListQuery,
  ): Promise<ReflectionsListResponse> {
    const rows = await this.reflections.find({
      where: { userId },
      relations: { themeMatches: { theme: true } },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit + 1,
    });
    return {
      items: rows.slice(0, query.limit).map((row) => this.toPublic(row)),
      page: query.page,
      hasMore: rows.length > query.limit,
    };
  }

  async create(
    userId: string,
    input: CreateReflectionInput,
  ): Promise<ReflectionPublic> {
    const id = await this.reflections.manager.transaction(async (manager) => {
      const user = await this.lockUser(manager, userId);
      const row = await manager.save(
        manager.create(Reflection, {
          userId,
          kind: ReflectionKind.TEXT,
          body: input.body,
          moodScore: input.moodScore ?? null,
          durationSeconds: null,
          reflectedOn: todayInTimeZone(user.timeZone),
        }),
      );
      await this.recomputeThemes(manager, row.id, row.body);
      return row.id;
    });
    return this.getOwned(userId, id);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateReflectionInput,
  ): Promise<ReflectionPublic> {
    await this.reflections.manager.transaction(async (manager) => {
      const row = await manager.findOne(Reflection, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row)
        throw new NotFoundException("We couldn't find that reflection.");
      if (input.body !== undefined) row.body = input.body;
      if (input.moodScore !== undefined) row.moodScore = input.moodScore;
      await manager.save(row);
      await this.recomputeThemes(manager, row.id, row.body);
    });
    return this.getOwned(userId, id);
  }

  async remove(userId: string, id: string): Promise<DeleteReflectionResponse> {
    await this.reflections.manager.transaction(async (manager) => {
      const row = await manager.findOne(Reflection, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row)
        throw new NotFoundException("We couldn't find that reflection.");
      await manager.remove(row);
    });
    return { message: 'Reflection deleted.' };
  }

  async createMood(
    userId: string,
    input: CreateMoodEntryInput,
  ): Promise<ReflectionPublic> {
    const id = await this.reflections.manager.transaction(async (manager) => {
      const user = await this.lockUser(manager, userId);
      const row = await manager.save(
        manager.create(Reflection, {
          userId,
          kind: ReflectionKind.TEXT,
          body: null,
          moodScore: input.moodScore,
          durationSeconds: null,
          reflectedOn: todayInTimeZone(user.timeZone),
        }),
      );
      return row.id;
    });
    return this.getOwned(userId, id);
  }

  async getSummary(
    userId: string,
    knownUser?: User,
  ): Promise<ReflectionJourneyPublic> {
    const user =
      knownUser ??
      (await this.reflections.manager.findOne(User, { where: { id: userId } }));
    if (!user) throw new NotFoundException('User not found.');
    const today = todayInTimeZone(user.timeZone);
    const dates = Array.from({ length: 7 }, (_, index) =>
      shiftDate(today, index - 6),
    );
    const start = dates[0];

    const [countRows, dateRows, moodRows, themeRows, recent] =
      await Promise.all([
        this.reflections
          .createQueryBuilder('reflection')
          .select('reflection.kind', 'kind')
          .addSelect('COUNT(*)', 'count')
          .where('reflection.user_id = :userId', { userId })
          .andWhere(
            '(reflection.body IS NOT NULL OR reflection.kind = :voice)',
            { voice: ReflectionKind.VOICE },
          )
          .groupBy('reflection.kind')
          .getRawMany<{ kind: string; count: string }>(),
        this.reflections
          .createQueryBuilder('reflection')
          .select('reflection.reflected_on', 'date')
          .where('reflection.user_id = :userId', { userId })
          .andWhere(
            '(reflection.body IS NOT NULL OR reflection.kind = :voice)',
            { voice: ReflectionKind.VOICE },
          )
          .groupBy('reflection.reflected_on')
          .orderBy('reflection.reflected_on', 'DESC')
          .getRawMany<{ date: string }>(),
        this.reflections
          .createQueryBuilder('reflection')
          .select('reflection.reflected_on', 'date')
          .addSelect('AVG(reflection.mood_score)', 'average')
          .where('reflection.user_id = :userId', { userId })
          .andWhere('reflection.reflected_on BETWEEN :start AND :today', {
            start,
            today,
          })
          .andWhere('reflection.mood_score IS NOT NULL')
          .groupBy('reflection.reflected_on')
          .getRawMany<{ date: string; average: string }>(),
        this.reflections.manager
          .createQueryBuilder(ReflectionThemeMatch, 'match')
          .innerJoin('match.reflection', 'reflection')
          .innerJoin('match.theme', 'theme')
          .select('theme.key', 'key')
          .addSelect('theme.label', 'label')
          .addSelect('theme.color_token', 'colorToken')
          .addSelect('theme.encouragement_line', 'encouragementLine')
          .addSelect('theme.sort_order', 'sortOrder')
          .addSelect('COUNT(*)', 'count')
          .where('reflection.user_id = :userId', { userId })
          .groupBy('theme.key')
          .addGroupBy('theme.label')
          .addGroupBy('theme.color_token')
          .addGroupBy('theme.encouragement_line')
          .addGroupBy('theme.sort_order')
          .orderBy('COUNT(*)', 'DESC')
          .addOrderBy('theme.sort_order', 'ASC')
          .getRawMany<{
            key: string;
            label: string;
            colorToken: string;
            encouragementLine: string;
            sortOrder: number;
            count: string;
          }>(),
        this.reflections
          .createQueryBuilder('reflection')
          .where('reflection.user_id = :userId', { userId })
          .andWhere(
            '(reflection.body IS NOT NULL OR reflection.kind = :voice)',
            { voice: ReflectionKind.VOICE },
          )
          .orderBy('reflection.created_at', 'DESC')
          .take(3)
          .getMany(),
      ]);

    const counts = new Map(
      countRows.map((row) => [row.kind, Number(row.count)]),
    );
    const moodByDate = new Map(
      moodRows.map((row) => [row.date, roundOne(Number(row.average))]),
    );
    const moodTrend = dates.map((date) => ({
      date,
      weekday: WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()],
      mood: moodByDate.get(date) ?? null,
    }));
    const moodValues = moodTrend.flatMap((day) =>
      day.mood === null ? [] : [day.mood],
    );
    const earlierAverage = average(
      moodTrend
        .slice(0, 3)
        .flatMap((day) => (day.mood === null ? [] : [day.mood])),
    );
    const recentAverage = average(
      moodTrend
        .slice(4)
        .flatMap((day) => (day.mood === null ? [] : [day.mood])),
    );
    const trendDescriptor =
      earlierAverage === null || recentAverage === null
        ? null
        : recentAverage - earlierAverage > STABLE_BAND
          ? 'Rising'
          : recentAverage - earlierAverage < -STABLE_BAND
            ? 'Falling'
            : 'Stable';
    const distinctDates = new Set(dateRows.map((row) => row.date));
    const yesterday = shiftDate(today, -1);
    let cursor = distinctDates.has(today)
      ? today
      : distinctDates.has(yesterday)
        ? yesterday
        : null;
    let streakDays = 0;
    while (cursor && distinctDates.has(cursor)) {
      streakDays += 1;
      cursor = shiftDate(cursor, -1);
    }

    return {
      voiceCount: counts.get(ReflectionKind.VOICE) ?? 0,
      textCount: counts.get(ReflectionKind.TEXT) ?? 0,
      streakDays,
      moodTrend,
      averageMood: average(moodValues),
      trendDescriptor,
      themes: themeRows.map((row) => ({
        key: row.key,
        label: row.label,
        colorToken: row.colorToken,
        count: Number(row.count),
      })),
      encouragementLine: themeRows[0]?.encouragementLine ?? null,
      recent: recent.map((row) => ({
        id: row.id,
        kind: row.kind,
        excerpt: excerpt(row.body),
        dateLabel: dateLabel(row.reflectedOn, today),
        moodScore: row.moodScore,
        durationSeconds: row.durationSeconds,
      })),
    };
  }

  private async getOwned(
    userId: string,
    id: string,
  ): Promise<ReflectionPublic> {
    const row = await this.reflections.findOne({
      where: { id, userId },
      relations: { themeMatches: { theme: true } },
    });
    if (!row) throw new NotFoundException("We couldn't find that reflection.");
    return this.toPublic(row);
  }

  private async lockUser(
    manager: EntityManager,
    userId: string,
  ): Promise<User> {
    const user = await manager.findOne(User, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async recomputeThemes(
    manager: EntityManager,
    reflectionId: string,
    body: string | null,
  ) {
    await manager.delete(ReflectionThemeMatch, { reflectionId });
    if (!body) return;
    const themes = await manager.find(ReflectionTheme, {
      order: { sortOrder: 'ASC' },
    });
    const keys = themes
      .filter((theme) =>
        theme.matchKeywords.some((keyword) =>
          new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(body),
        ),
      )
      .map((theme) => theme.key);
    if (keys.length)
      await manager.insert(
        ReflectionThemeMatch,
        keys.map((themeKey) => ({ reflectionId, themeKey })),
      );
  }

  private toPublic(row: Reflection): ReflectionPublic {
    return {
      id: row.id,
      kind: row.kind,
      body: row.body,
      moodScore: row.moodScore,
      durationSeconds: row.durationSeconds,
      reflectedOn: row.reflectedOn,
      themes: (row.themeMatches ?? [])
        .flatMap((match) =>
          match.theme
            ? [
                {
                  key: match.theme.key,
                  label: match.theme.label,
                  colorToken: match.theme.colorToken,
                },
              ]
            : [],
        )
        .sort((a, b) => a.label.localeCompare(b.label)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function average(values: number[]): number | null {
  return values.length
    ? roundOne(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}
function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function excerpt(body: string | null): string {
  if (!body) return 'Voice reflection';
  const clean = body.trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
}
function dateLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === shiftDate(today, -1)) return 'Yesterday';
  const value = new Date(`${date}T12:00:00Z`);
  return `${MONTHS[value.getUTCMonth()]} ${value.getUTCDate()}`;
}
