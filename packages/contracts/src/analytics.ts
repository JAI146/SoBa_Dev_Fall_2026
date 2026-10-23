import { z } from "zod";
import { adminCountGroupSchema } from "./admin";

/** Reporting windows offered by the analytics workspace, in days. */
export const analyticsWindowDaysValues = [30, 90, 180] as const;
export type AnalyticsWindowDays = (typeof analyticsWindowDaysValues)[number];

const count = z.number().int().min(0);
const rate = z.number().min(0).max(100);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Longest custom range, counting both the start and end day. */
export const ANALYTICS_MAX_RANGE_DAYS = 365;
export const DEFAULT_ANALYTICS_WINDOW_DAYS: AnalyticsWindowDays = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's calendar date in UTC, the timezone every analytics range uses. */
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Days from `from` to `to`, counting both ends. */
export function inclusiveDays(from: string, to: string): number {
  return (
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        DAY_MS,
    ) + 1
  );
}

const calendarDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
      utcToday(new Date(`${value}T00:00:00Z`)) === value,
    "That date does not exist.",
  );

/**
 * The reporting range. A preset is the last 30, 90 or 180 days up to now; a
 * custom range runs from the start of `from` to the end of `to`, in UTC.
 */
export type AnalyticsRange = {
  kind: "preset" | "custom";
  /** Days covered: the preset length, or the custom span counting both ends. */
  days: number;
  /** Set for custom ranges only (YYYY-MM-DD, UTC). */
  from: string | null;
  to: string | null;
};

/**
 * Accepts `?days=30|90|180` (old links keep working) or `?from=&to=`, never
 * both. Custom ranges must start on or before they end, end no later than
 * today (UTC) and span at most 365 days.
 */
export const adminAnalyticsQuerySchema = z
  .object({
    days: z.coerce
      .number()
      .int()
      .refine(
        (value): value is AnalyticsWindowDays =>
          (analyticsWindowDaysValues as readonly number[]).includes(value),
        { message: "Choose a 30, 90 or 180 day window." },
      )
      .optional(),
    from: calendarDay.optional(),
    to: calendarDay.optional(),
  })
  .superRefine((query, ctx) => {
    const custom = query.from !== undefined || query.to !== undefined;
    if (custom && query.days !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days"],
        message: "Use either days or a from and to date, not both.",
      });
    }
    if (custom && (query.from === undefined || query.to === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [query.from === undefined ? "from" : "to"],
        message: "Choose both a start date and an end date.",
      });
      return;
    }
    if (query.from === undefined || query.to === undefined) return;
    if (query.from > query.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "The start date must be on or before the end date.",
      });
    }
    if (query.to > utcToday()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "The end date cannot be in the future.",
      });
    }
    if (inclusiveDays(query.from, query.to) > ANALYTICS_MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: `Choose a range of ${ANALYTICS_MAX_RANGE_DAYS} days or fewer.`,
      });
    }
  })
  .transform((query): AnalyticsRange =>
    query.from !== undefined && query.to !== undefined
      ? {
          kind: "custom",
          from: query.from,
          to: query.to,
          days: inclusiveDays(query.from, query.to),
        }
      : {
          kind: "preset",
          days: query.days ?? DEFAULT_ANALYTICS_WINDOW_DAYS,
          from: null,
          to: null,
        },
  );

/** The query string for a range, as the pages and the API both read it. */
export function analyticsRangeQuery(range: AnalyticsRange): string {
  return range.from && range.to
    ? `from=${range.from}&to=${range.to}`
    : `days=${range.days}`;
}

/** Effective analytics access for the signed-in staff member. */
export const adminAnalyticsAccessSchema = z.object({
  canView: z.boolean(),
  canExport: z.boolean(),
});

export const adminAcquisitionSchema = z.object({
  totalCustomers: count,
  newCustomers: count,
  /** New customers in the equal-length window immediately before this one. */
  previousPeriodNewCustomers: count,
  /** Share of this window's new customers who verified their email. */
  emailVerifiedRate: rate,
  /** Weekly signups (UTC weeks starting Monday), zero-filled across the window. */
  weekly: z.array(z.object({ weekStart: isoDay, count })),
  byStatus: z.array(adminCountGroupSchema),
});

/**
 * Activation covers customers who signed up inside the window. A customer is
 * activated once onboarding is complete and they have logged a savings entry
 * or a habit completion.
 */
export const adminActivationSchema = z.object({
  cohortSize: count,
  activated: count,
  activationRate: rate,
  /** Null when nobody in the cohort has completed onboarding. */
  medianDaysToOnboarding: z.number().min(0).nullable(),
  /** Independent first actions; a customer can reach any of them in any order. */
  milestones: z.array(adminCountGroupSchema),
});

/**
 * Drop off for the same cohort. Funnel stages are cumulative: each stage only
 * counts customers who also reached every earlier stage.
 */
