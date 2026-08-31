import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OnboardingStatus,
  type CreateSavingsInput,
  type CreateSavingsResponse,
  type DashboardPayload,
  type GoalsListResponse,
  type HabitCompleteResponse,
  type ReflectionJourneyPublic,
  type UserGoalPublic,
} from '@purposemint/contracts';
import { In, QueryFailedError, Repository } from 'typeorm';
import {
  toUserGoalPublic,
  toValuePublic,
  todayInTimeZone,
} from '../common/mappers/onboarding.mapper';
import { toPublicUser } from '../common/mappers/user.mapper';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { SavingsEntry } from '../entities/savings-entry.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { UserHabit } from '../entities/user-habit.entity';
import { UserValue } from '../entities/user-value.entity';
import { User } from '../entities/user.entity';
import { Value } from '../entities/value.entity';
import { UsersService } from '../users/users.service';

const PATHWAY_TARGETS = [
  { key: 'housing', label: 'Housing', targetAmount: 3000 },
  { key: 'vehicle', label: 'Vehicle', targetAmount: 2500 },
  { key: 'childcare', label: 'Childcare', targetAmount: 1200 },
  { key: 'workforce', label: 'Workforce', targetAmount: 750 },
  { key: 'business', label: 'Business', targetAmount: 2000 },
] as const;

