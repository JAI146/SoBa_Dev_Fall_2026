"use client";

import Link from "next/link";
import type { ChatRoomListItem } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import { formatChatRoomPreview } from "@/lib/chat-list-preview";
import { formatChatListTimestamp } from "@/lib/chat-list-timestamp";
import styles from "@/app/dashboard/dashboard.module.css";

type ChatRoomInboxListProps = {
  rooms: ChatRoomListItem[];
  viewerRole: "donor" | "family";
  getRoomHref: (room: ChatRoomListItem) => string;
};

function ChatRoomAvatar({
  imageUrl,
  label,
}: {
  imageUrl: string | null;
  label: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={styles["chat-inbox-item__avatar"]}
      />
    );
  }

  return (
    <div className={styles["chat-inbox-item__avatar-placeholder"]} aria-hidden>
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function ChatRoomInboxList({
  rooms,
  viewerRole,
  getRoomHref,
}: ChatRoomInboxListProps) {
  const { t } = useI18n();

  return (
    <div className={styles["chat-inbox-list"]}>
      {rooms.map((room) => {
        const title =
          viewerRole === "donor" ? room.familyPublicCode : room.donorName;
        const avatarUrl = viewerRole === "donor" ? room.familyAvatarUrl : null;
        const avatarLabel =
          viewerRole === "donor" ? room.familyPublicCode : room.donorName;
        const preview = formatChatRoomPreview(room, viewerRole, t);
        const timestamp = formatChatListTimestamp(room.lastMessageAt, t);

        return (
          <Link
            key={room.id}
            href={getRoomHref(room)}
            className={styles["chat-inbox-item"]}
          >
            <ChatRoomAvatar imageUrl={avatarUrl} label={avatarLabel} />

            <div className={styles["chat-inbox-item__body"]}>
              <div className={styles["chat-inbox-item__top"]}>
                <strong className={styles["chat-inbox-item__title"]}>
                  {title}
                </strong>
                {timestamp ? (
                  <time
                    className={styles["chat-inbox-item__time"]}
                    dateTime={room.lastMessageAt ?? undefined}
                  >
                    {timestamp}
                  </time>
                ) : null}
              </div>

              <div className={styles["chat-inbox-item__bottom"]}>
                <p className={styles["chat-inbox-item__preview"]}>{preview}</p>
                {room.pendingCount > 0 ? (
                  <span className={styles["chat-inbox-item__badge"]}>
                    {room.pendingCount}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
