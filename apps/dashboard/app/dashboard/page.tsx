"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@muakhah/i18n";
import { getDashboardPath, getStoredUser, getToken } from "@/lib/auth";

export default function DashboardRootPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    router.replace(getDashboardPath(user.userType));
  }, [router]);

  return <div style={{ padding: "2rem" }}>{t("common.redirecting")}</div>;
}
