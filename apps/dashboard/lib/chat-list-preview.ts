import type { ChatRoomListItem } from "@muakhah/contracts";

type TranslateFn = (key: string, params?: Record<string, string>) => string;

export function formatChatRoomPreview(
  room: ChatRoomListItem,
  viewerRole: "donor" | "family",
  t: TranslateFn,
): string {
  if (!room.lastMessageAt) {
    return t("chat.noMessagesYet");
  }

  const isOwnMessage =
    room.lastMessageSenderRole != null &&
    room.lastMessageSenderRole === viewerRole;

  let body = "";

  if (room.lastMessageType === "text" && room.lastMessageContent?.trim()) {
    body = room.lastMessageContent.trim();
  } else if (room.lastMessageMediaKind === "image") {
    body = t("chat.lastMessagePhoto");
  } else if (room.lastMessageMediaKind === "video") {
    body = t("chat.lastMessageVideo");
  } else if (room.lastMessageMediaKind === "document") {
    body = room.lastMessageContent?.trim() || t("chat.lastMessageDocument");
  } else if (room.lastMessageMediaKind === "sticker") {
    body = t("chat.lastMessageSticker");
  } else if (room.lastMessageType === "media") {
    body = t("chat.lastMessageMedia");
  } else {
    body = t("chat.noMessagesYet");
  }

  if (isOwnMessage) {
    return t("chat.lastMessageYouPrefix", { message: body });
  }

  return body;
}
