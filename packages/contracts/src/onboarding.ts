import { z } from "zod";
import {
  habitCategoryValues,
  habitFrequencyValues,
  onboardingStatusValues,
} from "./enums";

export const valuePublicSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  iconName: z.string(),
  colorToken: z.string(),
  headlineWord: z.string(),
  sortOrder: z.number().int(),
});

export type ValuePublic = z.infer<typeof valuePublicSchema>;

export const goalTemplatePublicSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  valueKey: z.string(),
  targetAmount: z.number(),
  isPathwayEligible: z.boolean(),
  iconEmoji: z.string(),
  sortOrder: z.number().int(),
});

export type GoalTemplatePublic = z.infer<typeof goalTemplatePublicSchema>;

export const habitTemplatePublicSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  frequency: z.enum(habitFrequencyValues),
  category: z.enum(habitCategoryValues),
  iconEmoji: z.string(),
  sortOrder: z.number().int(),
});

export type HabitTemplatePublic = z.infer<typeof habitTemplatePublicSchema>;

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

export const onboardingStepSchema = z.enum(onboardingStepValues);

export const onboardingGoalProgressSchema = z.object({
  templateId: z.string().uuid().nullable(),
  title: z.string(),
  targetAmount: z.number(),
  iconEmoji: z.string(),
});

export type OnboardingGoalProgress = z.infer<
  typeof onboardingGoalProgressSchema
>;

export const onboardingProgressSchema = z.object({
  displayName: z.string().nullable(),
  valueKeys: z.array(z.string()),
  goal: onboardingGoalProgressSchema.nullable(),
  goalSkipped: z.boolean(),
  habitTemplateIds: z.array(z.string().uuid()),
  currentStep: onboardingStepSchema,
  onboardingStatus: z.enum(onboardingStatusValues),
});

export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;

export const onboardingContentResponseSchema = z.object({
  values: z.array(valuePublicSchema),
  goalTemplates: z.array(goalTemplatePublicSchema),
  habitTemplates: z.array(habitTemplatePublicSchema),
  progress: onboardingProgressSchema,
});

export type OnboardingContentResponse = z.infer<
  typeof onboardingContentResponseSchema
>;

export const saveOnboardingValuesSchema = z.object({
  valueKeys: z
    .array(z.string().trim().min(1).max(100))
    .min(1, "Pick at least one value to continue."),
});

export type SaveOnboardingValuesInput = z.infer<
  typeof saveOnboardingValuesSchema
>;

export const goalTemplateSelectionSchema = z
  .object({
    templateId: z.string().uuid(),
  })
  .strict();

export const customGoalSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Tell us what you're saving for.")
      .max(50, "Keep the goal name to 50 characters."),
    targetAmount: z
      .number()
      .min(1, "Target amount needs to be at least $1.")
      .multipleOf(0.01, "Use no more than two decimal places.")
      .max(10_000, "Target amount can be up to $10,000."),
  })
  .strict();

export const createGoalSchema = z.union([
  goalTemplateSelectionSchema,
  customGoalSchema,
]);

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const saveOnboardingGoalSchema = z.union([
  z.object({ skip: z.literal(true) }).strict(),
  goalTemplateSelectionSchema,
  customGoalSchema,
]);

export type SaveOnboardingGoalInput = z.infer<typeof saveOnboardingGoalSchema>;

export const saveOnboardingHabitsSchema = z.object({
  templateIds: z.array(z.string().uuid()),
});

export type SaveOnboardingHabitsInput = z.infer<
  typeof saveOnboardingHabitsSchema
>;
