"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import { getFamilyRoomBySponsorship } from "@/lib/chat-api";
import { getToken } from "@/lib/auth";
import styles from "../../../../dashboard.module.css";
import authStyles from "../../../../../auth.module.css";

export default function FamilyChatStartPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ sponsorshipId: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function openChat() {
      try {
        const token = getToken();
        if (!token) {
          throw new Error(t("chat.loadRoomFailed"));
        }
        const data = await getFamilyRoomBySponsorship(
          params.sponsorshipId,
          token,
        );
        router.replace(
          `/dashboard/family/chat/${encodeURIComponent(data.room.id)}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t("chat.loadRoomFailed"));
      }
    }
    void openChat();
  }, [params.sponsorshipId, router, t]);

  if (error) {
    return (
      <div className={styles.card}>
        <div className={authStyles["error-banner"]}>{error}</div>
      </div>
    );
  }

  return <div className={styles.card}>{t("chat.loadingRoom")}</div>;
}
