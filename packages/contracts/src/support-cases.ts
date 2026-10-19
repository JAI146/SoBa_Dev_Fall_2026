import { z } from "zod";
import { paginationQuerySchema } from "./api-error";

const isoDate = z.string().datetime();

export const SupportCaseStatus = {
  NEW: "new",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  WAITING_FOR_USER: "waiting_for_user",
  ESCALATED: "escalated",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export const supportCaseStatusValues = [
  SupportCaseStatus.NEW,
  SupportCaseStatus.ASSIGNED,
  SupportCaseStatus.IN_PROGRESS,
  SupportCaseStatus.WAITING_FOR_USER,
  SupportCaseStatus.ESCALATED,
  SupportCaseStatus.RESOLVED,
  SupportCaseStatus.CLOSED,
] as const;

export type SupportCaseStatusValue =
  (typeof SupportCaseStatus)[keyof typeof SupportCaseStatus];

/** A complaint is a flag on the same case, not a separate record. */
export const SupportCaseType = {
  SUPPORT: "support",
  COMPLAINT: "complaint",
} as const;

export const supportCaseTypeValues = [
  SupportCaseType.SUPPORT,
  SupportCaseType.COMPLAINT,
] as const;

export type SupportCaseTypeValue =
  (typeof SupportCaseType)[keyof typeof SupportCaseType];

export const SupportCasePriority = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const supportCasePriorityValues = [
  SupportCasePriority.LOW,
  SupportCasePriority.NORMAL,
  SupportCasePriority.HIGH,
  SupportCasePriority.URGENT,
] as const;

export type SupportCasePriorityValue =
  (typeof SupportCasePriority)[keyof typeof SupportCasePriority];

/**
 * Status changes the generic status endpoint accepts. Assignment, escalation,
 * resolution and closure each have their own endpoint because they carry data.
 */
export const supportCaseManualStatusValues = [
  SupportCaseStatus.IN_PROGRESS,
  SupportCaseStatus.WAITING_FOR_USER,
] as const;

const subjectField = z.string().trim().min(1).max(200);
const longTextField = z.string().trim().min(1).max(5000);

export const supportCaseCategorySchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  label: z.string(),
  sortOrder: z.number().int(),
  active: z.boolean(),
});

export const supportCaseCategoriesResponseSchema = z.object({
  items: z.array(supportCaseCategorySchema),
});

export const supportCaseCategoryCreateSchema = z.object({
  label: z.string().trim().min(1).max(80),
});

export const supportCaseCategoryUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const supportCasesQuerySchema = paginationQuerySchema.extend({
  /** Matches case number, subject, or customer name or email. */
  search: z.string().trim().max(255).optional(),
  status: z.enum(supportCaseStatusValues).optional(),
  priority: z.enum(supportCasePriorityValues).optional(),
  type: z.enum(supportCaseTypeValues).optional(),
  categoryId: z.string().uuid().optional(),
  /** A staff user id, or "unassigned". */
  assignee: z.union([z.literal("unassigned"), z.string().uuid()]).optional(),
});

const supportCasePersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

