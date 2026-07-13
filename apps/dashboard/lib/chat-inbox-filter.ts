import type { ChatRoomListItem } from "@muakhah/contracts";

export function filterChatRooms(
  rooms: ChatRoomListItem[],
  query: string,
  viewerRole: "donor" | "family",
): ChatRoomListItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return rooms;
  }

  if (viewerRole === "donor") {
    return rooms.filter((room) =>
      room.familyPublicCode.toLowerCase().includes(normalized),
    );
  }

  return rooms.filter(
    (room) =>
      room.donorName.toLowerCase().includes(normalized) ||
      room.donorEmail.toLowerCase().includes(normalized),
  );
}