export const adminDropOffSchema = z.object({
  funnel: z.array(adminCountGroupSchema),
  onboardingStatus: z.array(adminCountGroupSchema),
  /** Onboarded customers with no activity in the trailing inactivity window. */
  lapsed: z.object({
    onboardedCustomers: count,
    inactiveCustomers: count,
    inactiveWindowDays: z.number().int().positive(),
  }),
  deletionRequested: count,
});

export const adminUserAnalyticsResponseSchema = z.object({
  windowDays: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  acquisition: adminAcquisitionSchema,
  activation: adminActivationSchema,
  dropOff: adminDropOffSchema,
});

const money = z.number().min(0);

/**
 * Savings over the window in UTC weeks. `cumulative` is the running total of
 * every customer's savings, starting from `startingTotal` saved before the
 * window opened.
 */
export const adminSavingsProgressionSchema = z.object({
  totalSaved: money,
  startingTotal: money,
  savedInWindow: money,
  saversInWindow: count,
  weekly: z.array(
    z.object({ weekStart: isoDay, amount: money, cumulative: money }),
  ),
});

/**
 * Current snapshot of active goals by share of target saved. Goals have no
 * completion history, so this is not limited to the window.
 */
export const adminGoalProgressionSchema = z.object({
  activeGoals: count,
  reachedTarget: count,
  buckets: z.array(adminCountGroupSchema),
});

const habitPeriodSchema = z.object({
  /** Check-ins that met the schedule (or habits used, for as-needed habits). */
  completed: z.number().min(0),
  /** Check-ins the schedule called for (or active habits, for as-needed). */
  expected: z.number().min(0),
  rate,
});

/**
 * Daily habits expect one check-in per day and weekly habits one per seven
 * days, counted from when the habit was added. As-needed habits have no
 * schedule, so their rate is the share used at least once in the period.
 */
export const adminHabitConsistencySchema = z.object({
  byFrequency: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      activeHabits: count,
      last7Days: habitPeriodSchema,
      last30Days: habitPeriodSchema,
    }),
  ),
});

/** Same counts as the progress levels report, plus where assignments came from. */
export const adminLevelDistributionSchema = z.object({
  levels: z.array(z.object({ level: z.number().int().min(1).max(5), count })),
  unassignedCount: count,
  sources: z.object({ mock: count, calculated: count, manual: count }),
});

export const adminWellnessAnalyticsResponseSchema = z.object({
  windowDays: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  savings: adminSavingsProgressionSchema,
  goals: adminGoalProgressionSchema,
  habits: adminHabitConsistencySchema,
  levels: adminLevelDistributionSchema,
});

/** Applications started in the window, by status and by pathway. */
export const adminApplicationAnalyticsSchema = z.object({
  total: count,
  byStatus: z.array(adminCountGroupSchema),
  byPathway: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      draft: count,
      submitted: count,
    }),
  ),
});

/** Checklist progress for the same applications. */
export const adminChecklistAnalyticsSchema = z.object({
  applications: count,
  fullyComplete: count,
  /** Mean share of checklist items complete per application. */
  averageProgress: rate,
});

/** Partners chosen on applications started in the window. */
export const adminPartnerAnalyticsSchema = z.object({
  selections: count,
  byPartner: z.array(
    adminCountGroupSchema.extend({
      partnerType: z.string(),
      pathwayKey: z.string(),
    }),
  ),
  byType: z.array(adminCountGroupSchema),
});

/**
 * Current snapshot: customers whose saved amount across active, pathway
 * eligible goals meets each pathway's minimum.
 */
export const adminEligibilityAnalyticsSchema = z.object({
  customersWithEligibleGoals: count,
  byPathway: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      minimumAmount: money,
      eligibleCustomers: count,
    }),
  ),
});

/**
 * Current snapshot of customers on a paid plan: an active or past due
 * subscription billed above zero.
 */
export const adminPremiumAnalyticsSchema = z.object({
  totalCustomers: count,
  paidCustomers: count,
  paidRate: rate,
  /**
   * Moves to a paid plan inside the window: free to paid upgrades and plan
   * changes, plus paid subscriptions newly assigned by staff. Legacy imports
   * are excluded. Matches the commercial `conversions.freeToPaid` figure.
   */
  newPaidInWindow: count,
  byPlan: z.array(adminCountGroupSchema.extend({ priceMonthly: money })),
});

export const adminPathwayAnalyticsResponseSchema = z.object({
  windowDays: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  applications: adminApplicationAnalyticsSchema,
  checklist: adminChecklistAnalyticsSchema,
  partners: adminPartnerAnalyticsSchema,
  eligibility: adminEligibilityAnalyticsSchema,
  premium: adminPremiumAnalyticsSchema,
  /**
   * True when any customer holds a mock level assignment, meaning the demo
   * seed is loaded. The page uses it to warn that seeded savings are low.
   */
  demoLevelsPresent: z.boolean(),
});

/**
 * Moves from a free (or no) plan to one billed above zero, by upgrade,
 * assignment or plan change, effective inside the window.
 */
