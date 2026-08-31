import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OnboardingStatus,
  type CreateGoalInput,
  type UserGoalPublic,
} from '@purposemint/contracts';
import { Repository } from 'typeorm';
import { toUserGoalPublic } from '../common/mappers/onboarding.mapper';
import { GoalTemplate } from '../entities/goal-template.entity';
import { UserGoal } from '../entities/user-goal.entity';
import { UserValue } from '../entities/user-value.entity';
import { User } from '../entities/user.entity';

type CreateGoalOptions = {
  markOnboardingProgress: boolean;
  replaceFocus: boolean;
};

@Injectable()
export class GoalCreationService {
  constructor(
    @InjectRepository(GoalTemplate)
    private readonly goalTemplatesRepo: Repository<GoalTemplate>,
    @InjectRepository(UserGoal)
    private readonly userGoalsRepo: Repository<UserGoal>,
    @InjectRepository(UserValue)
    private readonly userValuesRepo: Repository<UserValue>,
  ) {}

  async create(
    userId: string,
    input: CreateGoalInput,
    options: CreateGoalOptions,
  ): Promise<UserGoalPublic> {
    let title: string;
    let targetAmount: number;
    let isPathwayEligible: boolean;
    let iconEmoji: string;
    let sourceTemplateId: string | null;

    if ('templateId' in input) {
      const template = await this.goalTemplatesRepo.findOne({
        where: { id: input.templateId },
      });
      if (!template) {
        throw new BadRequestException(
          "We couldn't find that savings goal. Pick another, or create your own.",
        );
      }

      const selectedValue = await this.userValuesRepo
        .createQueryBuilder('userValue')
        .innerJoin('userValue.value', 'value')
        .where('userValue.userId = :userId', { userId })
        .andWhere('value.key = :valueKey', { valueKey: template.valueKey })
        .getExists();
      if (!selectedValue) {
        throw new BadRequestException(
          'Pick a goal connected to one of the values you chose.',
        );
      }

      title = template.title;
      targetAmount = Number(template.targetAmount);
      isPathwayEligible = template.isPathwayEligible;
      iconEmoji = template.iconEmoji;
      sourceTemplateId = template.id;
    } else {
      title = input.title;
      targetAmount = input.targetAmount;
      isPathwayEligible = false;
      iconEmoji = '🎯';
      sourceTemplateId = null;
    }

    return this.userGoalsRepo.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException("We couldn't find that account.");
      }
      if (
        !options.markOnboardingProgress &&
        user.onboardingStatus !== OnboardingStatus.COMPLETED
      ) {
        throw new ForbiddenException(
          "Let's finish setting up your account first — you're almost there.",
        );
      }

      const currentFocus = await manager.findOne(UserGoal, {
        where: { userId, isFocus: true, isActive: true },
      });
      const shouldFocus = options.replaceFocus || !currentFocus;
      if (shouldFocus) {
        await manager.update(
          UserGoal,
          { userId, isFocus: true },
          { isFocus: false },
        );
      }

      const goal = await manager.save(
        UserGoal,
        manager.create(UserGoal, {
          userId,
          title,
          targetAmount,
          savedAmount: 0,
          sourceTemplateId,
          isActive: true,
          isFocus: shouldFocus,
          isPathwayEligible,
          iconEmoji,
        }),
      );

      if (options.markOnboardingProgress) {
        await manager.update(
          User,
          { id: userId },
          { onboardingGoalSkipped: false },
        );
        await manager.update(
          User,
          { id: userId, onboardingStatus: OnboardingStatus.NOT_STARTED },
          { onboardingStatus: OnboardingStatus.IN_PROGRESS },
        );
      }

      return toUserGoalPublic(goal);
    });
  }
}
