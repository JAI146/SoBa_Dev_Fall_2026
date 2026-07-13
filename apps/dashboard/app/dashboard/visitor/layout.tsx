"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import { clearAuth, getStoredUser, getToken, type StoredUser } from "@/lib/auth";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import type { SidebarNavIconName } from "@/components/dashboard/sidebar-nav-icons";
import styles from "../dashboard.module.css";

const DONOR_TYPES = new Set(["visitor", "sponsor"]);

const NAV_ITEMS: {
  href: string;
  match: string;
  exact?: boolean;
  key:
    | "overview"
    | "myFamilies"
    | "sponsorships"
    | "transferRequests"
    | "tickets"
    | "messages"
    | "settings";
  icon: SidebarNavIconName;
}[] = [
  {
    href: "/dashboard/visitor",
    match: "/dashboard/visitor",
    exact: true,
    key: "overview",
    icon: "overview",
  },
  {
    href: "/dashboard/visitor/my-families",
    match: "/my-families",
    key: "myFamilies",
    icon: "myFamilies",
  },
  {
    href: "/dashboard/visitor/sponsorships",
    match: "/sponsorships",
    key: "sponsorships",
    icon: "sponsorships",
  },
  {
    href: "/dashboard/visitor/transfer-requests",
    match: "/transfer-requests",
    key: "transferRequests",
    icon: "transferRequests",
  },
  {
    href: "/dashboard/visitor/tickets",
    match: "/tickets",
    key: "tickets",
    icon: "tickets",
  },
  {
    href: "/dashboard/visitor/chat",
    match: "/chat",
    key: "messages",
    icon: "messages",
  },
  {
    href: "/dashboard/visitor/settings",
    match: "/settings",
    key: "settings",
    icon: "settings",
  },
];

export default function DonorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (!token || !stored) {
      router.replace("/login");
      return;
    }
    if (stored.userType === "admin") {
      router.replace("/dashboard/admin");
      return;
    }
    if (stored.userType === "family") {
      router.replace("/dashboard/family");
      return;
    }
    if (!DONOR_TYPES.has(stored.userType)) {
      router.replace("/login");
      return;
    }
    setUser(stored);
  }, [router]);

  const navItems = useMemo((): DashboardNavItem[] => {
    return NAV_ITEMS.map((item) => {
      const active = item.exact
        ? pathname === item.href
        : (pathname?.includes(item.match) ?? false);
      return {
        href: item.href,
        active,
        icon: item.icon,
        label: t(`visitor.nav.${item.key}`),
      };
    });
  }, [pathname, t]);

  if (!user) {
    return <div className={styles["dashboard-loading"]}>{t("common.loading")}</div>;
  }

  return (
    <DashboardShell
      brandHref="/dashboard/visitor"
      brandLabel={t("visitor.brand")}
      navItems={navItems}
      user={user}
      logoutLabel={t("visitor.logout")}
      messagesHref="/dashboard/visitor/chat"
      onLogout={() => {
        clearAuth();
        router.push("/login");
      }}
    >
      {children}
    </DashboardShell>
  );
}
