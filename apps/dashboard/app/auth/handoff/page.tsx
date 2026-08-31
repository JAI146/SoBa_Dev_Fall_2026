"use client";

import { UserType, type AuthResponse } from "@purposemint/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { saveAuth } from "@/lib/auth";
import styles from "../../auth.module.css";

function safeNext(value: string | null) {
  return value?.startsWith("/dashboard") && !value.startsWith("//")
    ? value
    : "/dashboard";
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
      const token = hash.get("access_token");
      if (token) {
        importedTokenRef.current = token;
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
      if (!importedTokenRef.current) {
        setError("No login token was provided.");
        return;
      }

      try {
        const user = await apiRequest<AuthResponse["user"]>(
          "/users/me",
          {},
          importedTokenRef.current,
        );
        if (cancelled) return;
        if (user.userType !== UserType.ADMIN) {
          setError("Admin access is required to use this dashboard.");
          return;
        }
        saveAuth({ user, accessToken: importedTokenRef.current }, true);
        router.replace(safeNext(searchParams.get("next")));
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to import this session.",
          );
        }
      }
    }
    void importSession();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className={styles["auth-page"]}>
      <div className={styles["auth-card"]}>
        <h1>Connecting your session</h1>
        {error ? (
          <>
            <div className={styles["error-banner"]}>{error}</div>
            <a href="/login" className={styles["btn-primary"]}>
              Sign in again
            </a>
          </>
        ) : (
          <p className={styles.subtitle}>
            Please wait while we open your dashboard.
          </p>
        )}
      </div>
    </main>
  );
}

export default function AuthHandoffPage() {
  return (
    <Suspense fallback={<div className={styles["auth-page"]} />}>
      <HandoffContent />
    </Suspense>
  );
}
