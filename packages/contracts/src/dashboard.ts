import { z } from "zod";
import {
  habitCategoryValues,
  habitFrequencyValues,
  reflectionKindValues,
} from "./enums";
import { valuePublicSchema } from "./onboarding";
import { userPublicSchema } from "./user";
import { communityChallengePublicSchema } from "./membership";

export const userGoalPublicSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  targetAmount: z.number(),
  savedAmount: z.number(),
  remainingAmount: z.number(),
  progressPercent: z.number(),
  sourceTemplateId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  isFocus: z.boolean(),
  isPathwayEligible: z.boolean(),
  iconEmoji: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserGoalPublic = z.infer<typeof userGoalPublicSchema>;

export const userHabitPublicSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  frequency: z.enum(habitFrequencyValues),
  category: z.enum(habitCategoryValues),
  iconEmoji: z.string(),
  isActive: z.boolean(),
  completedToday: z.boolean(),
});

export type UserHabitPublic = z.infer<typeof userHabitPublicSchema>;

export const pathwayProgressPublicSchema = z.object({
  key: z.string(),
  label: z.string(),
  savedAmount: z.number(),
  targetAmount: z.number(),
});

export type PathwayProgressPublic = z.infer<
  typeof pathwayProgressPublicSchema
>;

export const reflectionJourneyPublicSchema = z.object({
  voiceCount: z.number().int().min(0),
  textCount: z.number().int().min(0),
  streakDays: z.number().int().min(0),
  moodTrend: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weekday: z.string(),
      mood: z.number().min(1).max(5).nullable(),
    }),
  ),
  averageMood: z.number().min(1).max(5).nullable(),
  trendDescriptor: z.enum(["Rising", "Stable", "Falling"]).nullable(),
  themes: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      colorToken: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  encouragementLine: z.string().nullable(),
  recent: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.enum(reflectionKindValues),
      excerpt: z.string(),
      dateLabel: z.string(),
      moodScore: z.number().int().min(1).max(5).nullable(),
      durationSeconds: z.number().int().min(0).nullable(),
    }),
  ),
});

export type ReflectionJourneyPublic = z.infer<
  typeof reflectionJourneyPublicSchema
>;

export const dashboardPayloadSchema = z.object({
  user: userPublicSchema,
  displayName: z.string(),
  primaryValue: valuePublicSchema.nullable(),
  values: z.array(valuePublicSchema),
  focusGoal: userGoalPublicSchema.nullable(),
  goals: z.array(userGoalPublicSchema),
  habits: z.array(userHabitPublicSchema),
  communityChallenge: communityChallengePublicSchema.nullable(),
  reflection: reflectionJourneyPublicSchema,
  pathwayProgress: z.array(pathwayProgressPublicSchema),
});

export type DashboardPayload = z.infer<typeof dashboardPayloadSchema>;

export const createSavingsSchema = z.object({
  goalId: z.string().uuid(),
  amount: z
    .number()
    .min(0.01, "Enter an amount of at least $0.01.")
    .multipleOf(0.01, "Use no more than two decimal places.")
    .max(10_000, "A single entry can be up to $10,000."),
  note: z.string().trim().max(200).optional(),
});

export type CreateSavingsInput = z.infer<typeof createSavingsSchema>;

export const savingsEntryPublicSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  amount: z.number(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type SavingsEntryPublic = z.infer<typeof savingsEntryPublicSchema>;

export const createSavingsResponseSchema = z.object({
  entry: savingsEntryPublicSchema,
  goal: userGoalPublicSchema,
});

export type CreateSavingsResponse = z.infer<
  typeof createSavingsResponseSchema
>;

export const habitCompleteResponseSchema = z.object({
  userHabitId: z.string().uuid(),
  completedToday: z.boolean(),
  completedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export type HabitCompleteResponse = z.infer<
  typeof habitCompleteResponseSchema
>;

export const updateHabitsSchema = z.object({ templateIds: z.array(z.string().uuid()) });
export const updateValuesSchema = z.object({ valueKeys: z.array(z.string().trim().min(1).max(100)).min(1, "Pick at least one value to save.") });
export type UpdateHabitsInput = z.infer<typeof updateHabitsSchema>;
export type UpdateValuesInput = z.infer<typeof updateValuesSchema>;

export const updateGoalSchema = z.object({
  isFocus: z.literal(true),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const goalsListResponseSchema = z.object({
  goals: z.array(userGoalPublicSchema),
});

export type GoalsListResponse = z.infer<typeof goalsListResponseSchema>;
