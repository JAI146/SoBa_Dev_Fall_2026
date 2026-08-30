import { OnboardingStep, type OnboardingStepValue, type UserGoalPublic, type ValuePublic } from '@purposemint/contracts';
import { VALUE_HEADLINE_WORDS } from '../database/onboarding-seed-data';
import type { GoalTemplate } from '../entities/goal-template.entity';
import type { User } from '../entities/user.entity';
import type { UserGoal } from '../entities/user-goal.entity';
import type { Value } from '../entities/value.entity';

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toValuePublic(value: Value): ValuePublic {
  return {
    key: value.key,
    label: value.label,
    description: value.description,
    iconName: value.iconName,
    colorToken: value.colorToken,
    headlineWord: VALUE_HEADLINE_WORDS[value.key] ?? value.label.toLowerCase(),
    sortOrder: value.sortOrder,
  };
}

export function toGoalTemplatePublic(template: GoalTemplate) {
  return {
    id: template.id,
    title: template.title,
    valueKey: template.valueKey,
    targetAmount: Number(template.targetAmount),
    isPathwayEligible: template.isPathwayEligible,
    iconEmoji: template.iconEmoji,
    sortOrder: template.sortOrder,
  };
}

export function toUserGoalPublic(goal: UserGoal): UserGoalPublic {
  const targetAmount = Number(goal.targetAmount);
  const savedAmount = Number(goal.savedAmount);
  const remainingAmount = Math.max(0, targetAmount - savedAmount);
  const progressPercent =
    targetAmount > 0
      ? Math.min(100, Math.round((savedAmount / targetAmount) * 100))
      : 0;

  return {
    id: goal.id,
    title: goal.title,
    targetAmount,
    savedAmount,
    remainingAmount,
    progressPercent,
    sourceTemplateId: goal.sourceTemplateId,
    isActive: goal.isActive,
    isFocus: goal.isFocus,
    isPathwayEligible: goal.isPathwayEligible,
    iconEmoji: goal.iconEmoji,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export function resolveOnboardingStep(
  user: User,
  valueCount: number,
  hasGoal: boolean,
): OnboardingStepValue {
  if (!user.displayName) return OnboardingStep.WELCOME;
  if (valueCount === 0) return OnboardingStep.VALUES;
  if (!hasGoal && !user.onboardingGoalSkipped) {
    return OnboardingStep.PURPOSE_MAP;
  }
  return OnboardingStep.HABITS;
}
