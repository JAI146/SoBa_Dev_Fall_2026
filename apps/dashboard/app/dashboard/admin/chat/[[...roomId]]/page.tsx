"use client";

import { AdminChatListView } from "@/components/chat/admin-chat-list-view";
import { AdminChatRoomView } from "@/components/chat/admin-chat-room-view";
import { useRouteParam } from "@/lib/use-route-param";

export default function AdminChatPage() {
  const roomId = useRouteParam("roomId", {
    pathnamePattern: /^\/dashboard\/admin\/chat\/([^/]+)$/,
  });

  if (roomId) {
    return <AdminChatRoomView roomId={roomId} />;
  }

  return <AdminChatListView />;
}
