import { z } from "zod";
import { adminSavingsCustomerSchema } from "./admin";
import { auditEventSchema } from "./audit";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date.");
const pagination = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
};
const range = { from: date.optional(), to: date.optional() };
const validRange = (query: { from?: string; to?: string }) =>
  !query.from ||
  !query.to ||
  (query.from <= query.to &&
    Date.parse(query.to) - Date.parse(query.from) <= 366 * 86400000);

export const employeeAuditDataQuerySchema = z
  .object({
    employeeId: z.string().uuid(),
    ...range,
    ...pagination,
    action: z.string().trim().min(1).max(100).optional(),
    outcome: z.enum(["success", "failure"]).optional(),
    includeDetails: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((value) => value === "true"),
      ])
      .default(false),
  })
  .strict()
  .refine(validRange, "Use an ordered date range of at most 366 days.");

export const savingsProgressDataQuerySchema = z
  .object({
    customerId: z.string().uuid().optional(),
    includeEntryCounts: z
      .union([z.literal(true), z.literal("true")])
      .optional(),
    ...range,
    ...pagination,
    goalPage: z.coerce.number().int().min(1).max(100000).default(1),
    entryPage: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict()
  .refine(validRange, "Use an ordered date range of at most 366 days.")
  .refine(
    (query) =>
      Boolean(query.customerId) ||
      (!query.from &&
        !query.to &&
        query.goalPage === 1 &&
        query.entryPage === 1),
    "Select a customer before filtering or paging savings entries and goals.",
  );

const pageInfo = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  hasMore: z.boolean(),
});
const savingsCustomer = adminSavingsCustomerSchema.extend({
  recordedEntryCount: z.number().int().nonnegative().optional(),
  remainingAmount: z.number(),
  progressPercent: z.number().nullable(),
});
export const employeeAuditDataResponseSchema = z.object({
  retrievedAt: z.string().datetime(),
  source: z.literal("audit_events"),
  employee: z.object({ id: z.string().uuid(), name: z.string() }),
  filters: z.object({
    from: date,
    to: date,
    timeZone: z.literal("UTC"),
    action: z.string().nullable(),
    outcome: z.string().nullable(),
  }),
  detailsIncluded: z.boolean(),
  pagination: pageInfo,
  items: z.array(
    auditEventSchema.extend({
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
  ),
});
export const savingsProgressDataResponseSchema = z.object({
  retrievedAt: z.string().datetime(),
  source: z.literal("savings_progress"),
  verification: z.literal("self_reported_not_bank_verified"),
  filters: z.object({
    customerId: z.string().uuid().nullable(),
    from: date.nullable(),
    to: date.nullable(),
    timeZone: z.literal("UTC"),
    dateFilterAppliesTo: z.literal(
      "entries_only_current_balances_are_all_time",
    ),
  }),
  customers: z.object({
    pagination: pageInfo,
    items: z.array(savingsCustomer),
  }),
  goals: z.object({
    pagination: pageInfo,
    items: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        savedAmount: z.number(),
        targetAmount: z.number(),
        remainingAmount: z.number(),
        progressPercent: z.number().nullable(),
        isPathwayEligible: z.boolean(),
        isFocus: z.boolean(),
        isActive: z.boolean(),
      }),
    ),
  }),
  entries: z.object({
    pagination: pageInfo,
    items: z.array(
      z.object({
        id: z.string().uuid(),
        goalId: z.string().uuid(),
        amount: z.number(),
        createdAt: z.string().datetime(),
      }),
    ),
  }),
});
export type EmployeeAuditDataQuery = z.infer<
  typeof employeeAuditDataQuerySchema
>;
export type SavingsProgressDataQuery = z.infer<
  typeof savingsProgressDataQuerySchema
>;
export type EmployeeAuditDataResponse = z.infer<
  typeof employeeAuditDataResponseSchema
>;
export type SavingsProgressDataResponse = z.infer<
  typeof savingsProgressDataResponseSchema
>;

// A report combines matching records with aggregates over the full filtered result.
export const auditReportQuerySchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    employeeName: z.string().trim().min(1).max(120).optional(),
    action: z.string().max(100).optional(),
    outcome: z.enum(["success", "failure"]).optional(),
    entityType: z.string().trim().min(1).max(100).optional(),
    entityId: z.string().trim().min(1).max(100).optional(),
    ...range,
    ...pagination,
    includeDetails: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((value) => value === "true"),
      ])
      .default(false),
  })
  .strict()
  .refine(validRange, "Use an ordered date range of at most 366 days.");
const auditGroup = z.object({
  name: z.string(),
  count: z.number().int(),
  actorId: z.string().nullable().optional(),
});
const auditGroups = z.object({
  items: z.array(auditGroup).max(50),
  hasMore: z.boolean(),
});
export const auditReportResponseSchema = z.object({
  source: z.literal("audit_events"),
  retrievedAt: z.string().datetime(),
  filters: z.object({
    from: date,
    to: date,
    timeZone: z.literal("UTC"),
    employeeId: z.string().nullable(),
    employeeName: z.string().nullable(),
    action: z.string().nullable(),
    outcome: z.string().nullable(),
    entityType: z.string().nullable(),
    entityId: z.string().nullable(),
    actorScope: z.literal("all_matching_actors_unless_filtered"),
  }),
  detailsIncluded: z.boolean(),
  pagination: pageInfo,
  summary: z.object({
    scope: z.literal("all_matching_records_not_just_page"),
    total: z.number().int(),
    byAction: auditGroups,
    byOutcome: auditGroups,
    byActor: auditGroups,
    byDay: auditGroups,
  }),
  items: z.array(
    auditEventSchema.extend({
      actorName: z.string(),
      actorRole: z.string().nullable(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
  ),
});
export type AuditReportResponse = z.infer<typeof auditReportResponseSchema>;
