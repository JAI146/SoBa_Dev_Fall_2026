import { z } from "zod";
import type {
  HabitCategoryValue,
  HabitFrequencyValue,
  OnboardingStatusValue,
} from "./enums";

export interface ValuePublic {
  key: string;
  label: string;
  description: string;
  iconName: string;
  colorToken: string;
  headlineWord: string;
  sortOrder: number;
}

export interface GoalTemplatePublic {
  id: string;
  title: string;
  valueKey: string;
  targetAmount: number;
  isPathwayEligible: boolean;
  iconEmoji: string;
  sortOrder: number;
}

export interface HabitTemplatePublic {
  id: string;
  title: string;
  description: string;
  frequency: HabitFrequencyValue;
  category: HabitCategoryValue;
  iconEmoji: string;
  sortOrder: number;
}

export const OnboardingStep = {
  WELCOME: "welcome",
  VALUES: "values",
  PURPOSE_MAP: "purpose-map",
  HABITS: "habits",
} as const;

export const onboardingStepValues = [
  OnboardingStep.WELCOME,
  OnboardingStep.VALUES,
  OnboardingStep.PURPOSE_MAP,
  OnboardingStep.HABITS,
] as const;

export type OnboardingStepValue =
  (typeof OnboardingStep)[keyof typeof OnboardingStep];

export interface OnboardingGoalProgress {
  templateId: string | null;
  title: string;
  targetAmount: number;
  iconEmoji: string;
}

export interface OnboardingProgress {
  displayName: string | null;
  valueKeys: string[];
  goal: OnboardingGoalProgress | null;
  goalSkipped: boolean;
  habitTemplateIds: string[];
  currentStep: OnboardingStepValue;
  onboardingStatus: OnboardingStatusValue;
}

export interface OnboardingContentResponse {
  values: ValuePublic[];
  goalTemplates: GoalTemplatePublic[];
  habitTemplates: HabitTemplatePublic[];
  progress: OnboardingProgress;
}

export const saveOnboardingValuesSchema = z.object({
  valueKeys: z
    .array(z.string().trim().min(1).max(100))
    .min(1, "Pick at least one value to continue."),
});

export type SaveOnboardingValuesInput = z.infer<
  typeof saveOnboardingValuesSchema
>;

export const saveOnboardingGoalSchema = z.union([
  z
    .object({
      skip: z.literal(true),
    })
    .strict(),
  z
    .object({
      templateId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, "Tell us what you're saving for.")
        .max(50, "Keep the goal name to 50 characters."),
      targetAmount: z
        .number()
        .min(1, "Target amount needs to be at least $1.")
        .max(10_000, "Target amount can be up to $10,000."),
    })
    .strict(),
]);

export type SaveOnboardingGoalInput = z.infer<typeof saveOnboardingGoalSchema>;

export const saveOnboardingHabitsSchema = z.object({
  templateIds: z.array(z.string().uuid()),
});

export type SaveOnboardingHabitsInput = z.infer<
  typeof saveOnboardingHabitsSchema
>;
