"use client";



import { usePathname, useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@muakhah/i18n";

import { clearAuth, getStoredUser, getToken, type StoredUser } from "@/lib/auth";

import {

  DashboardShell,

  type DashboardNavItem,

} from "@/components/dashboard/dashboard-shell";

import styles from "../dashboard.module.css";



const FAMILY_NAV_ITEMS = [

  {

    href: "/dashboard/family",

    icon: "overview" as const,

    isActive: (pathname: string) => pathname === "/dashboard/family",

    labelKey: "family.nav.overview" as const,

  },

  {

    href: "/dashboard/family/donors",

    icon: "donors" as const,

    isActive: (pathname: string) =>

      pathname === "/dashboard/family/donors" ||

      pathname.startsWith("/dashboard/family/donors/"),

    labelKey: "family.nav.donors" as const,

  },

  {

    href: "/dashboard/family/transfers",

    icon: "transferRequests" as const,

    isActive: (pathname: string) =>

      pathname === "/dashboard/family/transfers" ||

      pathname.startsWith("/dashboard/family/transfers/"),

    labelKey: "family.nav.transfers" as const,

  },

  {

    href: "/dashboard/family/chat",

    icon: "chat" as const,

    isActive: (pathname: string) =>

      pathname === "/dashboard/family/chat" ||

      pathname.startsWith("/dashboard/family/chat/"),

    labelKey: "family.nav.chat" as const,

  },

  {

    href: "/dashboard/family/profile",

    icon: "profile" as const,

    isActive: (pathname: string) => pathname === "/dashboard/family/profile",

    labelKey: "family.nav.profile" as const,

  },

];



export default function FamilyLayout({

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

    if (stored.userType === "visitor" || stored.userType === "sponsor") {

      router.replace("/dashboard/visitor");

      return;

    }

    if (stored.userType !== "family") {

      router.replace("/login");

      return;

    }

    setUser(stored);

  }, [router]);



  const navItems = useMemo((): DashboardNavItem[] => {

    return FAMILY_NAV_ITEMS.map((item) => ({

      href: item.href,

      active: item.isActive(pathname ?? ""),

      icon: item.icon,

      label: t(item.labelKey),

    }));

  }, [pathname, t]);



  if (!user) {

    return <div className={styles["dashboard-loading"]}>{t("common.loading")}</div>;

  }



  return (

    <DashboardShell

      brandLabel={t("family.brand")}

      navItems={navItems}

      user={user}

      logoutLabel={t("family.logout")}

      messagesHref="/dashboard/family/chat"

      notificationsHref="/dashboard/family/profile"

      onLogout={() => {

        clearAuth();

        router.push("/login");

      }}

    >

      {children}

    </DashboardShell>

  );

}