const EMPTY_MOOD_TREND: ReflectionJourneyPublic['moodTrend'] = [
  'M',
  'T',
  'W',
  'T',
  'F',
  'S',
  'S',
].map((weekday) => ({ weekday, mood: null }));

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  if (
    typeof driverError !== 'object' ||
    driverError === null ||
    !('code' in driverError)
  ) {
    return false;
  }
  return driverError.code === '23505';
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(UserValue)
    private readonly userValuesRepo: Repository<UserValue>,
    @InjectRepository(UserGoal)
    private readonly userGoalsRepo: Repository<UserGoal>,
    @InjectRepository(UserHabit)
    private readonly userHabitsRepo: Repository<UserHabit>,
    @InjectRepository(HabitCompletion)
    private readonly completionsRepo: Repository<HabitCompletion>,
    @InjectRepository(SavingsEntry)
    private readonly savingsRepo: Repository<SavingsEntry>,
    private readonly usersService: UsersService,
  ) {}

  async getDashboard(userId: string): Promise<DashboardPayload> {
    const user = await this.usersService.getByIdOrFail(userId);
    if (user.onboardingStatus !== OnboardingStatus.COMPLETED) {
      throw new ForbiddenException(
        "Let's finish setting up your account first — you're almost there.",
      );
    }

    const [userValues, goals, habits] = await Promise.all([
      this.userValuesRepo.find({
        where: { userId },
        relations: { value: true },
      }),
      this.userGoalsRepo.find({
        where: { userId, isActive: true },
        order: { createdAt: 'ASC' },
      }),
      this.userHabitsRepo.find({
        where: { userId, isActive: true },
        relations: { sourceTemplate: true },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const values = userValues
      .map((row) => row.value)
      .filter((value): value is Value => Boolean(value))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toValuePublic);

    const today = todayInTimeZone(user.timeZone);
    const habitIds = habits.map((habit) => habit.id);
    const todaysCompletions =
      habitIds.length === 0
        ? []
        : await this.completionsRepo.find({
            where: { userHabitId: In(habitIds), completedOn: today },
          });
    const completedIds = new Set(
      todaysCompletions.map((row) => row.userHabitId),
    );

    const publicGoals = goals.map(toUserGoalPublic);
    const focusGoal = publicGoals.find((goal) => goal.isFocus) ?? null;

    return {
      user: toPublicUser(user),
      displayName: user.displayName ?? user.firstName,
      primaryValue: values[0] ?? null,
      values,
      focusGoal,
      goals: publicGoals,
      habits: habits.flatMap((habit) => {
        const template = habit.sourceTemplate;
        if (!template) return [];
        return [
          {
            id: habit.id,
            templateId: template.id,
            title: template.title,
            description: template.description,
            frequency: template.frequency,
            category: template.category,
            iconEmoji: template.iconEmoji,
            isActive: habit.isActive,
            completedToday: completedIds.has(habit.id),
          },
        ];
      }),
      communityChallenge: {
        monthLabel: new Date().toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
        title: 'No-Spend Weekend Challenge',
        description: 'Skip one weekend of spending & save the difference',
        participantCount: 847,
        completedPercent: 68,
      },
      reflection: {
        voiceCount: 0,
        textCount: 0,
        streakDays: 0,
        moodTrend: EMPTY_MOOD_TREND,
        averageMood: null,
        themes: [],
        recent: [],
      },
      pathwayProgress: PATHWAY_TARGETS.map((pathway) => ({
        key: pathway.key,
        label: pathway.label,
        savedAmount: 0,
        targetAmount: pathway.targetAmount,
      })),
    };
  }

  async listGoals(userId: string): Promise<GoalsListResponse> {
    await this.requireCompleted(userId);
    const goals = await this.userGoalsRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'ASC' },
    });
    return { goals: goals.map(toUserGoalPublic) };
  }

  async setFocusGoal(userId: string, goalId: string): Promise<UserGoalPublic> {
    await this.requireCompleted(userId);
    return this.userGoalsRepo.manager.transaction(async (manager) => {
      await manager.findOneOrFail(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      const goal = await manager.findOne(UserGoal, {
        where: { id: goalId, userId, isActive: true },
      });
      if (!goal) {
        throw new NotFoundException("We couldn't find that savings goal.");
      }
      await manager.update(
        UserGoal,
        { userId, isFocus: true },
        { isFocus: false },
      );
      await manager.update(UserGoal, { id: goal.id }, { isFocus: true });
      const saved = await manager.findOneByOrFail(UserGoal, { id: goal.id });
      return toUserGoalPublic(saved);
    });
  }

  async toggleHabitCompletion(
    userId: string,
    userHabitId: string,
  ): Promise<HabitCompleteResponse> {
    const user = await this.requireCompleted(userId);
    const today = todayInTimeZone(user.timeZone);

    try {
      return await this.completionsRepo.manager.transaction(async (manager) => {
        const habit = await manager.findOne(UserHabit, {
          where: { id: userHabitId, userId, isActive: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!habit) {
          throw new NotFoundException("We couldn't find that habit.");
        }

        const existing = await manager.findOne(HabitCompletion, {
          where: { userId, userHabitId, completedOn: today },
        });
        if (existing) {
          await manager.remove(existing);
          return { userHabitId, completedToday: false, completedOn: null };
        }

        await manager.save(
          HabitCompletion,
          manager.create(HabitCompletion, {
            userId,
            userHabitId,
            completedOn: today,
          }),
        );
        return { userHabitId, completedToday: true, completedOn: today };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { userHabitId, completedToday: true, completedOn: today };
      }
      throw error;
    }
  }

  async addSavings(
    userId: string,
    input: CreateSavingsInput,
  ): Promise<CreateSavingsResponse> {
    await this.requireCompleted(userId);
    const saved = await this.savingsRepo.manager.transaction(async (manager) => {
      const goal = await manager.findOne(UserGoal, {
        where: { id: input.goalId, userId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!goal) {
        throw new NotFoundException("We couldn't find that savings goal.");
      }
      const entry = await manager.save(
        SavingsEntry,
        manager.create(SavingsEntry, {
          userId,
          userGoalId: goal.id,
          amount: input.amount,
          note: input.note?.trim() ? input.note.trim() : null,
        }),
      );

      const raw = await manager
        .createQueryBuilder(SavingsEntry, 'entry')
        .select('COALESCE(SUM(entry.amount), 0)', 'total')
        .where('entry.userGoalId = :goalId', { goalId: goal.id })
        .getRawOne<{ total: string }>();

      await manager.update(UserGoal, { id: goal.id }, {
        savedAmount: Number(raw?.total ?? 0),
      });

      const updatedGoal = await manager.findOneByOrFail(UserGoal, {
        id: goal.id,
      });
      return { entry, goal: updatedGoal };
    });

    return {
      entry: {
        id: saved.entry.id,
        goalId: saved.entry.userGoalId,
        amount: Number(saved.entry.amount),
        note: saved.entry.note,
        createdAt: saved.entry.createdAt.toISOString(),
      },
      goal: toUserGoalPublic(saved.goal),
    };
  }

  private async requireCompleted(userId: string): Promise<User> {
    const user = await this.usersService.getByIdOrFail(userId);
    if (user.onboardingStatus !== OnboardingStatus.COMPLETED) {
      throw new ForbiddenException(
        "Let's finish setting up your account first — you're almost there.",
      );
    }
    return user;
  }
}
