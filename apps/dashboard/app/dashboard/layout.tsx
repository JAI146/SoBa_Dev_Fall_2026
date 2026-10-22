"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  UserType,
  AdminRole,
  userPublicSchema,
  subscriptionAdminAccessSchema,
  type MessageResponse,
  type UserPublic,
} from "@purposemint/contracts";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { clearAuth, getToken } from "@/lib/auth";
import { ApiError, apiRequest } from "@/lib/api-client";
import { SIGNED_OUT_EVENT } from "@/lib/session-activity";
import { SessionMonitor } from "@/components/auth/session-monitor";
import styles from "./dashboard.module.css";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  // Keep the verified role for feature navigation; the API still enforces access.
  const [user, setUser] = useState<UserPublic | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const signedOut = () => {
      setUser(null);
      router.replace("/login");
    };
    window.addEventListener(SIGNED_OUT_EVENT, signedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, signedOut);
  }, [router]);
  const [canViewSubscriptions, setCanViewSubscriptions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSessionError(false);
    const token = getToken();
    if (!token) {
      clearAuth();
      router.replace("/login");
      setAuthChecked(true);
      return () => {
        cancelled = true;
      };
    }

    async function verifyAdminSession() {
      try {
        const currentUser = await apiRequest<UserPublic>(
          "/users/me",
          {},
          token,
          userPublicSchema,
        );
        if (cancelled) return;
        if (currentUser.userType !== UserType.ADMIN) {
          clearAuth();
          router.replace("/login");
          return;
        }
        setUser(currentUser);
        try {
          await apiRequest(
            "/admin/subscription-management/permissions",
            {},
            token,
            subscriptionAdminAccessSchema,
          );
          if (!cancelled) setCanViewSubscriptions(true);
        } catch {
          if (!cancelled) setCanViewSubscriptions(false);
        }
      } catch (error) {
        if (!cancelled) {
          if (
            error instanceof ApiError &&
            (error.status === 401 || error.status === 403)
          ) {
            clearAuth();
            router.replace("/login");
          } else setSessionError(true);
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }
    void verifyAdminSession();
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  const handleLogout = useCallback(() => {
    const token = getToken();
    setUser(null);
    void (async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        if (token)
          await Promise.race([
            apiRequest<MessageResponse>(
              "/auth/logout",
              { method: "POST" },
              token,
            ),
            new Promise<void>((resolve) => {
              timeout = setTimeout(resolve, 5000);
            }),
          ]);
      } catch {
        // Local sign-out must still finish if the API is unavailable.
      } finally {
        if (timeout) clearTimeout(timeout);
        clearAuth();
        router.replace("/login");
      }
    })();
  }, [router]);

  if (!authChecked || !user) {
    return (
      <main className={styles["dashboard-loading"]}>
        <span className={styles["loading-spinner"]} aria-hidden />
        <p>
          {sessionError
            ? "Unable to connect. Your session has not been cleared."
            : authChecked
              ? "Redirecting to sign in…"
              : "Loading dashboard…"}
        </p>
        {sessionError && (
          <button onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        )}
      </main>
    );
  }

  const navItems: DashboardNavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: "overview",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/users",
      label: "Users",
      icon: "users",
      active: pathname.startsWith("/dashboard/users"),
    },
    // Show the incentives workspace only to its currently supported staff role.
    ...(user.adminRole === AdminRole.SUPER_ADMIN
      ? [
          {
            href: "/dashboard/incentives",
            label: "Incentives & Benefits",
            icon: "incentives" as const,
            active: pathname.startsWith("/dashboard/incentives"),
          },
        ]
      : []),
    {
      href: "/dashboard/progress",
      label: "Progress",
      icon: "progress",
      active:
        pathname.startsWith("/dashboard/progress") ||
        pathname.startsWith("/dashboard/pathway-applications"),
    },
    {
      href: "/dashboard/audit",
      label: "Audit & compliance",
      icon: "roles",
      active: pathname.startsWith("/dashboard/audit"),
    },
    {
      href: "/dashboard/upgrade-intents",
      label: "Upgrade intents",
      icon: "upgrades",
      active: pathname.startsWith("/dashboard/upgrade-intents"),
    },
    {
      href: "/dashboard/manage-roles",
      label: "Manage roles",
      icon: "roles",
      active: pathname.startsWith("/dashboard/manage-roles"),
    },
    {
      href: "/dashboard/coaching",
      label: "KiroMoney",
      icon: "coaching",
      active: pathname.startsWith("/dashboard/coaching"),
    },
    {
      href: "/dashboard/system-health",
      label: "System health",
      icon: "health",
      active: pathname.startsWith("/dashboard/system-health"),
    },
    ...(canViewSubscriptions
      ? [
          {
            href: "/dashboard/subscriptions",
            label: "Subscriptions & Plans",
            icon: "upgrades" as const,
            active: pathname.startsWith("/dashboard/subscriptions"),
          },
        ]
      : []),
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: "settings",
      active: pathname.startsWith("/dashboard/settings"),
    },
  ];

  return (
    <SessionMonitor userId={user.id} onLogout={handleLogout}>
      <DashboardShell
        navItems={navItems}
        user={user}
        onLogout={() => void handleLogout()}
      >
        {children}
      </DashboardShell>
    </SessionMonitor>
  );
}
