"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import { getDonorRoomByFamilyCode } from "@/lib/chat-api";
import { getToken } from "@/lib/auth";
import styles from "../../../../dashboard.module.css";
import authStyles from "../../../../../auth.module.css";

export default function DonorChatStartPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ publicCode: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function openChat() {
      try {
        const token = getToken();
        if (!token) {
          throw new Error(t("chat.loadRoomFailed"));
        }
        const data = await getDonorRoomByFamilyCode(params.publicCode, token);
        router.replace(
          `/dashboard/visitor/chat/${encodeURIComponent(data.room.id)}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t("chat.loadRoomFailed"));
      }
    }
    void openChat();
  }, [params.publicCode, router, t]);

  if (error) {
    return (
      <div className={styles.card}>
        <div className={authStyles["error-banner"]}>{error}</div>
      </div>
    );
  }

  return <div className={styles.card}>{t("chat.loadingRoom")}</div>;
}
