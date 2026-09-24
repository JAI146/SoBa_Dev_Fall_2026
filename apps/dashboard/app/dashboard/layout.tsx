"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  UserType,
  userPublicSchema,
  type MessageResponse,
  type UserPublic,
} from "@purposemint/contracts";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import {
  clearAuth,
  getToken,
  type DashboardUser,
} from "@/lib/auth";
import { apiRequest } from "@/lib/api-client";
import styles from "./dashboard.module.css";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
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
      } catch {
        if (!cancelled) {
          clearAuth();
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }
    void verifyAdminSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    const token = getToken();
    try {
      if (token) {
        await apiRequest<MessageResponse>(
          "/auth/logout",
          { method: "POST" },
          token,
        );
      }
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }

  if (!authChecked || !user) {
    return (
      <main className={styles["dashboard-loading"]}>
        <span className={styles["loading-spinner"]} aria-hidden />
        <p>{authChecked ? "Redirecting to sign in…" : "Loading dashboard…"}</p>
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
      href: "/dashboard/pathway-applications",
      label: "Pathway applications",
      icon: "pathways",
      active: pathname.startsWith("/dashboard/pathway-applications"),
    },
    {
      href: "/dashboard/users",
      label: "Users",
      icon: "users",
      active: pathname.startsWith("/dashboard/users"),
    },
    {
      href: "/dashboard/progress",
      label: "Progress",
      icon: "progress",
      active: pathname.startsWith("/dashboard/progress"),
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
  ];

  return (
    <DashboardShell
      navItems={navItems}
      user={user}
      onLogout={() => void handleLogout()}
    >
      {children}
    </DashboardShell>
  );
}
