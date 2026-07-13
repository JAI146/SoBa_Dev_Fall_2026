"use client";

import type { AuthResponse } from "@muakhah/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { saveAuth } from "@/lib/auth";
import styles from "../../auth.module.css";

const DONOR_TYPES = new Set(["visitor", "sponsor"]);

function safeDonorNext(value: string | null) {
  return value?.startsWith("/dashboard/visitor") && !value.startsWith("//")
    ? value
    : "/dashboard/visitor";
}

function HandoffContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const importedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function importSession() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const fragmentToken = hash.get("access_token");
      if (fragmentToken) {
        importedTokenRef.current = fragmentToken;
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
      const token = importedTokenRef.current;
      if (!token) {
        setError("No login token was provided.");
        return;
      }

      try {
        const response = await apiRequest<{ user: AuthResponse["user"] }>(
          "/auth/me",
          {},
          token,
        );
        if (!DONOR_TYPES.has(response.user.userType)) {
          throw new Error("A sponsor account is required.");
        }
        if (cancelled) return;
        saveAuth({ user: response.user, accessToken: token }, true);
        router.replace(safeDonorNext(searchParams.get("next")));
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to import this session.");
        }
      }
    }
    void importSession();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className={styles["auth-page"]}>
      <div className={styles["auth-card"]}>
        <h1>Connecting your sponsor session</h1>
        {error ? (
          <>
            <div className={styles["error-banner"]}>{error}</div>
            <a href="/login" className={styles["btn-primary"]}>Sign in again</a>
          </>
        ) : (
          <p className={styles.subtitle}>Please wait while we open your dashboard.</p>
        )}
      </div>
    </div>
  );
}

export default function AuthHandoffPage() {
  return (
    <Suspense fallback={<div className={styles["auth-page"]} />}>
      <HandoffContent />
    </Suspense>
  );
}
