"use client";

import Link from "next/link";
import { useI18n } from "@muakhah/i18n";
import type { ChatRoomListItem } from "@muakhah/contracts";
import styles from "@/app/dashboard/dashboard.module.css";

type AdminChatRoomsTableProps = {
  rooms: ChatRoomListItem[];
  emptyMessage?: string;
};

export function AdminChatRoomsTable({
  rooms,
  emptyMessage,
}: AdminChatRoomsTableProps) {
  const { t } = useI18n();

  if (rooms.length === 0) {
    return (
      <p className={styles["empty-state"]}>
        {emptyMessage ?? t("chat.noRooms")}
      </p>
    );
  }

  return (
    <div className={styles["table-scroll"]}>
      <table className={styles["data-table"]}>
        <thead>
          <tr>
            <th>{t("chat.table.family")}</th>
            <th>{t("chat.table.donor")}</th>
            <th>{t("chat.table.pending")}</th>
            <th>{t("chat.table.lastMessage")}</th>
            <th>{t("chat.table.open")}</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id}>
              <td>{room.familyPublicCode}</td>
              <td>
                <div>{room.donorName}</div>
                <div className={styles["form-hint"]}>{room.donorEmail}</div>
              </td>
              <td>{room.pendingCount}</td>
              <td>
                {room.lastMessageAt
                  ? new Date(room.lastMessageAt).toLocaleString()
                  : t("common.empty")}
              </td>
              <td>
                <Link
                  href={`/dashboard/admin/chat/${encodeURIComponent(room.id)}`}
                  className={styles["btn-secondary-inline"]}
                >
                  {t("chat.openRoom")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
