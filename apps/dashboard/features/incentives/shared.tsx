"use client";

/**
 * Provides consistent money, label, and UTC date formatting for incentive screens,
 * plus a searchable customer picker backed by the existing admin user endpoint.
 */
import { useEffect, useId, useState } from "react";
import { adminUsersResponseSchema } from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "./incentives.module.css";

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
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [users, setUsers] = useState<
    ReturnType<typeof adminUsersResponseSchema.parse>["items"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const id = useId();

  useEffect(() => {
    if (value) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await apiRequest(
          `/admin/users?pageSize=20&search=${encodeURIComponent(input.trim())}`,
          { method: "GET" },
          getToken(),
          adminUsersResponseSchema,
        );
        if (!cancelled) setUsers(result.items);
      } catch (cause) {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load customers.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, value]);

  function select(user: (typeof users)[number]) {
    setInput(`${user.firstName} ${user.lastName} · ${user.email}`);
    onChange(user.id);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div
      className={styles.customerPicker}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>Customer</label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={
          open && users[active] ? `${id}-option-${active}` : undefined
        }
        value={input}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setInput(event.target.value);
          onChange("");
          setUsers([]);
          setLoading(true);
          setError("");
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((index) =>
              users.length === 0
                ? -1
                : event.key === "ArrowDown"
                  ? Math.min(index + 1, users.length - 1)
                  : Math.max(index - 1, 0),
            );
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            if (users[active]) select(users[active]);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder="Search by name or email"
        autoComplete="off"
      />
      {open ? (
        <div className={styles.customerOptions}>
          <ul
            id={`${id}-options`}
            role="listbox"
            aria-label="Customers"
            aria-busy={loading}
          >
            {!loading && !error
              ? users.map((user, index) => (
                  <li
                    key={user.id}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={value === user.id}
                    data-active={active === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(user)}
                  >
                    {user.firstName} {user.lastName} · {user.email}
                  </li>
                ))
              : null}
          </ul>
          {loading || (!error && users.length === 0) ? (
            <p role="status">
              {loading ? "Loading customers…" : "No matching customers."}
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
