"use client";

import {
  adminSavingsCustomersResponseSchema,
  type AdminSavingsCustomer,
} from "@purposemint/contracts";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "../../dashboard.module.css";
import tableStyles from "./savings.module.css";
import { GoalProgressModal } from "./goal-progress-modal";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
type FilterColumn =
  "user" | "savedAmount" | "progress" | "goalCount" | "pathwayEligible";

type SavingsRow = AdminSavingsCustomer & {
  user: string;
  progress: number | null;
};

const columns: ColumnDef<SavingsRow>[] = [
  {
    id: "user",
    accessorFn: (row) => row.user,
    header: "User",
    filterFn: "includesString",
    cell: ({ row }) => (
      <Link
        className={tableStyles.userLink}
        href={`/dashboard/users/${row.original.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <strong>{row.original.name}</strong>
        <span>{row.original.email}</span>
      </Link>
    ),
  },
  {
    accessorKey: "savedAmount",
    header: "Savings",
    filterFn: (row, id, value) => Number(row.getValue(id)) >= Number(value),
    cell: ({ getValue }) => money.format(getValue<number>()),
  },
  {
    accessorKey: "progress",
    header: "Savings progress",
    filterFn: (row, id, value) =>
      (row.getValue<number | null>(id) ?? -1) >= Number(value),
    cell: ({ row }) => (
      <div className={tableStyles.progressCell}>
        <strong>
          {row.original.progress === null
            ? "—"
            : `${row.original.progress.toFixed(1)}%`}
        </strong>
        <div className={styles["progress-track"]}>
          <span
            style={{ width: `${Math.min(row.original.progress ?? 0, 100)}%` }}
          />
        </div>
        <small>of {money.format(row.original.targetAmount)} target</small>
      </div>
    ),
  },
  { accessorKey: "goalCount", header: "Goals", filterFn: "equals" },
  {
    accessorKey: "pathwayEligible",
    header: "Pathway eligible",
    filterFn: "equals",
    cell: ({ getValue }) => (
      <span
        className={`${styles.badge} ${getValue<boolean>() ? styles["badge-active"] : styles["badge-inactive"]}`}
      >
        {getValue<boolean>() ? "Yes" : "No"}
      </span>
    ),
  },
];

export default function SavingsCustomersPage() {
  const query = useAdminQuery(
    "/admin/savings/customers",
    adminSavingsCustomersResponseSchema,
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filterColumn, setFilterColumn] = useState<FilterColumn>("user");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const closeGoalProgress = useCallback(() => setSelectedCustomerId(null), []);
  const data = useMemo<SavingsRow[]>(
    () =>
      (query.data?.items ?? []).map((item) => ({
        ...item,
        user: `${item.name} ${item.email}`,
        progress:
          item.targetAmount > 0
            ? (item.savedAmount / item.targetAmount) * 100
            : null,
      })),
    [query.data],
  );
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  const selected = table.getColumn(filterColumn);
  const goalCounts = Array.from(
    table.getColumn("goalCount")?.getFacetedUniqueValues().keys() ?? [],
  )
    .map(Number)
    .sort((a, b) => a - b);
  const filterValue = selected?.getFilterValue();

  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading customer savings…" />;

  return (
    <main className={styles["dashboard-page"]}>
      <Link className={styles["back-link"]} href="/dashboard/progress">
        ← Back to Progress
      </Link>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Savings & financial progress</p>
          <h1>Customer savings</h1>
          <p>
            Combined manually recorded goal savings—not verified bank balances.
          </p>
        </div>
      </div>
      <section
        className={styles["crud-card"]}
        aria-label="Customer savings table"
      >
        <div className={tableStyles.toolbar}>
          <label className={styles["filter-field"]}>
            Filter column
            <select
              value={filterColumn}
              onChange={(event) => {
                setFilterColumn(event.target.value as FilterColumn);
                setColumnFilters([]);
                table.setPageIndex(0);
              }}
            >
              <option value="user">User (name or email)</option>
              <option value="savedAmount">Savings</option>
              <option value="progress">Savings progress</option>
              <option value="goalCount">Goals</option>
              <option value="pathwayEligible">Pathway eligible</option>
            </select>
          </label>
          <label className={styles["filter-field"]}>
            {filterColumn === "savedAmount"
              ? "Minimum savings ($)"
              : filterColumn === "progress"
                ? "Minimum progress (%)"
                : filterColumn === "user"
                  ? "Name or email"
                  : "Value"}
            {filterColumn === "goalCount" ||
            filterColumn === "pathwayEligible" ? (
              <select
                value={filterValue === undefined ? "" : String(filterValue)}
                onChange={(event) => {
                  selected?.setFilterValue(
                    event.target.value === ""
                      ? undefined
                      : filterColumn === "goalCount"
                        ? Number(event.target.value)
                        : event.target.value === "true",
                  );
                  table.setPageIndex(0);
                }}
              >
                <option value="">All</option>
                {filterColumn === "goalCount" ? (
                  goalCounts.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </>
                )}
              </select>
            ) : (
              <input
                className={tableStyles.filterInput}
                type={filterColumn === "user" ? "search" : "number"}
                min={filterColumn === "user" ? undefined : 0}
                step={filterColumn === "savedAmount" ? "0.01" : "0.1"}
                placeholder={
                  filterColumn === "user"
                    ? "Search name or email"
                    : "Enter minimum"
                }
                value={String(filterValue ?? "")}
                onChange={(event) => {
                  selected?.setFilterValue(event.target.value || undefined);
                  table.setPageIndex(0);
                }}
              />
            )}
          </label>
          <button
            className={styles["btn-toolbar-primary"]}
            type="button"
            onClick={() => {
              setColumnFilters([]);
              table.resetSorting();
              table.setPageIndex(0);
            }}
          >
            Clear filters & sort
          </button>
        </div>
        <div className={styles["table-wrap"]}>
          <table
            className={`${styles["data-table"]} ${tableStyles.customerTable}`}
          >
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      aria-sort={
                        header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                      }
                    >
                      <button
                        type="button"
                        className={tableStyles.sortButton}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <span aria-hidden="true">
                          {header.column.getIsSorted() === "asc"
                            ? "↑"
                            : header.column.getIsSorted() === "desc"
                              ? "↓"
                              : "↕"}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={tableStyles.clickableRow}
                  tabIndex={0}
                  aria-label={`View goal progress for ${row.original.name}`}
                  onClick={() => setSelectedCustomerId(row.original.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedCustomerId(row.original.id);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell ??
                          ((context) => String(context.getValue())),
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No customers match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <span>
            {table.getFilteredRowModel().rows.length.toLocaleString()} of{" "}
            {data.length.toLocaleString()} customers
          </span>
          <div>
            <button
              type="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </button>
            <span>
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <button
              type="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      {selectedCustomerId && (
        <GoalProgressModal
          customerId={selectedCustomerId}
          onClose={closeGoalProgress}
        />
      )}
    </main>
  );
}
