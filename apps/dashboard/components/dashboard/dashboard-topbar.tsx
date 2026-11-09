"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DashboardUser } from "@/lib/auth";
import { SidebarChevron, SidebarNavIcon } from "./sidebar-nav-icons";
import styles from "../../app/dashboard/dashboard.module.css";

export function DashboardTopbar({ user, onLogout }: { user: DashboardUser; onLogout: () => void }) {
  const initials = (user.firstName?.charAt(0) ?? "") + (user.lastName?.charAt(0) ?? "");
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [open]);
  return (
    <header className={styles["dashboard-topbar"]}>
      <div className={styles["topbar-profile-container"]} ref={container}>
        <button type="button" className={styles["topbar-profile-trigger"]} onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu" aria-expanded={open} aria-label="Open account menu">
          {user.profileImageUrl ? (
            <Image src={user.profileImageUrl} alt="Profile" width={40} height={40} unoptimized className={styles["topbar-avatar"]} />
          ) : (
            <span className={styles["topbar-avatar-fallback"]} aria-hidden>{initials.toUpperCase() || "P"}</span>
          )}
          <span className={styles["topbar-user-text"]}>
            <strong>{user.firstName} {user.lastName}</strong>
            <span>{user.email}</span>
          </span>
          <SidebarChevron className={styles["topbar-profile-chevron"]} />
        </button>
        {open && (
          <div className={styles["topbar-profile-menu"]} role="menu" aria-label="Account options">
            <Link href="/dashboard/settings" role="menuitem" onClick={() => setOpen(false)}>
              <SidebarNavIcon name="settings" className={styles["sidebar-nav-icon"]} /> Settings
            </Link>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>
              <SidebarNavIcon name="logout" className={styles["sidebar-nav-icon"]} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
