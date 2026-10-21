import { z } from "zod";
import { healthStatusSchema } from "./system-health";
import { notificationStatusSchema } from "./notifications";
export const coachingEventSchema = z.enum([
  "goal_checkin",
  "habit_checkin",
  "savings_guidance",
  "weekly_review",
  "re_engagement",
  "unknown_event",
]);
export const coachingGenerationSchema = z.enum([
  "pending",
  "generated",
  "failed",
  "blocked",
]);
export const coachingErrorSchema = z.enum([
  "provider_unavailable",
  "generation_failed",
  "delivery_failed",
  "timeout",
  "unknown_error",
]);
export const coachingFlagSchema = z.enum([
  "review_required",
  "content_filtered",
  "rate_limited",
]);
export const coachingSourceSchema = z.enum([
  "provider_event",
  "development_sample",
]);
// Closed metadata fields only: no prompt, response, user or conversation payloads.
export const coachingOperationSchema = z
  .object({
    id: z.string().uuid(),
    eventType: coachingEventSchema,
    generationStatus: coachingGenerationSchema,
    deliveryStatus: notificationStatusSchema,
    errorCode: coachingErrorSchema.nullable(),
    safetyFlags: z.array(coachingFlagSchema).max(3),
    source: coachingSourceSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const coachingOperationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    eventType: coachingEventSchema.optional(),
    generationStatus: coachingGenerationSchema.optional(),
    deliveryStatus: notificationStatusSchema.optional(),
    safetyFlag: coachingFlagSchema.optional(),
    source: coachingSourceSchema.optional(),
  })
  .strict();
export const coachingOperationsResponseSchema = z.object({
  items: z.array(coachingOperationSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.literal(20),
  counts: z.object({
    total: z.number().int(),
    generated: z.number().int(),
    failed: z.number().int(),
    reviewRequired: z.number().int(),
  }),
  service: z.object({
    status: healthStatusSchema,
    source: z.enum(["not_monitored", "staff_report"]),
    checkedAt: z.string().datetime().nullable(),
    stale: z.boolean(),
  }),
  integrationAvailable: z.literal(false),
});
export type CoachingOperationPublic = z.infer<typeof coachingOperationSchema>;
export type CoachingOperationsQuery = z.infer<
  typeof coachingOperationsQuerySchema
>;
