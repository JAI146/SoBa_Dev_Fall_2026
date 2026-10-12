import { z } from "zod";
import {
  billingCycleValues,
  planKeySchema,
  promotionSchema,
  planEntitlementsSchema,
  planLimitsSchema,
  billingTermsSchema,
  subscriptionStatusValues,
} from "./subscription-management";

export const subscriptionPlanPublicSchema = z.object({
  key: planKeySchema,
  name: z.string(),
  tagline: z.string(),
  priceMonthly: z.number().min(0),
  priceYearly: z.number().min(0).nullable().optional(),
  billingCycles: z.array(z.enum(billingCycleValues)).optional(),
  promotion: promotionSchema.nullable().optional(),
  badge: z.string().nullable(),
  description: z.string(),
  features: z.array(z.string()),
  ctaLabel: z.string(),
  sortOrder: z.number().int().min(0),
});
export const subscriptionPlansResponseSchema = z.object({
  plans: z.array(subscriptionPlanPublicSchema),
  currentPlanKey: planKeySchema,
  currentSubscription: z.object({
    planKey: planKeySchema,
    planName: z.string(),
    status: z.enum(subscriptionStatusValues),
    billing: billingTermsSchema,
    entitlements: planEntitlementsSchema,
    limits: planLimitsSchema,
  }),
});
export const createUpgradeIntentSchema = z.object({
  planKey: planKeySchema,
});
export const upgradeIntentResponseSchema = z.object({
  planKey: planKeySchema,
  planName: z.string(),
  alreadyRecorded: z.boolean(),
  message: z.string(),
});

export const challengeViewerStateValues = [
  "read_only",
  "eligible",
  "joined",
] as const;
export const communityChallengePublicSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  monthLabel: z.string(),
  title: z.string(),
  description: z.string(),
  participantCount: z.number().int().min(0),
  completedPercent: z.number().min(0).max(100),
  viewerState: z.enum(challengeViewerStateValues),
  joinedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});
export const joinChallengeResponseSchema = z.object({
  challengeId: z.string().uuid(),
  joinedAt: z.string().datetime(),
  alreadyJoined: z.boolean(),
  message: z.string(),
});

export type SubscriptionPlanPublic = z.infer<
  typeof subscriptionPlanPublicSchema
>;
export type SubscriptionPlansResponse = z.infer<
  typeof subscriptionPlansResponseSchema
>;
export type CreateUpgradeIntentInput = z.infer<
  typeof createUpgradeIntentSchema
>;
export type UpgradeIntentResponse = z.infer<typeof upgradeIntentResponseSchema>;
export type CommunityChallengePublic = z.infer<
  typeof communityChallengePublicSchema
>;
export type ChallengeViewerState = z.infer<
  typeof communityChallengePublicSchema.shape.viewerState
>;
export type JoinChallengeResponse = z.infer<typeof joinChallengeResponseSchema>;
