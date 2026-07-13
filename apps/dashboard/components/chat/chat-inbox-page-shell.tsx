"use client";

import type { ReactNode } from "react";
import { SearchIcon } from "@/components/dashboard/action-icons";
import styles from "@/app/dashboard/dashboard.module.css";

export function ChatInboxPageShell({ children }: { children: ReactNode }) {
  return <div className={styles["chat-inbox-page"]}>{children}</div>;
}

export function ChatInboxSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className={styles["chat-inbox-search"]}>
      <SearchIcon className={styles["chat-inbox-search__icon"]} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={styles["chat-inbox-search__input"]}
      />
    </label>
  );
}
