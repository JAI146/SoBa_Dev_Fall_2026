import { z } from "zod";
export const notificationChannelSchema = z.enum(["push", "email"]);
export const notificationStatusSchema = z.enum([
  "processing",
  "delivery_uncertain",
  "scheduled",
  "blocked",
  "sent",
  "delivered",
  "failed",
  "retry_pending",
  "suppressed",
  "cancelled",
]);
export const notificationCategoryKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,49}$/);
export const REQUIRED_NOTIFICATION_KEYS = [
  "security",
  "critical_updates",
  "transactions",
] as const;
export const notificationCategorySchema = z.object({
  key: notificationCategoryKeySchema,
  name: z.string(),
  mandatory: z.boolean(),
  pushSupported: z.boolean(),
  emailSupported: z.boolean(),
  enabled: z.boolean(),
  minIntervalHours: z.number().int().min(1).max(720),
});
export const categoryConfigurationSchema = notificationCategorySchema
  .omit({ mandatory: true })
  .extend({ name: z.string().trim().min(2).max(80) })
  .strict()
  .refine(
    (c) => c.pushSupported || c.emailSupported,
    "Support at least one delivery channel.",
  );
export const channelPreferencesSchema = z
  .object({ push: z.boolean(), email: z.boolean() })
  .strict();
const quietTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM in 24-hour time.");
const zone = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Use a valid timezone.");
export const quietHoursSchema = z
  .object({
    enabled: z.boolean(),
    start: quietTime,
    end: quietTime,
    timeZone: zone,
  })
  .strict()
  .refine(
    (q) => !q.enabled || q.start !== q.end,
    "Quiet hours must have different start and end times.",
  );
export const notificationSettingsSchema = z
  .object({
    categories: z.record(
      notificationCategoryKeySchema,
      channelPreferencesSchema,
    ),
    optionalOptOut: z.boolean().default(false),
    quietHours: quietHoursSchema.default({
      enabled: false,
      start: "22:00",
      end: "08:00",
      timeZone: "UTC",
    }),
  })
  .strict();
export const notificationSettingsResponseSchema = z.object({
  settings: notificationSettingsSchema,
  categories: z.array(notificationCategorySchema),
  deliveryAvailable: z.boolean(),
});
export const notificationJobSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  recipientName: z.string().nullable().default(null),
  recipientEmail: z.string().email().nullable().default(null),
  categoryKey: notificationCategoryKeySchema,
  eventType: z.string().regex(/^[a-z][a-z0-9_.]{1,79}$/),
  channel: notificationChannelSchema,
  status: notificationStatusSchema,
  mandatory: z.boolean(),
  scheduledAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  sentAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  attempts: z.number().int().nonnegative(),
  retryRequests: z.number().int().nonnegative(),
  reason: z
    .enum([
      "provider_not_configured",
      "manual_send_required",
      "optional_opt_out",
      "quiet_hours",
      "category_unavailable",
      "frequency_limit",
      "customer_active",
      "unknown_error",
      "account_inactive",
    ])
    .nullable(),
});
export const notificationOperationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: notificationStatusSchema.optional(),
  categoryKey: notificationCategoryKeySchema.optional(),
  channel: notificationChannelSchema.optional(),
  userId: z.string().uuid().optional(),
});
export const notificationOperationsSchema = z.object({
  items: z.array(notificationJobSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  counts: z.record(z.string(), z.number().int()),
  categories: z.array(notificationCategorySchema),
  canManage: z.boolean(),
  canConfigureEmail: z.boolean().default(false),
  emailConfigured: z.boolean().default(false),
  pushConfigured: z.literal(false).default(false),
  deliveryAvailable: z.boolean(),
});
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type NotificationCategoryPublic = z.infer<
  typeof notificationCategorySchema
>;
export type NotificationJobPublic = z.infer<typeof notificationJobSchema>;
export type NotificationOperationsQuery = z.infer<
  typeof notificationOperationsQuerySchema
>;
export type CategoryConfiguration = z.infer<typeof categoryConfigurationSchema>;

export const notificationSettingsUpdateSchema = notificationSettingsSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Choose at least one preference to update.",
  );
export type NotificationSettingsUpdate = z.infer<
  typeof notificationSettingsUpdateSchema
>;
export const queueNotificationSchema = z
  .object({
    userId: z.string().uuid(),
    categoryKey: notificationCategoryKeySchema,
    eventType: z
      .string()
      .regex(/^[a-z][a-z0-9_.]{1,79}$/)
      .refine(
        (value) => value !== "re_engagement",
        "Re-engagement events are managed by the automatic planner.",
      ),
    channel: notificationChannelSchema,
    requestId: z.string().uuid(),
    scheduledAt: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.scheduledAt ||
      (Date.parse(value.scheduledAt) >= Date.now() - 60000 &&
        Date.parse(value.scheduledAt) <= Date.now() + 365 * 86400000),
    "Planned time must be now or within the next year.",
  );
export type QueueNotificationInput = z.infer<typeof queueNotificationSchema>;

export const reengagementScanSchema = z.object({
  queued: z.number().int().min(0),
  cancelled: z.number().int().min(0),
  suppressed: z.number().int().min(0),
  examined: z.number().int().min(0),
  busy: z.boolean(),
  deliveryAvailable: z.boolean(),
});
export type ReengagementScanResponse = z.infer<typeof reengagementScanSchema>;

export const notificationEmailInputSchema = z
  .object({
    recipientEmail: z.string().email(),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((value) => !/[\r\n]/.test(value), "Subject must be one line."),
    message: z.string().trim().min(1).max(3000),
  })
  .strict();
export const notificationEmailResultSchema = z.object({
  status: z.enum(["sent", "failed", "delivery_uncertain"]),
  message: z.string(),
});
export const notificationSmtpInputSchema = z
  .object({
    smtpServer: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9.-]+$/),
    smtpPort: z.coerce.number().int().min(1).max(65535),
    smtpEmailUser: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(
        (value) => !/[\r\n]/.test(value),
        "SMTP username must be one line.",
      ),
    smtpEmailPassword: z.string().min(1).max(1024).optional(),
    fromEmail: z.string().email(),
    smtpEnabled: z.boolean(),
  })
  .strict();
export const notificationSmtpResponseSchema = z.object({
  configured: z.boolean(),
  settings: notificationSmtpInputSchema
    .omit({ smtpEmailPassword: true })
    .extend({
      hasPassword: z.boolean(),
      fromEmail: z.string().email().or(z.literal("")),
    })
    .nullable(),
});
export const notificationEmailTestSchema = z
  .object({ email: z.string().email() })
  .strict();
export const notificationActionResponseSchema = z.object({
  message: z.string(),
});
export const notificationQueueResponseSchema =
  notificationActionResponseSchema.extend({
    queued: z.number().int().nonnegative(),
  });
export const notificationCategoriesResponseSchema = z.array(
  notificationCategorySchema,
);
export type NotificationEmailInput = z.infer<
  typeof notificationEmailInputSchema
>;
export type NotificationSmtpInput = z.infer<typeof notificationSmtpInputSchema>;
