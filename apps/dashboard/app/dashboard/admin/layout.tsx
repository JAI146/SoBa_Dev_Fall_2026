"use client";



import { usePathname, useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@muakhah/i18n";

import {
  AdminPermission,
  type AdminPermissionValue,
} from "@muakhah/contracts";

import {

  clearAuth,

  getDashboardPath,

  getStoredUser,

  getToken,

  updateStoredUser,

  type StoredUser,

} from "@/lib/auth";

import { apiRequest } from "@/lib/api-client";

import {

  canAccessAdminRoute,

  filterAdminNav,

} from "@/lib/admin-nav";

import {

  DashboardShell,

  type DashboardNavItem,

} from "@/components/dashboard/dashboard-shell";

import styles from "../dashboard.module.css";



export default function AdminLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  const { t } = useI18n();

  const pathname = usePathname();

  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);



  useEffect(() => {

    async function bootstrap() {

      const token = getToken();

      const stored = getStoredUser();

      if (!token || !stored) {

        router.replace("/login");

        return;

      }

      if (stored.userType !== "admin") {

        router.replace(getDashboardPath(stored.userType));

        return;

      }

      setUser(stored);

      try {

        const data = await apiRequest<{ user: StoredUser }>("/auth/me", {}, token);

        updateStoredUser(data.user);

        setUser(data.user);

      } catch {

        // Keep the stored session if profile refresh fails.

      }

    }



    void bootstrap();

  }, [router]);



  useEffect(() => {

    if (!user) return;

    if (!canAccessAdminRoute(pathname, user.permissions as AdminPermissionValue[] | undefined)) {

      router.replace("/dashboard/admin");

    }

  }, [pathname, router, user]);



  const navItems = useMemo((): DashboardNavItem[] => {

    return filterAdminNav(user?.permissions as AdminPermissionValue[] | undefined).map(

      (item) => {

        const active =

          item.match === null

            ? pathname === "/dashboard/admin"

            : pathname?.includes(item.match);

        return {

          href: item.href,

          active: active ?? false,

          icon: item.icon,

          label: t(`admin.nav.${item.key}` as "admin.nav.overview"),

        };

      },

    );

  }, [pathname, t, user?.permissions]);



  const topbarLinks = useMemo(() => {
    const permissions = user?.permissions as AdminPermissionValue[] | undefined;
    const granted = permissions ?? [];
    return {
      messagesHref: granted.includes(AdminPermission.CHAT_MODERATE)
        ? "/dashboard/admin/chat"
        : undefined,
      notificationsHref: granted.includes(AdminPermission.PROFILE_UPDATES_REVIEW)
        ? "/dashboard/admin/profile-update-requests"
        : undefined,
    };
  }, [user?.permissions]);



  if (!user) {

    return <div className={styles["dashboard-loading"]}>{t("common.loading")}</div>;

  }



  return (

    <DashboardShell

      brandLabel={t("admin.brand")}

      navItems={navItems}

      user={user}

      logoutLabel={t("admin.logout")}

      messagesHref={topbarLinks.messagesHref}

      notificationsHref={topbarLinks.notificationsHref}

      onLogout={() => {

        clearAuth();

        router.push("/login");

      }}

    >

      {children}

    </DashboardShell>

  );

}

