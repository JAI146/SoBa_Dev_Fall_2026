"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { ChatRoomListItem } from "@muakhah/contracts";
import { listChatRooms } from "@/lib/chat-api";
import { getToken } from "@/lib/auth";
import { AdminChatRoomsTable } from "@/components/chat/admin-chat-rooms-table";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import styles from "@/app/dashboard/dashboard.module.css";
import authStyles from "@/app/auth.module.css";

export function AdminChatListView() {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<ChatRoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const token = getToken();
        if (!token) {
          throw new Error(t("chat.loadRoomsFailed"));
        }
        const data = await listChatRooms("admin", token);
        setRooms(data.rooms);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("chat.loadRoomsFailed"));
      } finally {
        if (opts?.silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [t],
  );

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  return (
    <>
      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("chat.adminTitle")}</h1>
          <p className={styles["page-description"]}>{t("chat.adminDescription")}</p>
        </div>
        <RefreshButton
          refreshing={refreshing}
          disabled={loading}
          onClick={() => void loadRooms({ silent: true })}
        />
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        {loading && !refreshing && <p>{t("chat.loadingRooms")}</p>}
        {!loading && rooms.length === 0 && (
          <p className={styles["empty-state"]}>{t("chat.noRooms")}</p>
        )}
        {!loading && rooms.length > 0 && (
          <AdminChatRoomsTable rooms={rooms} />
        )}
      </div>
    </>
  );
}
