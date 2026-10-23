import { z } from "zod";

export const goalHistoryStateSchema = z.object({
  title: z.string(),
  targetAmount: z.number(),
  savedAmount: z.number(),
  isActive: z.boolean(),
  isFocus: z.boolean(),
});

export const goalHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  actorUserId: z.string().uuid().nullable(),
  previous: goalHistoryStateSchema.nullable(),
  current: goalHistoryStateSchema,
  source: z.enum(["customer", "demo"]),
});

export const habitProgressSchema = z.object({
  status: z.enum([
    "active",
    "completed",
    "missed",
    "paused",
    "recovering",
    "inactive",
  ]),
  completedInCurrentPeriod: z.boolean(),
  completionCount: z.number().int().min(0),
  lastCompletedOn: z.string().date().nullable(),
  missedPeriods: z.number().int().min(0).nullable(),
  completedPeriods: z.number().int().min(0),
  eligiblePeriods: z.number().int().min(0).nullable(),
  consistencyPercent: z.number().min(0).max(100).nullable(),
  streak: z.number().int().min(0).nullable(),
  streakUnit: z.enum(["days", "weeks"]).nullable(),
  windowStart: z.string().date(),
  windowEnd: z.string().date(),
  // Legacy selection/pause history is not available before audit tracking.
  historyLimited: z.boolean(),
});

export const habitPauseSchema = z.object({ paused: z.boolean() });
export const habitPauseResponseSchema = z.object({
  userHabitId: z.string().uuid(),
  isPaused: z.boolean(),
});
export type HabitPauseInput = z.infer<typeof habitPauseSchema>;
export type HabitProgress = z.infer<typeof habitProgressSchema>;
export type GoalHistoryState = z.infer<typeof goalHistoryStateSchema>;

export const consistencyRatingSchema = z.enum([
  "green",
  "yellow",
  "red",
  "unavailable",
]);
export const savingsPeriodSchema = z.object({
  start: z.string().date(),
  end: z.string().date(),
  amount: z.number().min(0),
  cumulativeRecorded: z.number().min(0),
  contributionCount: z.number().int().min(0),
  status: z.enum(["contributed", "missed", "in_progress", "partial"]),
  eligible: z.boolean(),
});
export const savingsConsistencySchema = z.object({
  periods: z.array(savingsPeriodSchema),
  eligiblePeriods: z.number().int().min(0),
  contributedPeriods: z.number().int().min(0),
  missedPeriods: z.number().int().min(0),
  percent: z.number().min(0).max(100).nullable(),
  rating: consistencyRatingSchema,
});
export const goalSavingsProgressSchema = z.object({
  goalId: z.string().uuid(),
  recordedAmount: z.number().min(0),
  recordedCount: z.number().int().min(0),
  displayedSavedAmount: z.number(),
  weekly: savingsConsistencySchema,
  monthly: savingsConsistencySchema,
});
export const overallUserProgressSchema = z.object({
  goalProgressPercent: z.number().min(0).max(100).nullable(),
  activeSavedAmount: z.number(),
  activeTargetAmount: z.number(),
  weeklySavingsRating: consistencyRatingSchema,
  monthlySavingsRating: consistencyRatingSchema,
  weeklySavingsPercent: z.number().min(0).max(100).nullable(),
  monthlySavingsPercent: z.number().min(0).max(100).nullable(),
  habitConsistencyPercent: z.number().min(0).max(100).nullable(),
});
export type SavingsConsistency = z.infer<typeof savingsConsistencySchema>;
export type GoalSavingsProgress = z.infer<typeof goalSavingsProgressSchema>;
export type OverallUserProgress = z.infer<typeof overallUserProgressSchema>;
