import { z } from "zod";
export const subscriptionAdminAccessSchema = z.object({
  canEdit: z.boolean(),
  canManagePlans: z.boolean(),
});
import { paginationQuerySchema } from "./api-error";

export const billingCycleValues = ["monthly", "yearly"] as const;
export const subscriptionStatusValues = [
  "active",
  "past_due",
  "cancelled",
] as const;
export const paymentStatusValues = [
  "not_required",
  "pending",
  "paid",
  "failed",
] as const;
export const planKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[a-z][a-z0-9_-]*$/);
const date = z.string().datetime({ offset: true });
const money = z
  .number()
  .finite()
  .min(0)
  .max(999999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Prices must have at most two decimal places.",
  );
export const planEntitlementsSchema = z
  .object({
    pathways: z.boolean(),
    communityChallenges: z.boolean(),
  })
  .strict();
export const planLimitsSchema = z
  .object({
    pathwayApplications: z.number().int().min(1).max(1000000).nullable(),
    challengeParticipations: z.number().int().min(1).max(1000000).nullable(),
  })
  .strict();
export const subscriptionCapabilitiesSchema = z.array(
  z.object({
    key: z.enum(["pathways", "communityChallenges"]),
    name: z.string(),
    description: z.string(),
    limitKey: z.enum(["pathwayApplications", "challengeParticipations"]),
  }),
);
export const promotionSchema = z
  .object({
    monthlyPrice: money.nullable(),
    yearlyPrice: money.nullable(),
    startsAt: date,
    endsAt: date,
  })
  .strict();
const planFields = z
  .object({
    key: planKeySchema,
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(500),
    tagline: z.string().trim().max(200),
    badge: z.string().trim().max(100).nullable(),
    ctaLabel: z.string().trim().min(1).max(100),
    priceMonthly: money,
    priceYearly: money.nullable(),
    billingCycles: z.array(z.enum(billingCycleValues)).min(1).max(2),
    features: z.array(z.string().trim().min(1).max(200)).max(30),
    entitlements: planEntitlementsSchema,
    limits: planLimitsSchema,
    active: z.boolean(),
    isDefault: z.boolean(),
    available: z.boolean(),
    availableFrom: date.nullable(),
    availableUntil: date.nullable(),
    sortOrder: z.number().int().min(0).max(1000000),
    promotion: promotionSchema.nullable(),
  })
  .strict();
export const adminPlanInputSchema = planFields.superRefine((plan, ctx) => {
  const error = (path: string[], message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  if (
    plan.isDefault &&
    (!plan.active ||
      !plan.available ||
      !plan.billingCycles.includes("monthly") ||
      plan.priceMonthly !== 0 ||
      plan.availableFrom ||
      plan.availableUntil ||
      plan.promotion)
  )
    error(
      ["isDefault"],
      "The default plan must be active, always available, and offer free monthly billing without promotions.",
    );
  if (new Set(plan.billingCycles).size !== plan.billingCycles.length)
    error(["billingCycles"], "Billing cycles must be unique.");
  if (plan.billingCycles.includes("yearly") && plan.priceYearly === null)
    error(["priceYearly"], "Set a yearly price for yearly billing.");
  if (
    plan.availableFrom &&
    plan.availableUntil &&
    Date.parse(plan.availableFrom) >= Date.parse(plan.availableUntil)
  )
    error(["availableUntil"], "Availability must end after it starts.");
  if (!plan.entitlements.pathways && plan.limits.pathwayApplications !== null)
    error(
      ["limits", "pathwayApplications"],
      "Enable Pathways before configuring its limit.",
    );
  if (
    !plan.entitlements.communityChallenges &&
    plan.limits.challengeParticipations !== null
  )
    error(
      ["limits", "challengeParticipations"],
      "Enable community challenges before configuring its limit.",
    );
  if (plan.promotion) {
    const p = plan.promotion;
    if (Date.parse(p.startsAt) >= Date.parse(p.endsAt))
      error(["promotion", "endsAt"], "Promotion must end after it starts.");
    if (p.monthlyPrice === null && p.yearlyPrice === null)
      error(["promotion"], "Set at least one promotional price.");
    for (const cycle of billingCycleValues) {
      const price = cycle === "monthly" ? p.monthlyPrice : p.yearlyPrice;
      const regular =
        cycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
      if (
        price !== null &&
        (!plan.billingCycles.includes(cycle) ||
          regular === null ||
          price > regular)
      )
        error(
          ["promotion", cycle === "monthly" ? "monthlyPrice" : "yearlyPrice"],
          "Promotional prices require an enabled cycle and cannot exceed the regular price.",
        );
    }
  }
});
export const adminPlanSchema = planFields.extend({
  version: z.number().int().positive(),
});
export const adminPlanUpdateSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    plan: adminPlanInputSchema,
  })
  .strict();
