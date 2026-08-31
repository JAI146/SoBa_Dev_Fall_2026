"use client";

import { adminUsersResponseSchema } from "@purposemint/contracts";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { SearchIcon } from "@/components/dashboard/action-icons";
import { formatAdminDate, formatEnum, formatTier } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../dashboard.module.css";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    return `/admin/users?${params.toString()}`;
  }, [page, search]);
  const query = useAdminQuery(path, adminUsersResponseSchema);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading users…" />;
  const data = query.data;

  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Customers</p>
          <h1>Users</h1>
          <p>Search customer accounts and review product activity.</p>
        </div>
      </div>
      <section className={styles["crud-card"]}>
        <form className={styles.filters} onSubmit={submitSearch}>
          <label className={styles["search-field"]}>
            <span className="sr-only">Search users</span>
            <SearchIcon />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name or email"
            />
          </label>
          <button type="submit" className={styles["btn-toolbar-primary"]}>
            Search
          </button>
        </form>
        <div className={styles["table-wrap"]}>
          <table className={styles["data-table"]}>
            <thead>
              <tr>
                <th>User</th>
                <th>Membership</th>
                <th>Onboarding</th>
                <th>Email</th>
                <th>Joined</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>
                      {user.displayName ?? `${user.firstName} ${user.lastName}`}
                    </strong>
                    <span>{user.email}</span>
                  </td>
                  <td>{formatTier(user.tier)}</td>
                  <td>
                    <span className={styles.badge}>
                      {formatEnum(user.onboardingStatus)}
                    </span>
                  </td>
                  <td>{user.emailVerifiedAt ? "Verified" : "Not verified"}</td>
                  <td>{formatAdminDate(user.createdAt, user.timeZone)}</td>
                  <td>
                    <Link
                      className={styles["table-link"]}
                      href={`/dashboard/users/${user.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No users match the current search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPage={setPage}
        />
      </section>
    </main>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className={styles.pagination}>
      <span>{total.toLocaleString()} users</span>
      <div>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
