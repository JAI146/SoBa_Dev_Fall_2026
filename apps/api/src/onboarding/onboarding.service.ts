import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OnboardingStatus,
  type OnboardingContentResponse,
  type SaveOnboardingGoalInput,
  type SaveOnboardingHabitsInput,
  type SaveOnboardingValuesInput,
} from '@purposemint/contracts';
import { In, Repository, type EntityManager } from 'typeorm';
import {
  resolveOnboardingStep,
  toGoalTemplatePublic,
  toValuePublic,
} from '../common/mappers/onboarding.mapper';
import { DashboardService } from '../dashboard/dashboard.service';
import { GoalCreationService } from '../dashboard/goal-creation.service';
import { GoalTemplate } from '../entities/goal-template.entity';
import { HabitTemplate } from '../entities/habit-template.entity';
import { User } from '../entities/user.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { UserHabit } from '../entities/user-habit.entity';
import { UserValue } from '../entities/user-value.entity';
import { Value } from '../entities/value.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(Value)
    private readonly valuesRepo: Repository<Value>,
    @InjectRepository(GoalTemplate)
    private readonly goalTemplatesRepo: Repository<GoalTemplate>,
    @InjectRepository(HabitTemplate)
    private readonly habitTemplatesRepo: Repository<HabitTemplate>,
    @InjectRepository(UserValue)
    private readonly userValuesRepo: Repository<UserValue>,
    @InjectRepository(UserGoal)
    private readonly userGoalsRepo: Repository<UserGoal>,
    @InjectRepository(UserHabit)
    private readonly userHabitsRepo: Repository<UserHabit>,
    private readonly usersService: UsersService,
    private readonly dashboardService: DashboardService,
    private readonly goalCreationService: GoalCreationService,
  ) {}

  async getContent(userId: string): Promise<OnboardingContentResponse> {
    const [user, values, goalTemplates, habitTemplates, userValues, focusGoal, userHabits] =
      await Promise.all([
        this.usersService.getByIdOrFail(userId),
        this.valuesRepo.find({ order: { sortOrder: 'ASC' } }),
        this.goalTemplatesRepo.find({ order: { sortOrder: 'ASC' } }),
        this.habitTemplatesRepo.find({ order: { sortOrder: 'ASC' } }),
        this.userValuesRepo.find({
          where: { userId },
          relations: { value: true },
        }),
        this.userGoalsRepo.findOne({
          where: { userId, isFocus: true, isActive: true },
        }),
        this.userHabitsRepo.find({
          where: { userId, isActive: true },
        }),
      ]);

    const selectedValues = userValues
      .map((row) => row.value)
      .filter((value): value is Value => Boolean(value))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      values: values.map(toValuePublic),
      goalTemplates: goalTemplates.map(toGoalTemplatePublic),
      habitTemplates: habitTemplates.map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        frequency: template.frequency,
        category: template.category,
        iconEmoji: template.iconEmoji,
        sortOrder: template.sortOrder,
      })),
      progress: {
        displayName: user.displayName,
        valueKeys: selectedValues.map((value) => value.key),
        goal: focusGoal
          ? {
              templateId: focusGoal.sourceTemplateId,
              title: focusGoal.title,
              targetAmount: Number(focusGoal.targetAmount),
              iconEmoji: focusGoal.iconEmoji,
            }
          : null,
        goalSkipped: user.onboardingGoalSkipped,
        habitTemplateIds: userHabits.map((habit) => habit.sourceTemplateId),
        currentStep: resolveOnboardingStep(
          user,
          selectedValues.length,
          Boolean(focusGoal),
        ),
        onboardingStatus: user.onboardingStatus,
      },
    };
  }

  async saveValues(
    userId: string,
    input: SaveOnboardingValuesInput,
  ): Promise<OnboardingContentResponse> {
    const uniqueKeys = [...new Set(input.valueKeys)];
    const values = await this.valuesRepo.find({
      where: { key: In(uniqueKeys) },
    });
    if (values.length !== uniqueKeys.length) {
      throw new BadRequestException(
        "One of those values isn't on our list — pick from the cards on the screen.",
      );
    }

    await this.userValuesRepo.manager.transaction(async (manager) => {
      await manager.delete(UserValue, { userId });
      await manager.save(
        UserValue,
        values.map((value) =>
          manager.create(UserValue, { userId, valueId: value.id }),
        ),
      );
      await this.markInProgress(manager, userId);
    });

    return this.getContent(userId);
  }

  async saveGoal(
    userId: string,
    input: SaveOnboardingGoalInput,
  ): Promise<OnboardingContentResponse> {
    if ('skip' in input) {
      await this.userGoalsRepo.manager.transaction(async (manager) => {
        const user = await manager.findOne(User, {
          where: { id: userId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!user) {
          throw new BadRequestException("We couldn't find that account.");
        }
        await manager.update(
          UserGoal,
          { userId, isFocus: true },
          { isFocus: false, isActive: false },
        );
        await manager.update(
          User,
          { id: userId },
          { onboardingGoalSkipped: true },
        );
        await this.markInProgress(manager, userId);
      });
      return this.getContent(userId);
    }
    await this.goalCreationService.create(userId, input, {
      markOnboardingProgress: true,
      replaceFocus: true,
    });

    return this.getContent(userId);
  }

  async saveHabits(
    userId: string,
    input: SaveOnboardingHabitsInput,
  ): Promise<OnboardingContentResponse> {
    const uniqueIds = [...new Set(input.templateIds)];
    const templates =
      uniqueIds.length === 0
        ? []
        : await this.habitTemplatesRepo.find({
            where: { id: In(uniqueIds) },
          });
    if (templates.length !== uniqueIds.length) {
      throw new BadRequestException(
        "One of those habits isn't on our list — pick from the cards on the screen.",
      );
    }

    await this.userHabitsRepo.manager.transaction(async (manager) => {
      await manager.update(
        UserHabit,
        { userId, isActive: true },
        { isActive: false },
      );
      for (const template of templates) {
        const existing = await manager.findOne(UserHabit, {
          where: { userId, sourceTemplateId: template.id },
        });
        if (existing) {
          existing.isActive = true;
          await manager.save(existing);
        } else {
          await manager.save(
            UserHabit,
            manager.create(UserHabit, {
              userId,
              sourceTemplateId: template.id,
              isActive: true,
            }),
          );
        }
      }
      await this.markInProgress(manager, userId);
    });

    return this.getContent(userId);
  }

  async complete(userId: string) {
    const content = await this.getContent(userId);
    if (
      !content.progress.displayName ||
      content.progress.valueKeys.length === 0 ||
      (!content.progress.goal && !content.progress.goalSkipped)
    ) {
      throw new BadRequestException(
        'Finish your name, values, and goal choice before we open your dashboard.',
      );
    }

    await this.userGoalsRepo.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new BadRequestException("We couldn't find that account.");
      }
      user.onboardingStatus = OnboardingStatus.COMPLETED;
      user.onboardingCompletedAt ??= new Date();
      await manager.save(user);
    });

    return this.dashboardService.getDashboard(userId);
  }

  private async markInProgress(manager: EntityManager, userId: string) {
    await manager.update(
      User,
      { id: userId, onboardingStatus: OnboardingStatus.NOT_STARTED },
      { onboardingStatus: OnboardingStatus.IN_PROGRESS },
    );
  }
}