export const supportCaseListItemSchema = z.object({
  id: z.string().uuid(),
  caseNumber: z.number().int(),
  type: z.enum(supportCaseTypeValues),
  subject: z.string(),
  status: z.enum(supportCaseStatusValues),
  priority: z.enum(supportCasePriorityValues),
  category: z.object({ id: z.string().uuid(), label: z.string() }),
  customer: supportCasePersonSchema.extend({ timeZone: z.string().nullable() }),
  assignee: supportCasePersonSchema.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const supportCasesResponseSchema = z.object({
  items: z.array(supportCaseListItemSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(1),
});

export const supportCaseDetailSchema = supportCaseListItemSchema.extend({
  description: z.string(),
  escalationReason: z.string().nullable(),
  escalatedAt: isoDate.nullable(),
  resolution: z.string().nullable(),
  resolvedAt: isoDate.nullable(),
  closedAt: isoDate.nullable(),
  createdBy: supportCasePersonSchema.nullable(),
});

export const supportCaseCreateSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(supportCaseTypeValues).default(SupportCaseType.SUPPORT),
  categoryId: z.string().uuid(),
  subject: subjectField,
  description: longTextField,
  priority: z
    .enum(supportCasePriorityValues)
    .default(SupportCasePriority.NORMAL),
  assigneeId: z.string().uuid().optional(),
});

/** Reclassify and re-prioritise. Assignment is its own call. */
export const supportCaseUpdateSchema = z
  .object({
    type: z.enum(supportCaseTypeValues).optional(),
    categoryId: z.string().uuid().optional(),
    priority: z.enum(supportCasePriorityValues).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const supportCaseAssignSchema = z.object({
  /** Null unassigns. */
  assigneeId: z.string().uuid().nullable(),
});

export const supportCaseStatusUpdateSchema = z.object({
  status: z.enum(supportCaseManualStatusValues),
});

export const supportCaseNoteSchema = z.object({ body: longTextField });

export const supportCaseEscalateSchema = z.object({
  reason: longTextField,
  /** Optionally hand the case to another staff member as part of escalating. */
  assigneeId: z.string().uuid().optional(),
});

export const supportCaseResolveSchema = z.object({ resolution: longTextField });

export const supportCaseCloseSchema = z.object({
  note: z.string().trim().max(5000).optional(),
});

export const supportCaseMessageSchema = z.object({
  subject: z.string().trim().min(1).max(150),
  body: longTextField,
});

export const supportCaseMessageResponseSchema = z.object({
  sentTo: z.string().email(),
});

export const supportCaseHistoryItemSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  outcome: z.enum(["success", "failure"] as const),
  createdAt: isoDate,
  actor: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
  /** Audit metadata: previous and next values, note or message text. */
  metadata: z.record(z.unknown()).nullable(),
});

export const supportCaseHistoryResponseSchema = z.object({
  items: z.array(supportCaseHistoryItemSchema),
});

export type SupportCaseCategory = z.infer<typeof supportCaseCategorySchema>;
export type SupportCaseCategoriesResponse = z.infer<
  typeof supportCaseCategoriesResponseSchema
>;
export type SupportCaseCategoryCreateInput = z.infer<
  typeof supportCaseCategoryCreateSchema
>;
export type SupportCaseCategoryUpdateInput = z.infer<
  typeof supportCaseCategoryUpdateSchema
>;
export type SupportCasesQuery = z.infer<typeof supportCasesQuerySchema>;
export type SupportCaseListItem = z.infer<typeof supportCaseListItemSchema>;
export type SupportCasesResponse = z.infer<typeof supportCasesResponseSchema>;
export type SupportCaseDetail = z.infer<typeof supportCaseDetailSchema>;
export type SupportCaseCreateInput = z.infer<typeof supportCaseCreateSchema>;
export type SupportCaseUpdateInput = z.infer<typeof supportCaseUpdateSchema>;
export type SupportCaseAssignInput = z.infer<typeof supportCaseAssignSchema>;
export type SupportCaseStatusUpdateInput = z.infer<
  typeof supportCaseStatusUpdateSchema
>;
export type SupportCaseNoteInput = z.infer<typeof supportCaseNoteSchema>;
export type SupportCaseEscalateInput = z.infer<
  typeof supportCaseEscalateSchema
>;
export type SupportCaseResolveInput = z.infer<typeof supportCaseResolveSchema>;
export type SupportCaseCloseInput = z.infer<typeof supportCaseCloseSchema>;
export type SupportCaseMessageInput = z.infer<typeof supportCaseMessageSchema>;
export type SupportCaseMessageResponse = z.infer<
  typeof supportCaseMessageResponseSchema
>;
export type SupportCaseHistoryItem = z.infer<
  typeof supportCaseHistoryItemSchema
>;
export type SupportCaseHistoryResponse = z.infer<
  typeof supportCaseHistoryResponseSchema
>;
