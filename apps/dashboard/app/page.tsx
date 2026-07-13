"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getDashboardPath, getStoredUser, getToken } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (token && user) {
      router.replace(getDashboardPath());
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  return null;
}
