import { z } from "zod";

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  action: z.string().max(100).optional(),
  outcome: z.enum(["", "success", "failure"]).optional(),
  actorUserId: z.string().max(100).optional(),
  entityId: z.string().max(100).optional(),
  from: z.string().max(10).optional(),
  to: z.string().max(10).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().nullable(),
  actorType: z.string(),
  action: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  outcome: z.string(),
  createdAt: z.string(),
});
export const auditPageSchema = z.object({
  items: z.array(auditEventSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  canViewDetails: z.boolean(),
});
export const auditDetailSchema = auditEventSchema.extend({
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
});
export type AuditListEvent = z.infer<typeof auditEventSchema>;
export type AuditDetail = z.infer<typeof auditDetailSchema>;
export type AuditPage = z.infer<typeof auditPageSchema>;
export const auditHierarchySchema = z.object({
  users: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      role: z.string(),
      roleLabel: z.string(),
      reportsToUserId: z.string().uuid().nullable(),
      status: z.string(),
      matchCount: z.number(),
    }),
  ),
});
export type AuditStaffNode = z.infer<
  typeof auditHierarchySchema
>["users"][number];
