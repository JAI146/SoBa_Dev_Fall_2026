import { z } from "zod";
import type {
  HabitCategoryValue,
  HabitFrequencyValue,
} from "./enums";
import type { ValuePublic } from "./onboarding";
import type { UserPublic } from "./user";

export interface UserGoalPublic {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  remainingAmount: number;
  progressPercent: number;
  sourceTemplateId: string | null;
  isActive: boolean;
  isFocus: boolean;
  isPathwayEligible: boolean;
  iconEmoji: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserHabitPublic {
  id: string;
  templateId: string;
  title: string;
  description: string;
  frequency: HabitFrequencyValue;
  category: HabitCategoryValue;
  iconEmoji: string;
  isActive: boolean;
  completedToday: boolean;
}

export interface CommunityChallengePublic {
  monthLabel: string;
  title: string;
  description: string;
  participantCount: number;
  completedPercent: number;
}

export interface PathwayProgressPublic {
  key: string;
  label: string;
  savedAmount: number;
  targetAmount: number;
}

export interface ReflectionJourneyPublic {
  voiceCount: number;
  textCount: number;
  streakDays: number;
  moodTrend: Array<{ weekday: string; mood: number | null }>;
  averageMood: number | null;
  themes: Array<{ label: string; count: number }>;
  recent: Array<{ id: string; excerpt: string; dateLabel: string }>;
}

export interface DashboardPayload {
  user: UserPublic;
  displayName: string;
  primaryValue: ValuePublic | null;
  values: ValuePublic[];
  focusGoal: UserGoalPublic | null;
  goals: UserGoalPublic[];
  habits: UserHabitPublic[];
  communityChallenge: CommunityChallengePublic;
  reflection: ReflectionJourneyPublic;
  pathwayProgress: PathwayProgressPublic[];
}

export const createSavingsSchema = z.object({
  goalId: z.string().uuid(),
  amount: z
    .number()
    .positive("Enter an amount greater than zero.")
    .max(10_000, "A single entry can be up to $10,000."),
  note: z.string().trim().max(200).optional(),
});

export type CreateSavingsInput = z.infer<typeof createSavingsSchema>;

export interface SavingsEntryPublic {
  id: string;
  goalId: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface CreateSavingsResponse {
  entry: SavingsEntryPublic;
  goal: UserGoalPublic;
}

export interface HabitCompleteResponse {
  userHabitId: string;
  completedToday: boolean;
  completedOn: string | null;
}

export const updateGoalSchema = z.object({
  isFocus: z.literal(true),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export interface GoalsListResponse {
  goals: UserGoalPublic[];
}
