import type { ChatMessageListItem, ChatRoomListItem } from "@muakhah/contracts";
import { apiRequest } from "./api-client";

export type ChatRole = "donor" | "family" | "admin";

function basePath(role: ChatRole) {
  if (role === "admin") return "/admin/chat";
  if (role === "family") return "/family/chat";
  return "/donor/chat";
}

export async function listChatRooms(role: ChatRole, token: string) {
  return apiRequest<{ rooms: ChatRoomListItem[] }>(
    `${basePath(role)}/rooms`,
    {},
    token,
  );
}

export async function getChatRoom(
  role: ChatRole,
  roomId: string,
  token: string,
) {
  return apiRequest<{ room: ChatRoomListItem }>(
    `${basePath(role)}/rooms/${encodeURIComponent(roomId)}`,
    {},
    token,
  );
}

export async function listChatMessages(
  role: ChatRole,
  roomId: string,
  token: string,
  status?: string,
) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<{ messages: ChatMessageListItem[] }>(
    `${basePath(role)}/rooms/${encodeURIComponent(roomId)}/messages${query}`,
    {},
    token,
  );
}

export async function sendChatText(
  role: ChatRole,
  roomId: string,
  content: string,
  token: string,
) {
  return apiRequest<{ message: ChatMessageListItem }>(
    `${basePath(role)}/rooms/${encodeURIComponent(roomId)}/messages/text`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
    token,
  );
}

export async function sendChatMedia(
  role: ChatRole,
  roomId: string,
  file: File,
  token: string,
  kind?: "document" | "sticker",
) {
  const formData = new FormData();
  formData.append("media", file);
  if (kind) {
    formData.append("kind", kind);
  }
  return apiRequest<{ message: ChatMessageListItem }>(
    `${basePath(role)}/rooms/${encodeURIComponent(roomId)}/messages/media`,
    {
      method: "POST",
      body: formData,
    },
    token,
  );
}

export async function reviewChatMessage(
  messageId: string,
  body: {
    status: "approved" | "rejected" | "escalated";
    adminNotes?: string | null;
  },
  token: string,
) {
  return apiRequest<{ message: ChatMessageListItem }>(
    `/admin/chat/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
    token,
  );
}

export async function editChatMessageContent(
  messageId: string,
  content: string,
  token: string,
) {
  return apiRequest<{ message: ChatMessageListItem }>(
    `/admin/chat/messages/${encodeURIComponent(messageId)}/content`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    },
    token,
  );
}

export async function getDonorRoomByFamilyCode(
  publicCode: string,
  token: string,
) {
  return apiRequest<{ room: ChatRoomListItem }>(
    `/donor/chat/rooms/by-family/${encodeURIComponent(publicCode)}`,
    {},
    token,
  );
}

export async function getFamilyRoomBySponsorship(
  sponsorshipId: string,
  token: string,
) {
  return apiRequest<{ room: ChatRoomListItem }>(
    `/family/chat/rooms/by-sponsorship/${encodeURIComponent(sponsorshipId)}`,
    {},
    token,
  );
}
