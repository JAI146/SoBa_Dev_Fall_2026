"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import {
  clearAuth,
  getStoredUser,
  getToken,
  type DashboardUser,
  type StoredUser,
} from "@/lib/auth";
import styles from "./dashboard.module.css";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  // const [user, setUser] = useState<StoredUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // useEffect(() => {
  //   const storedUser = getStoredUser();
  //   if (!getToken() || !storedUser) {
  //     clearAuth();
  //     router.replace("/dashboard");
  //     setAuthChecked(true);
  //     return;
  //   }
  //   setUser(storedUser);
  //   setAuthChecked(true);
  // }, [router]);

  function handleLogout() {
    clearAuth();
    router.replace("/dashboard");
  }

  // if (!authChecked || !user) {
  //   return (
  //     <main className={styles["dashboard-loading"]}>
  //       <span className={styles["loading-spinner"]} aria-hidden />
  //       <p>{authChecked ? "Redirecting to sign in…" : "Loading dashboard…"}</p>
  //     </main>
  //   );
  // }

  const navItems: DashboardNavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: "overview",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/examples/crud",
      label: "CRUD Reference",
      icon: "crud",
      active: pathname.startsWith("/dashboard/examples/crud"),
    },
  ];

  // Placeholder until the auth check above is switched back on.
  const user: DashboardUser = {
    firstName: "",
    lastName: "",
    email: "",
    profileImageUrl: null,
  };

  return (
    <DashboardShell navItems={navItems} user={user} onLogout={handleLogout}>
      {children}
    </DashboardShell>
  );
}
