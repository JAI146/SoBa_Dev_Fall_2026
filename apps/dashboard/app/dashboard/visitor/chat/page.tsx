"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { ChatRoomListItem } from "@muakhah/contracts";
import { ChatRoomInboxList } from "@/components/chat/chat-room-inbox-list";
import {
  ChatInboxPageShell,
  ChatInboxSearch,
} from "@/components/chat/chat-inbox-page-shell";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { filterChatRooms } from "@/lib/chat-inbox-filter";
import { listChatRooms } from "@/lib/chat-api";
import { getToken } from "@/lib/auth";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

export default function DonorChatPage() {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<ChatRoomListItem[]>([]);
  const [search, setSearch] = useState("");
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
        const data = await listChatRooms("donor", token);
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

  const filteredRooms = useMemo(
    () => filterChatRooms(rooms, search, "donor"),
    [rooms, search],
  );

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  return (
    <>
      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("chat.donorTitle")}</h1>
          <p className={styles["page-description"]}>{t("chat.donorDescription")}</p>
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

      <ChatInboxPageShell>
        {!loading && rooms.length > 0 && (
          <ChatInboxSearch
            value={search}
            onChange={setSearch}
            placeholder={t("chat.searchFamilyPlaceholder")}
          />
        )}

        <div className={`${styles.card} ${styles["card-wide"]} ${styles["chat-inbox-card"]}`}>
          {loading && !refreshing && (
            <p className={styles["chat-inbox-empty"]}>{t("chat.loadingRooms")}</p>
          )}
          {!loading && rooms.length === 0 && (
            <p className={styles["chat-inbox-empty"]}>{t("chat.noDonorRooms")}</p>
          )}
          {!loading && rooms.length > 0 && filteredRooms.length === 0 && (
            <p className={styles["chat-inbox-empty"]}>{t("chat.noSearchResults")}</p>
          )}
          {!loading && filteredRooms.length > 0 && (
            <ChatRoomInboxList
              rooms={filteredRooms}
              viewerRole="donor"
              getRoomHref={(room) =>
                `/dashboard/visitor/chat/${encodeURIComponent(room.id)}`
              }
            />
          )}
        </div>
      </ChatInboxPageShell>
    </>
  );
}
