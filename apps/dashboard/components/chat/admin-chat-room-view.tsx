"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { ChatRoomListItem } from "@muakhah/contracts";
import { BackLink } from "@/components/dashboard/back-link";
import { AdminChatRoomPanel } from "@/components/chat/admin-chat-room-panel";
import { getChatRoom } from "@/lib/chat-api";
import { getToken } from "@/lib/auth";
import styles from "@/app/dashboard/dashboard.module.css";
import authStyles from "@/app/auth.module.css";

export function AdminChatRoomView({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const [room, setRoom] = useState<ChatRoomListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error(t("chat.loadRoomFailed"));
      }
      const data = await getChatRoom("admin", roomId, token);
      setRoom(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("chat.loadRoomFailed"));
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, [roomId, t]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  if (loading) {
    return <div className={styles.card}>{t("chat.loadingRoom")}</div>;
  }

  if (error || !room) {
    return (
      <div className={styles.card}>
        {error && <div className={authStyles["error-banner"]}>{error}</div>}
        <Link href="/dashboard/admin/chat" className={styles["back-link"]}>
          {t("chat.backToRooms")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles["page-top"]}>
        <BackLink href="/dashboard/admin/chat">{t("common.back")}</BackLink>
      </div>
      <AdminChatRoomPanel initialRoom={room} />
    </>
  );
}