export const adminPlansQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  active: z.enum(["true", "false"]).optional(),
});
const pageFields = {
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
};
export const adminPlansResponseSchema = z.object({
  items: z.array(adminPlanSchema),
  ...pageFields,
});
export const billingTermsSchema = z.object({
  planKey: planKeySchema,
  planName: z.string(),
  planVersion: z.number().int().positive(),
  cycle: z.enum(billingCycleValues),
  currency: z.literal("USD"),
  amountCents: z.number().int().nonnegative(),
  regularAmountCents: z.number().int().nonnegative(),
  promotionEndsAt: date.nullable(),
});
export const pendingSubscriptionChangeSchema = z.object({
  action: z.enum(["change", "cancel"]),
  effectiveAt: date,
  authorizedBy: z.string().uuid(),
  terms: billingTermsSchema.nullable(),
});
export const adminSubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  userEmail: z.string(),
  planKey: planKeySchema,
  planName: z.string(),
  status: z.enum(subscriptionStatusValues),
  billing: billingTermsSchema,
  paymentStatus: z.enum(paymentStatusValues),
  startedAt: date,
  renewalAt: date,
  cancelledAt: date.nullable(),
  pendingChange: pendingSubscriptionChangeSchema.nullable(),
  entitlements: planEntitlementsSchema,
  limits: planLimitsSchema,
  failedPayments: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});
export const adminSubscriptionsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  status: z.enum(subscriptionStatusValues).optional(),
  planKey: planKeySchema.optional(),
});
export const adminSubscriptionsResponseSchema = z.object({
  items: z.array(adminSubscriptionSchema),
  ...pageFields,
});
export const subscriptionHistorySchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  previousPlanKey: planKeySchema.nullable(),
  newPlanKey: planKeySchema.nullable(),
  effectiveAt: date,
  recordedAt: date,
  authorizedBy: z.string().uuid().nullable(),
  previousBilling: billingTermsSchema.nullable(),
  newBilling: billingTermsSchema.nullable(),
});
export const subscriptionBillingRecordSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(paymentStatusValues),
  amountCents: z.number().int().nonnegative(),
  billing: billingTermsSchema,
  periodEndsAt: date,
  occurredAt: date,
  recordedAt: date,
  reference: z.string(),
  note: z.string(),
  authorizedBy: z.string().uuid(),
});
export const adminSubscriptionDetailSchema = z.object({
  subscription: adminSubscriptionSchema,
  history: z.array(subscriptionHistorySchema),
  billingRecords: z.array(subscriptionBillingRecordSchema),
});
export const subscriptionAssignSchema = z
  .object({
    userId: z.string().uuid(),
    expectedPlanVersion: z.number().int().positive(),
    planKey: planKeySchema,
    cycle: z.enum(billingCycleValues),
  })
  .strict();
export const subscriptionChangeSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    expectedPlanVersion: z.number().int().positive(),
    planKey: planKeySchema,
    cycle: z.enum(billingCycleValues),
    timing: z.enum(["immediate", "renewal"]),
  })
  .strict();
export const subscriptionCancelSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    timing: z.enum(["immediate", "renewal"]),
  })
  .strict();
export const subscriptionVersionSchema = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();
export const subscriptionPaymentInputSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    status: z.enum(["paid", "failed"]),
    amountCents: z.number().int().positive().max(99999999),
    reference: z.string().trim().min(1).max(160),
    note: z.string().trim().min(1).max(500),
    occurredAt: date,
  })
  .strict();
export type AdminPlanInput = z.infer<typeof adminPlanInputSchema>;
export type AdminPlan = z.infer<typeof adminPlanSchema>;
export type AdminPlansQuery = z.infer<typeof adminPlansQuerySchema>;
export type AdminSubscriptionsQuery = z.infer<
  typeof adminSubscriptionsQuerySchema
>;
export type AdminSubscription = z.infer<typeof adminSubscriptionSchema>;
export type BillingTerms = z.infer<typeof billingTermsSchema>;
export type PlanEntitlements = z.infer<typeof planEntitlementsSchema>;
export type PlanLimits = z.infer<typeof planLimitsSchema>;
export type PendingSubscriptionChange = z.infer<
  typeof pendingSubscriptionChangeSchema
>;
export type SubscriptionAssignInput = z.infer<typeof subscriptionAssignSchema>;
export type SubscriptionChangeInput = z.infer<typeof subscriptionChangeSchema>;
export type SubscriptionCancelInput = z.infer<typeof subscriptionCancelSchema>;
export type SubscriptionPaymentInput = z.infer<
  typeof subscriptionPaymentInputSchema
>;
export type AdminSubscriptionDetail = z.infer<
  typeof adminSubscriptionDetailSchema
>;
