import { z } from "zod";

export const ChatMessageType = {
  TEXT: "text",
  MEDIA: "media",
} as const;

export type ChatMessageTypeValue =
  (typeof ChatMessageType)[keyof typeof ChatMessageType];

export const ChatMessageStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  EDITED: "edited",
  ESCALATED: "escalated",
} as const;

export type ChatMessageStatusValue =
  (typeof ChatMessageStatus)[keyof typeof ChatMessageStatus];

export const ChatSenderRole = {
  DONOR: "donor",
  FAMILY: "family",
} as const;

export type ChatSenderRoleValue =
  (typeof ChatSenderRole)[keyof typeof ChatSenderRole];

export const sendChatTextSchema = z.object({
  content: z.string().trim().min(1, "Message is required").max(5000),
});

export type SendChatTextInput = z.infer<typeof sendChatTextSchema>;

export const reviewChatMessageSchema = z
  .object({
    status: z.enum(["approved", "rejected", "escalated"]),
    adminNotes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "rejected" && !data.adminNotes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rejection reason is required when rejecting a message",
        path: ["adminNotes"],
      });
    }
  });

export type ReviewChatMessageInput = z.infer<typeof reviewChatMessageSchema>;

export const editChatMessageSchema = z.object({
  content: z.string().trim().min(1, "Message content is required").max(5000),
});

export type EditChatMessageInput = z.infer<typeof editChatMessageSchema>;

export interface ChatRoomListItem {
  id: string;
  familyId: string;
  familyPublicCode: string;
  donorUserId: string;
  donorName: string;
  donorEmail: string;
  familyAvatarUrl: string | null;
  pendingCount: number;
  canSend: boolean;
  lastMessageAt: string | null;
  lastMessageType: ChatMessageTypeValue | null;
  lastMessageContent: string | null;
  lastMessageMediaKind: ChatMessageListItem["mediaKind"];
  lastMessageSenderRole: ChatSenderRoleValue | null;
  lastMessageStatus: ChatMessageStatusValue | null;
  createdAt: string;
}

export interface ChatMessageListItem {
  id: string;
  roomId: string;
  senderRole: ChatSenderRoleValue;
  senderName: string;
  type: ChatMessageTypeValue;
  content: string | null;
  mediaUrl: string | null;
  mediaKind: "image" | "video" | "document" | "sticker" | null;
  status: ChatMessageStatusValue;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}
