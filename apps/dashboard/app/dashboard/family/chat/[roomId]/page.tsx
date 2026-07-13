"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { ChatRoomListItem } from "@muakhah/contracts";
import { BackLink } from "@/components/dashboard/back-link";
import { ParticipantChatPanel } from "@/components/chat/participant-chat-panel";
import { getChatRoom } from "@/lib/chat-api";
import { getToken } from "@/lib/auth";
import styles from "../../../dashboard.module.css";
import authStyles from "../../../../auth.module.css";

export default function FamilyChatRoomPage() {
  const { t } = useI18n();
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
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
      const data = await getChatRoom("family", roomId, token);
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
        <Link href="/dashboard/family/chat" className={styles["back-link"]}>
          {t("chat.backToRooms")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles["page-top"]}>
        <BackLink href="/dashboard/family/chat">{t("common.back")}</BackLink>
      </div>
      <ParticipantChatPanel role="family" room={room} />
    </>
  );
}
