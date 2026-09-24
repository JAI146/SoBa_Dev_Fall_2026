"use client";

/**
 * Provides consistent money, label, and UTC date formatting for incentive screens,
 * plus a searchable customer picker backed by the existing admin user endpoint.
 */
import { useState, type FormEvent } from "react";
import { adminUsersResponseSchema } from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "./incentives.module.css";
import base from "@/app/dashboard/dashboard.module.css";

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const label = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export const dateTime = (value: string | null) =>
  value
    ? `${new Date(value).toLocaleString("en-US", { timeZone: "UTC" })} UTC`
    : "Not recorded";
export function UserPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const query = useAdminQuery(
    `/admin/users?pageSize=20&search=${encodeURIComponent(search)}`,
    adminUsersResponseSchema,
  );
  function find(e: FormEvent) {
    e.preventDefault();
    onChange("");
    setSearch(input.trim());
  }
  return (
    <div className={styles.stack}>
      <form onSubmit={find} className={styles.filters}>
        <label>
          Find customer
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Name or email"
          />
        </label>
        <button className={base["btn-toolbar-primary"]}>Search</button>
      </form>
      {query.error ? (
        <p role="alert" className={styles.error}>
          {query.error}
        </p>
      ) : null}
      <label>
        Customer
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={query.loading}
          required
        >
          <option value="">
            {query.loading ? "Loading customers…" : "Select a customer"}
          </option>
          {query.data?.items.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName} · {user.email}
            </option>
          ))}
        </select>
      </label>
      {query.data?.items.length === 0 ? <p>No matching customers.</p> : null}
    </div>
  );
}
