"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { AdminDashboardOverview, ChatRoomListItem } from "@muakhah/contracts";
import { AdminDonutChart } from "@/components/admin/admin-dashboard-charts";
import { AdminChatRoomsTable } from "@/components/chat/admin-chat-rooms-table";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { listChatRooms } from "@/lib/chat-api";
import { CHAT_MESSAGE_STATUS_TABS } from "@/lib/chat-message-status";
import { getToken } from "@/lib/auth";
import styles from "@/app/dashboard/dashboard.module.css";

const LATEST_CHAT_ROOMS_LIMIT = 10;

const CHAT_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#059669",
  rejected: "#dc2626",
  escalated: "#6366f1",
};

type AdminChatModeratorOverviewProps = {
  overview: AdminDashboardOverview;
};

export function AdminChatModeratorOverview({
  overview,
}: AdminChatModeratorOverviewProps) {
  const { t, te } = useI18n();
  const [rooms, setRooms] = useState<ChatRoomListItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const breakdown = overview.chatMessageStatusBreakdown ?? {
    pending: overview.messagesPendingReview,
    approved: 0,
    rejected: 0,
    escalated: 0,
    edited: 0,
  };

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const data = await listChatRooms("admin", token);
      setRooms(data.rooms.slice(0, LATEST_CHAT_ROOMS_LIMIT));
    } catch {
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const chartSegments = useMemo(() => {
    return CHAT_MESSAGE_STATUS_TABS.map((status) => ({
      key: status,
      label: te("chatMessageStatus", status),
      value: breakdown[status],
      color: CHAT_STATUS_COLORS[status] ?? "#9ca3af",
    }));
  }, [breakdown, te]);

  const totalMessages = useMemo(
    () => chartSegments.reduce((sum, segment) => sum + segment.value, 0),
    [chartSegments],
  );

  return (
    <>
      <div className={styles["admin-overview-stats"]}>
        <DashboardStatCard
          label={te("chatMessageStatus", "pending")}
          value={breakdown.pending}
          icon="messages"
          accent
        />
        <DashboardStatCard
          label={te("chatMessageStatus", "approved")}
          value={breakdown.approved}
          icon="approved"
        />
        <DashboardStatCard
          label={te("chatMessageStatus", "rejected")}
          value={breakdown.rejected}
          icon="suspended"
        />
        <DashboardStatCard
          label={te("chatMessageStatus", "escalated")}
          value={breakdown.escalated}
          icon="shield"
        />
      </div>

      <div className={styles["admin-overview-charts"]}>
        <AdminDonutChart
          title={t("admin.overview.chatModerator.chartTitle")}
          subtitle={t("admin.overview.chatModerator.chartDescription")}
          centerCaption={t("admin.overview.chatModerator.chartCenter")}
          centerLabel={String(totalMessages)}
          segments={chartSegments}
        />
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["donor-dashboard-section-header"]}>
          <div>
            <h2>{t("admin.overview.chatModerator.chatRoomsTitle")}</h2>
            <p>
              {t("admin.overview.chatModerator.chatRoomsDescription", {
                count: String(LATEST_CHAT_ROOMS_LIMIT),
              })}
            </p>
          </div>
          <Link
            href="/dashboard/admin/chat"
            className={`${styles["text-link"]} ${styles["text-link-inline"]}`}
          >
            {t("admin.overview.chatModerator.viewAllChats")}
          </Link>
        </div>

        {roomsLoading ? (
          <p className={styles["empty-state"]}>{t("chat.loadingRooms")}</p>
        ) : (
          <AdminChatRoomsTable rooms={rooms} />
        )}
      </div>
    </>
  );
}
