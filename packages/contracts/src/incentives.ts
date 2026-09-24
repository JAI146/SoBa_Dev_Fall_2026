/**
 * Defines shared incentive request validation and response types for API and dashboard.
 * Covers programs, optional review notes, event rules, filters, balances, and analytics;
 * amounts use integer cents and event evidence remains required.
 */
import { z } from "zod";

export const incentiveCategories = [
  "transportation",
  "home",
  "childcare",
  "education",
  "business",
  "other",
] as const;
export const incentiveEventKinds = [
  "award",
  "distribution",
  "allocation",
  "release",
  "withdrawal",
  "reversal",
] as const;
export const incentiveStatuses = [
  "eligible",
  "not_eligible",
  "earned",
  "distributed",
  "applied",
  "partially_withdrawn",
  "withdrawn",
] as const;
const cents = z.number().int().min(0).max(100_000_000);
const reason = z.string().trim().min(10).max(1000);
const date = z.string().datetime();
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Use a valid calendar date.");
export const incentiveProgramCreateSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    amountCents: cents.refine((value) => value > 0),
    eligibilityDescription: reason,
  })
  .strict();
export type IncentiveProgramCreate = z.infer<
  typeof incentiveProgramCreateSchema
>;
export const incentiveProgramInputSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    amountCents: cents.refine((v) => v > 0),
    active: z.boolean(),
    rulesProvisional: z.boolean(),
    eligibilityDescription: reason,
    version: z.number().int().positive(),
  })
  .strict()
  .refine((v) => !v.active || !v.rulesProvisional, {
    message: "Review the provisional rules before activating this program.",
    path: ["active"],
  });
export const incentiveProgramSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  amountCents: cents,
  currency: z.literal("USD"),
  active: z.boolean(),
  rulesProvisional: z.boolean(),
  eligibilityMode: z.literal("staff_review"),
  eligibilityDescription: z.string(),
  version: z.number().int(),
});
export const incentiveProgramsSchema = z.array(incentiveProgramSchema);
export const incentiveReviewSchema = z
  .object({
    programId: z.string().uuid(),
    userId: z.string().uuid(),
    eligible: z.boolean(),
    reason: z.string().trim().max(1000).default(""),
  })
  .strict();
export const incentiveEventInputSchema = z
  .object({
    kind: z.enum(incentiveEventKinds),
    amountCents: cents.refine((v) => v > 0),
    goalId: z.string().uuid().optional(),
    category: z.enum(incentiveCategories).optional(),
    reversesEventId: z.string().uuid().optional(),
    reason,
    reference: z.string().trim().min(3).max(160),
    idempotencyKey: z.string().uuid(),
    occurredAt: date,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (["allocation", "release"].includes(v.kind) && !v.goalId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["goalId"],
        message: "Select a goal.",
      });
    if (v.goalId && !v.category)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "Select the allocation category.",
      });
    if (v.kind === "reversal" && !v.reversesEventId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reversesEventId"],
        message: "Select the event to reverse.",
      });
    if (v.kind !== "reversal" && v.reversesEventId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reversesEventId"],
        message: "Only reversals reference an earlier event.",
      });
    if (["award", "distribution", "reversal"].includes(v.kind) && v.goalId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["goalId"],
        message: "This event does not accept a goal.",
      });
    if (!v.goalId && v.category)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "A category requires a goal.",
      });
  });
export const incentiveQuerySchema = z
  .object({
    programId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    search: z.string().trim().max(100).optional(),
    status: z.enum(incentiveStatuses).optional(),
    from: calendarDate.optional(),
    to: calendarDate.optional(),
    metric: z
      .enum([
        "eligible",
        "earned",
        "distributed",
        "allocated",
        "withdrawn",
        "remaining",
      ])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "End date must follow start date.",
    path: ["to"],
  });
export const incentiveBenefitSchema = z.object({
  id: z.string().uuid(),
  programId: z.string().uuid(),
  programName: z.string(),
  userId: z.string().uuid(),
  userName: z.string(),
  email: z.string(),
  eligible: z.boolean(),
  eligibilityReason: z.string(),
  ruleSnapshot: z.string(),
  programVersion: z.number(),
  amountCents: cents,
  reviewedAt: date,
  earnedAt: date.nullable(),
  receivedAt: date.nullable(),
  status: z.enum(incentiveStatuses),
  earnedCents: cents,
  distributedCents: cents,
  allocatedCents: cents,
  withdrawnCents: cents,
  remainingCents: cents,
  unallocatedCents: cents,
  hasReceived: z.boolean(),
  withdrawalStatus: z.enum(["recorded", "not_confirmed"]),
  goalTitles: z.array(z.string()),
});
export const incentiveBenefitsSchema = z.object({
  items: z.array(incentiveBenefitSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});
export const incentiveEventSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  amountCents: cents,
  reason: z.string(),
  reference: z.string(),
  occurredAt: date,
  recordedAt: date,
  actorUserId: z.string().uuid(),
  goalId: z.string().uuid().nullable(),
  goalTitle: z.string().nullable(),
  category: z.enum(incentiveCategories).nullable(),
  reversesEventId: z.string().uuid().nullable(),
  source: z.literal("staff_recorded"),
});
export const incentiveDetailSchema = z.object({
  benefit: incentiveBenefitSchema,
  events: z.array(incentiveEventSchema),
  goals: z.array(z.object({ id: z.string().uuid(), title: z.string() })),
  allocations: z.array(
    z.object({
      goalId: z.string().uuid(),
      category: z.enum(incentiveCategories),
      amountCents: cents,
    }),
  ),
});
export const incentiveAnalyticsSchema = z.object({
  eligibleUsers: z.number(),
  earnedCount: z.number(),
  earnedCents: z.number(),
  distributedCents: z.number(),
  allocatedCents: z.number(),
  withdrawnCents: z.number(),
  remainingCents: z.number(),
  categories: z.array(
    z.object({
      category: z.enum(incentiveCategories),
      amountCents: z.number(),
    }),
  ),
  activity: z.array(
    z.object({
      date: z.string(),
      earnedCents: z.number(),
      distributedCents: z.number(),
    }),
  ),
});
export type IncentiveProgram = z.infer<typeof incentiveProgramSchema>;
export type IncentiveProgramInput = z.infer<typeof incentiveProgramInputSchema>;
export type IncentiveReview = z.infer<typeof incentiveReviewSchema>;
export type IncentiveEventInput = z.infer<typeof incentiveEventInputSchema>;
export type IncentiveQuery = z.infer<typeof incentiveQuerySchema>;
export type IncentiveBenefit = z.infer<typeof incentiveBenefitSchema>;
export type IncentiveDetail = z.infer<typeof incentiveDetailSchema>;
