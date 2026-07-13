import { z } from "zod";
import type { AdminRoleValue } from "./admin-role";

export const ActivityAction = {
  USER_LOGIN: "user.login",
  FAMILY_CREATED: "family.created",
  FAMILY_UPDATED: "family.updated",
  FAMILY_DELETED: "family.deleted",
  FAMILY_LOGIN_RESTRICTED: "family.login_restricted",
  FAMILY_LOGIN_RESTORED: "family.login_restored",
  DONOR_RESTRICTED: "donor.restricted",
  DONOR_DELETED: "donor.deleted",
  SPONSORSHIP_CREATED: "sponsorship.created",
  SPONSORSHIP_REVIEWED: "sponsorship.reviewed",
  SPONSORSHIP_PAUSED: "sponsorship.paused",
  SPONSORSHIP_RESUMED: "sponsorship.resumed",
  SPONSORSHIP_CANCELLED: "sponsorship.cancelled",
  SPONSORSHIP_STOPPED: "sponsorship.stopped",
  SPONSORSHIP_COMPLETED: "sponsorship.completed",
  SPONSORSHIP_DISPUTED: "sponsorship.disputed",
  SPONSOR_TICKET_CREATED: "sponsor_ticket.created",
  SPONSOR_TICKET_REPLIED: "sponsor_ticket.replied",
  SPONSOR_TICKET_STATUS_UPDATED: "sponsor_ticket.status_updated",
  TRANSFER_PROOF_UPLOADED: "transfer_proof.uploaded",
  TRANSFER_PROOF_REVIEWED: "transfer_proof.reviewed",
  CHAT_MESSAGE_REVIEWED: "chat.message.reviewed",
  CHAT_MESSAGE_EDITED: "chat.message.edited",
  PROFILE_UPDATE_REVIEWED: "profile_update.reviewed",
  SUB_ADMIN_CREATED: "sub_admin.created",
  SUB_ADMIN_UPDATED: "sub_admin.updated",
} as const;

export type ActivityActionValue =
  (typeof ActivityAction)[keyof typeof ActivityAction];

export const activityLogQuerySchema = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ActivityLogQueryInput = z.infer<typeof activityLogQuerySchema>;

export interface ActivityLogListItem {
  id: string;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  actorAdminRole: AdminRoleValue | null;
  action: ActivityActionValue | string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
