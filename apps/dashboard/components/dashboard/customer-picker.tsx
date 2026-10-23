"use client";
import { useId, useRef, useState } from "react";
import {
  adminUsersResponseSchema,
  type AdminUserListItem,
} from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import layout from "../../app/dashboard/dashboard.module.css";
import styles from "../../app/dashboard/notifications/notifications.module.css";
export function CustomerPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (id: string) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState(""),
    [items, setItems] = useState<AdminUserListItem[]>([]),
    [selected, setSelected] = useState<AdminUserListItem | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [searched, setSearched] = useState(false);
  const request = useRef(0);
  async function find() {
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "8",
        search: search.trim(),
      });
      const data = await apiRequest(
        `/admin/users?${params}`,
        {},
        getToken(),
        adminUsersResponseSchema,
      );
      if (current === request.current) {
        setItems(data.items);
        setSearched(true);
      }
    } catch {
      if (current === request.current) {
        setError(
          "Customer search is unavailable. You can enter a customer ID below.",
        );
        setItems([]);
      }
    } finally {
      if (current === request.current) setLoading(false);
    }
  }
  return (
    <div className={styles.customerPicker}>
      <label htmlFor={id}>Find a customer</label>
      <div className={styles.searchRow}>
        <input
          id={id}
          value={search}
          placeholder="Name or email"
          maxLength={255}
          onChange={(event) => {
            setSearch(event.target.value);
            ++request.current;
            setLoading(false);
            setItems([]);
            setSearched(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void find();
            }
          }}
        />
        <button
          type="button"
          className={layout["btn-toolbar-primary"]}
          disabled={loading}
          onClick={() => void find()}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
      {selected && selected.id === value && (
        <div className={styles.selectedCustomer}>
          <strong>
            {selected.displayName ||
              `${selected.firstName} ${selected.lastName}`}
          </strong>
          <span>{selected.email}</span>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              onSelect("");
            }}
          >
            Change
          </button>
        </div>
      )}
      {items.length > 0 && (
        <ul className={styles.searchResults} aria-label="Matching customers">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(item);
                  onSelect(item.id);
                  setItems([]);
                  setSearched(false);
                }}
              >
                <strong>
                  {item.displayName || `${item.firstName} ${item.lastName}`}
                </strong>
                <span>{item.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && !items.length && (
        <p role="status">No matching customers. Try another name or email.</p>
      )}
      {error && <p role="alert">{error}</p>}
      <details className={styles.idFallback}>
        <summary>Use customer ID instead</summary>
        <label>
          Customer ID
          <input
            value={value}
            onChange={(event) => {
              setSelected(null);
              onSelect(event.target.value.trim());
            }}
          />
        </label>
      </details>
    </div>
  );
}
