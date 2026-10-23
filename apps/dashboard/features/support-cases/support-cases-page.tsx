"use client";

import {
  adminMyPermissionsResponseSchema,
  AdminPermission,
  hasAdminPermission,
  supportCaseCategoriesResponseSchema,
  supportCasePriorityValues,
  supportCasesResponseSchema,
  supportCaseStatusValues,
  supportCaseTypeValues,
  type SupportCaseListItem,
} from "@purposemint/contracts";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { formatAdminDate, formatEnum } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./support-cases.module.css";
import { CreateCaseDialog } from "./create-case-dialog";
import {
  PRIORITY_RANK,
  PriorityBadge,
  StatusBadge,
  TypeBadge,
  useStaffOptions,
} from "./shared";

const PAGE_SIZE = 20;

const columns: ColumnDef<SupportCaseListItem>[] = [
  {
    id: "case",
    accessorFn: (row) => row.caseNumber,
    header: "Case",
    cell: ({ row }) => (
      <Link
        className={styles["customer-link"]}
        href={`/dashboard/support-cases/${row.original.id}`}
      >
        <strong>
          #{row.original.caseNumber} · {row.original.subject}
        </strong>
        <span>
          {row.original.customer.name} · {row.original.customer.email}
        </span>
      </Link>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    enableSorting: false,
    cell: ({ row }) => <TypeBadge type={row.original.type} />,
  },
  {
    id: "category",
    accessorFn: (row) => row.category.label,
    header: "Category",
  },
  {
    id: "priority",
    accessorFn: (row) => PRIORITY_RANK[row.priority],
    header: "Priority",
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "assignee",
    accessorFn: (row) => row.assignee?.name ?? "",
    header: "Assignee",
    cell: ({ row }) => row.original.assignee?.name ?? "Unassigned",
  },
  {
    accessorKey: "createdAt",
    header: "Opened",
    cell: ({ row }) =>
      formatAdminDate(row.original.createdAt, row.original.customer.timeZone),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        className={base["table-link"]}
        href={`/dashboard/support-cases/${row.original.id}`}
      >
        Open
      </Link>
    ),
  },
];

export function SupportCasesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [creating, setCreating] = useState(false);

  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (type) params.set("type", type);
    if (categoryId) params.set("categoryId", categoryId);
    if (assignee) params.set("assignee", assignee);
    return `/admin/support-cases?${params.toString()}`;
  }, [page, search, status, priority, type, categoryId, assignee]);

  const query = useAdminQuery(path, supportCasesResponseSchema);
  const categories = useAdminQuery(
    "/admin/support-cases/categories",
    supportCaseCategoriesResponseSchema,
  );
  const permissions = useAdminQuery(
    "/admin/me/permissions",
    adminMyPermissionsResponseSchema,
  );
  const { staff } = useStaffOptions();
  // UX only; the API enforces support_cases.edit on every mutation.
  const canEdit = permissions.data
    ? hasAdminPermission(
        null,
        AdminPermission.SUPPORT_CASES_EDIT,
        permissions.data.permissions,
      )
    : false;

  const table = useReactTable({
    data: query.data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function applySearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function filterSelect(
    labelText: string,
    value: string,
    onChange: (next: string) => void,
    options: Array<{ value: string; label: string }>,
    allLabel: string,
  ) {
    return (
      <label className={base["filter-field"]}>
        <span>{labelText}</span>
        <select
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (query.error && !query.data)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (!query.data) return <DashboardLoading label="Loading cases…" />;
  const data = query.data;

  return (
    <main className={base["dashboard-page"]}>
      <div className={base["page-header"]}>
        <div>
          <p className={base.eyebrow}>Customer support</p>
          <h1>Support cases</h1>
          <p>Receive, investigate, escalate, and resolve customer requests.</p>
        </div>
        {canEdit ? (
          <div className={base["page-actions-group"]}>
            <button
              type="button"
              className={base["btn-primary"]}
              onClick={() => setCreating(true)}
            >
              New case
            </button>
          </div>
        ) : null}
      </div>

      <section className={base["crud-card"]}>
        <div className={`${base.filters} ${styles["filters-wrap"]}`}>
          <form className={styles["filter-form"]} onSubmit={applySearch}>
            <div className={styles["search-group"]}>
              <label className={base["filter-field"]}>
                <span>Search</span>
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Case number, subject, or customer"
                  className={styles["filter-input"]}
                />
              </label>
              <button type="submit" className={base["btn-toolbar-primary"]}>
                Search
              </button>
            </div>
            {filterSelect(
              "Status",
              status,
              setStatus,
              supportCaseStatusValues.map((value) => ({
                value,
                label: formatEnum(value),
              })),
              "All statuses",
            )}
            {filterSelect(
              "Priority",
              priority,
              setPriority,
              supportCasePriorityValues.map((value) => ({
                value,
                label: formatEnum(value),
              })),
              "All priorities",
            )}
            {filterSelect(
              "Type",
              type,
              setType,
              supportCaseTypeValues.map((value) => ({
                value,
                label: formatEnum(value),
              })),
              "All types",
            )}
            {filterSelect(
              "Category",
              categoryId,
              setCategoryId,
              (categories.data?.items ?? []).map((category) => ({
                value: category.id,
                label: category.label,
              })),
              "All categories",
            )}
            {filterSelect(
              "Assignee",
              assignee,
              setAssignee,
              [
                { value: "unassigned", label: "Unassigned" },
                ...staff.map((member) => ({
                  value: member.id,
                  label: member.name,
                })),
              ],
              "Anyone",
            )}
          </form>
        </div>
        {query.error ? (
          <div className={base["inline-error"]} role="alert">
            {query.error}
          </div>
        ) : null}
        <div className={base["table-wrap"]}>
          <table className={base["data-table"]}>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            className={styles["sort-button"]}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {sorted === "asc"
                              ? " ↑"
                              : sorted === "desc"
                                ? " ↓"
                                : ""}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className={base.empty}>
                    No cases match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className={base.pagination}>
          <span>{data.total.toLocaleString()} cases</span>
          <div>
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <CreateCaseDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(created) => {
          setCreating(false);
          router.push(`/dashboard/support-cases/${created.id}`);
        }}
      />
    </main>
  );
}