export const adminConversionAnalyticsSchema = z.object({
  freeToPaid: count,
  byPlan: z.array(adminCountGroupSchema),
  byAction: z.array(adminCountGroupSchema),
});

/** Upgrade intents recorded in the window and whether the customer now pays. */
export const adminIntentAnalyticsSchema = z.object({
  intents: count,
  convertedToPaid: count,
  /** Converted customers whose paid plan is the plan they asked about. */
  matchedPlan: count,
  conversionRate: rate,
  byPlan: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      intents: count,
      converted: count,
    }),
  ),
});

/** Cancellations effective in the window and cancellations scheduled in it. */
export const adminCancellationAnalyticsSchema = z.object({
  cancelled: count,
  scheduled: count,
  /** Monthly billing given up by the cancelled subscriptions. */
  cancelledMonthlyAmount: money,
  byPlan: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      cancelled: count,
      scheduled: count,
    }),
  ),
});

/**
 * Billing records in the window, plus subscriptions that are past due or
 * carry failed payments today.
 */
export const adminPaymentAnalyticsSchema = z.object({
  failedRecords: count,
  failedAmount: money,
  paidRecords: count,
  paidAmount: money,
  pastDueSubscriptions: count,
  pastDueMonthlyAmount: money,
  /** Sum of failed payment counts on subscriptions that are not cancelled. */
  openFailedPayments: count,
});

export const adminCommercialAnalyticsResponseSchema = z.object({
  windowDays: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  conversions: adminConversionAnalyticsSchema,
  intents: adminIntentAnalyticsSchema,
  cancellations: adminCancellationAnalyticsSchema,
  payments: adminPaymentAnalyticsSchema,
});

/** Weeks after signup reported for each retention cohort. */
export const retentionWeekValues = [1, 2, 3, 4] as const;

/**
 * Week N runs from day 7N to day 7N + 6 after a customer's signup date (UTC).
 * A cell is available only once that week has fully ended for every customer
 * in the cohort; until then `active` and `rate` are null ("not yet").
 */
export const adminRetentionCellSchema = z.object({
  week: z.number().int().min(1).max(4),
  available: z.boolean(),
  active: count.nullable(),
  rate: rate.nullable(),
});

/** Customers who signed up in one UTC week (starting Monday) of the window. */
export const adminRetentionCohortSchema = z.object({
  weekStart: isoDay,
  size: count,
  cells: z.array(adminRetentionCellSchema),
});

/**
 * Activity means a habit completion, savings entry, reflection or sign-in
 * session on that day.
 */
export const adminRetentionResponseSchema = z.object({
  windowDays: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  overall: z.object({
    totalCustomers: count,
    activeLast7Days: count,
    activeLast7DaysRate: rate,
    activeLast30Days: count,
    activeLast30DaysRate: rate,
  }),
  cohorts: z.array(adminRetentionCohortSchema),
});

/** One CSV export per analytics page. */
export const analyticsReportKeyValues = [
  "users",
  "wellness",
  "pathways",
  "subscriptions",
  "retention",
] as const;
export type AnalyticsReportKey = (typeof analyticsReportKeyValues)[number];

export const adminAnalyticsExportParamsSchema = z.object({
  report: z.enum(analyticsReportKeyValues),
});

/** Columns shared by every export: one aggregate figure per row. */
export const analyticsExportColumns = [
  "Section",
  "Metric",
  "Breakdown",
  "Value",
  "Unit",
] as const;

/**
 * Aggregate figures only, exactly as the page shows them. Rows never carry
 * customer names, emails or IDs. A value is null when there is nothing to
 * report and the string "Not yet" for retention weeks that have not ended.
 */
export const adminAnalyticsExportSchema = z.object({
  filename: z.string().regex(/^[a-z0-9-]+\.csv$/),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
});

export type AdminAnalyticsQuery = z.infer<typeof adminAnalyticsQuerySchema>;
export type AdminAnalyticsAccess = z.infer<typeof adminAnalyticsAccessSchema>;
export type AdminAcquisition = z.infer<typeof adminAcquisitionSchema>;
export type AdminActivation = z.infer<typeof adminActivationSchema>;
export type AdminDropOff = z.infer<typeof adminDropOffSchema>;
export type AdminUserAnalyticsResponse = z.infer<
  typeof adminUserAnalyticsResponseSchema
>;
export type AdminWellnessAnalyticsResponse = z.infer<
  typeof adminWellnessAnalyticsResponseSchema
>;
export type AdminPathwayAnalyticsResponse = z.infer<
  typeof adminPathwayAnalyticsResponseSchema
>;
export type AdminCommercialAnalyticsResponse = z.infer<
  typeof adminCommercialAnalyticsResponseSchema
>;
export type AdminRetentionResponse = z.infer<
  typeof adminRetentionResponseSchema
>;
export type AdminAnalyticsExport = z.infer<typeof adminAnalyticsExportSchema>;
export type AnalyticsExportCell = AdminAnalyticsExport["rows"][number][number];
