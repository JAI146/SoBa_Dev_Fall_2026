import { z } from "zod";

export const SponsorTicketStatus = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
} as const;

export type SponsorTicketStatusValue =
  (typeof SponsorTicketStatus)[keyof typeof SponsorTicketStatus];

export const createSponsorTicketSchema = z.object({
  sponsorshipId: z.string().uuid(),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

export type CreateSponsorTicketInput = z.infer<typeof createSponsorTicketSchema>;

export const replySponsorTicketSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(5000),
});

export type ReplySponsorTicketInput = z.infer<typeof replySponsorTicketSchema>;

export const updateSponsorTicketStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

export type UpdateSponsorTicketStatusInput = z.infer<
  typeof updateSponsorTicketStatusSchema
>;

export interface SponsorTicketMessageItem {
  id: string;
  senderUserId: string;
  senderName: string;
  senderRole: "donor" | "admin";
  content: string;
  createdAt: string;
}

export interface SponsorTicketListItem {
  id: string;
  sponsorshipId: string;
  familyPublicCode: string;
  donorUserId: string;
  donorName: string;
  subject: string;
  status: SponsorTicketStatusValue;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  lastMessagePreview: string | null;
}

export interface SponsorTicketDetail extends SponsorTicketListItem {
  messages: SponsorTicketMessageItem[];
}
