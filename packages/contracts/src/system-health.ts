import { z } from "zod";

export const healthServiceIds = [
  "api",
  "database",
  "synctera_kyc",
  "synctera_banking",
  "synctera_payments",
  "kiromoney",
  "notifications",
] as const;
export const healthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "failed",
  "action_required",
]);
export const healthIssueCategorySchema = z.enum([
  "purposemint",
  "provider",
  "synchronization",
  "user_specific",
  "undetermined",
]);
const healthReportBaseSchema = z
  .object({
    serviceId: z.enum(healthServiceIds),
    status: healthStatusSchema,
    category: healthIssueCategorySchema,
    affectedUserId: z.string().uuid().nullable().default(null),
    summary: z.string().trim().min(8).max(300),
  })
  .strict();
export const healthReportInputSchema = healthReportBaseSchema.superRefine(
  (value, ctx) => {
    if (
      (value.category === "user_specific") !==
      Boolean(value.affectedUserId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["affectedUserId"],
        message: "Only user-specific issues require an affected customer ID.",
      });
    }
  },
);
export const healthReportSchema = healthReportBaseSchema.extend({
  id: z.string().uuid(),
  recordedAt: z.string().datetime(),
  stale: z.boolean(),
});
export const monitoredServiceSchema = z.object({
  id: z.enum(healthServiceIds),
  name: z.string(),
  group: z.string(),
  status: healthStatusSchema,
  category: healthIssueCategorySchema,
  source: z.enum(["live_check", "staff_report", "not_monitored"]),
  summary: z.string(),
  checkedAt: z.string().datetime().nullable(),
  latencyMs: z.number().nonnegative().nullable(),
  stale: z.boolean(),
});
export const systemHealthResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  overallStatus: healthStatusSchema,
  canReport: z.boolean(),
  reportsAvailable: z.boolean(),
  services: z.array(monitoredServiceSchema),
  reports: z.array(healthReportSchema),
});
export type HealthReportInput = z.infer<typeof healthReportInputSchema>;
export type HealthReport = z.infer<typeof healthReportSchema>;
export type MonitoredService = z.infer<typeof monitoredServiceSchema>;
export type SystemHealthResponse = z.infer<typeof systemHealthResponseSchema>;
