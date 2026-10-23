"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import {
  badgeAwardsResponseSchema,
  badgesResponseSchema,
  badgeVariables,
  type BadgeDefinition,
  type BadgeAwardRecord,
  type BadgeRule,
} from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { BadgeMedal } from "@/components/dashboard/badge-medal";
import { Dialog } from "@/components/common/dialog";
import { ConfirmModal } from "@/components/common/confirm-modal";
import {
  EditIcon,
  EyeIcon,
  TrashIcon,
} from "@/components/common/table-action-icons";
import { BadgeForm } from "./badge-form";
import base from "../../dashboard.module.css";
import styles from "./badges.module.css";

function ruleText(rule: BadgeRule) {
  const variable = badgeVariables.find((item) => item.value === rule.variable)!;
  const text = `${variable.label} ${rule.operator} ${rule.value}${variable.unit === "%" ? "%" : variable.unit === "USD" ? " USD" : ""}`;
  return rule.not ? `NOT (${text})` : text;
}

const definitionColumns: ColumnDef<BadgeDefinition>[] = [
  { accessorKey: "name", header: "Badge" },
  { accessorKey: "category", header: "Category" },
  {
    id: "criteria",
    accessorFn: (badge) => badge.criteria.map(ruleText).join(" AND "),
    header: "Criteria",
  },
  {
    id: "reward",
    accessorFn: (badge) => badge.reward ?? "None",
    header: "Reward",
  },
  {
    accessorKey: "active",
    header: "Status",
    filterFn: "equals",
    sortingFn: "basic",
  },
  { accessorKey: "awardCount", header: "Awards" },
  { id: "actions", header: "Actions", enableSorting: false },
];

const awardColumns: ColumnDef<BadgeAwardRecord>[] = [
  { accessorKey: "badgeName", header: "Badge" },
  { accessorKey: "userName", header: "User" },
  {
    id: "unlockedAt",
    accessorFn: (award) => new Date(award.unlockedAt).getTime(),
    header: "Unlocked at",
  },
  {
    accessorKey: "badgeId",
    header: "Badge ID",
    filterFn: "equals",
    enableSorting: false,
  },
];

const emptyDefinitions: BadgeDefinition[] = [];
const emptyAwards: BadgeAwardRecord[] = [];

function TableHead<T>({ table }: { table: Table<T> }) {
  return (
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
                    : undefined
              }
            >
              {header.column.getCanSort() ? (
                <button
                  type="button"
                  className={styles.sortButton}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  <span aria-hidden="true">
                    {header.column.getIsSorted() === "asc"
                      ? "\u2191"
                      : header.column.getIsSorted() === "desc"
                        ? "\u2193"
                        : "\u2195"}
                  </span>
                </button>
              ) : (
                flexRender(header.column.columnDef.header, header.getContext())
              )}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}

export default function BadgesPage() {
  const badges = useAdminQuery("/admin/badges", badgesResponseSchema);
  const awards = useAdminQuery(
    "/admin/badges/awards",
    badgeAwardsResponseSchema,
  );
  const [tab, setTab] = useState<"definitions" | "awards">("definitions");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("");
  const [definitionSorting, setDefinitionSorting] = useState<SortingState>([]);
  const [awardSorting, setAwardSorting] = useState<SortingState>([]);
  const [editor, setEditor] = useState<BadgeDefinition | "new" | null>(null);
  const [deleting, setDeleting] = useState<BadgeDefinition | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lockedDelete, setLockedDelete] = useState<BadgeDefinition | null>(
    null,
  );
  const canEdit = badges.data?.canManage ?? false;
  const query = tab === "definitions" ? badges : awards;
  const definitionFilters = useMemo<ColumnFiltersState>(
    () =>
      status === "all" ? [] : [{ id: "active", value: status === "active" }],
    [status],
  );
  const awardFilters = useMemo<ColumnFiltersState>(
    () => (badgeFilter ? [{ id: "badgeId", value: badgeFilter }] : []),
    [badgeFilter],
  );
  const definitionTable = useReactTable({
    data: badges.data?.items ?? emptyDefinitions,
    columns: definitionColumns,
    state: {
      sorting: definitionSorting,
      columnFilters: definitionFilters,
      globalFilter: tab === "definitions" ? search : "",
    },
    onSortingChange: setDefinitionSorting,
    globalFilterFn: (row, _columnId, value: string) =>
      `${row.original.name} ${row.original.description} ${row.original.category}`
        .toLowerCase()
        .includes(value.toLowerCase()),
    getRowId: (badge) => badge.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  const awardTable = useReactTable({
    data: awards.data?.items ?? emptyAwards,
    columns: awardColumns,
    state: {
      sorting: awardSorting,
      columnFilters: awardFilters,
      globalFilter: tab === "awards" ? search : "",
    },
    onSortingChange: setAwardSorting,
    globalFilterFn: (row, _columnId, value: string) =>
      `${row.original.badgeName} ${row.original.userName} ${row.original.userEmail}`
        .toLowerCase()
        .includes(value.toLowerCase()),
    getRowId: (award) => award.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
      columnVisibility: { badgeId: false },
    },
  });
  const table = tab === "definitions" ? definitionTable : awardTable;
  const total = table.getFilteredRowModel().rows.length;
  async function reload() {
    await badges.reload();
    await awards.reload();
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        `/admin/badges/${deleting.id}`,
        { method: "DELETE" },
        getToken(),
      );
      setDeleting(null);
      await reload();
    } catch (cause) {
      setDeleting(null);
      setError(
        cause instanceof Error ? cause.message : "Could not delete badge.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (query.loading && !query.data)
    return <DashboardLoading label="Loading badges..." />;
  if (query.error && !query.data)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  return (
    <main className={`${base["dashboard-page"]} ${styles.page}`}>
      <Link href="/dashboard/progress" className={base["back-link"]}>
        Back to progress
      </Link>
      <div className={base["page-header"]}>
        <h1>Badges & achievements</h1>
        {canEdit && (
          <button
            className={base["btn-toolbar-primary"]}
            onClick={() => setEditor("new")}
          >
            + Create badge
          </button>
        )}
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Badges">
        <button
          id="definitions-tab"
          role="tab"
          aria-controls="badges-table"
          aria-selected={tab === "definitions"}
          onClick={() => {
            setTab("definitions");
            setSearch("");
            definitionTable.setPageIndex(0);
          }}
        >
          Badge definitions ({badges.data?.items.length ?? 0})
        </button>
        <button
          id="awards-tab"
          role="tab"
          aria-controls="badges-table"
          aria-selected={tab === "awards"}
          onClick={() => {
            setTab("awards");
            setSearch("");
            awardTable.setPageIndex(0);
            void awards.reload();
            void badges.reload();
          }}
        >
          Award history ({awards.data?.items.length ?? 0})
        </button>
      </div>
      {(error || query.error) && (
        <p className={styles.error} role="alert">
          {error || query.error}
        </p>
      )}
      <section
        id="badges-table"
        role="tabpanel"
        aria-labelledby={
          tab === "definitions" ? "definitions-tab" : "awards-tab"
        }
        className={base["crud-card"]}
      >
        <div className={styles.toolbar}>
          <label>
            Search
            <input
              type="search"
              placeholder={
                tab === "definitions"
                  ? "Name or category"
                  : "Badge, user or email"
              }
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                table.setPageIndex(0);
              }}
            />
          </label>
          {tab === "definitions" ? (
            <label>
              Status
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  definitionTable.setPageIndex(0);
                }}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          ) : (
            <label>
              Badge
              <select
                value={badgeFilter}
                onChange={(event) => {
                  setBadgeFilter(event.target.value);
                  awardTable.setPageIndex(0);
                }}
              >
                <option value="">All badges</option>
                {badges.data?.items.map((badge) => (
                  <option key={badge.id} value={badge.id}>
                    {badge.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className={base["table-wrap"]}>
          {tab === "definitions" ? (
            <table className={`${base["data-table"]} ${styles.badgeTable}`}>
              <TableHead table={definitionTable} />
              <tbody>
                {definitionTable
                  .getRowModel()
                  .rows.map(({ original: badge }) => (
                    <tr
                      key={badge.id}
                      className={styles.clickableRow}
                      tabIndex={0}
                      aria-label={`Open badge ${badge.name}`}
                      onClick={() => setEditor(badge)}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          setEditor(badge);
                        }
                      }}
                    >
                      <td>
                        <div className={styles.badgeCell}>
                          <BadgeMedal emoji={badge.iconEmoji} />
                          <div>
                            <strong>{badge.name}</strong>
                            <span>{badge.description}</span>
                          </div>
                        </div>
                      </td>
                      <td>{badge.category}</td>
                      <td>
                        <div className={styles.criteria}>
                          {badge.criteria.map((rule, index) => (
                            <span key={index}>{ruleText(rule)}</span>
                          ))}
                        </div>
                      </td>
                      <td>{badge.reward ?? "None"}</td>
                      <td>
                        <span
                          className={`${base.badge} ${badge.active ? base["badge-active"] : base["badge-inactive"]}`}
                        >
                          {badge.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{badge.awardCount}</td>
                      <td>
                        <div
                          className={styles.actions}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            title="View awarded users"
                            aria-label={`View awards for ${badge.name}`}
                            onClick={() => {
                              setBadgeFilter(badge.id);
                              setSearch("");
                              setTab("awards");
                              awardTable.setPageIndex(0);
                              void awards.reload();
                              void badges.reload();
                            }}
                          >
                            <EyeIcon />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                title={
                                  badge.awardCount
                                    ? "Earned badges cannot be edited"
                                    : "Edit badge"
                                }
                                aria-label={`Edit ${badge.name}`}
                                disabled={busy}
                                className={
                                  badge.awardCount > 0
                                    ? styles.lockedAction
                                    : undefined
                                }
                                onClick={() => setEditor(badge)}
                              >
                                <EditIcon />
                              </button>
                              <button
                                title={
                                  badge.awardCount
                                    ? "Earned badges cannot be deleted"
                                    : "Delete badge"
                                }
                                aria-label={`Delete ${badge.name}`}
                                disabled={busy}
                                className={
                                  badge.awardCount > 0
                                    ? styles.lockedAction
                                    : undefined
                                }
                                onClick={() =>
                                  badge.awardCount > 0
                                    ? setLockedDelete(badge)
                                    : setDeleting(badge)
                                }
                              >
                                <TrashIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {!total && (
                  <tr>
                    <td colSpan={7} className={base.empty}>
                      No badge definitions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className={`${base["data-table"]} ${styles.badgeTable}`}>
              <TableHead table={awardTable} />
              <tbody>
                {awardTable.getRowModel().rows.map(({ original: award }) => (
                  <tr
                    key={award.id}
                    className={styles.clickableRow}
                    tabIndex={0}
                    aria-label={`Open badge ${award.badgeName}`}
                    onClick={() => {
                      const badge = badges.data?.items.find(
                        (item) => item.id === award.badgeId,
                      );
                      if (badge) setEditor(badge);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        const badge = badges.data?.items.find(
                          (item) => item.id === award.badgeId,
                        );
                        if (badge) setEditor(badge);
                      }
                    }}
                  >
                    <td>
                      <div className={styles.badgeCell}>
                        <BadgeMedal emoji={award.iconEmoji} />
                        <strong>{award.badgeName}</strong>
                      </div>
                    </td>
                    <td>
                      <Link
                        className={styles.userLink}
                        href={`/dashboard/users/${award.userId}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <strong>{award.userName}</strong>
                        <span>{award.userEmail}</span>
                      </Link>
                    </td>
                    <td>
                      <time
                        dateTime={award.unlockedAt}
                        title={award.unlockedAt}
                      >
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "long",
                        }).format(new Date(award.unlockedAt))}
                      </time>
                    </td>
                  </tr>
                ))}
                {!total && (
                  <tr>
                    <td colSpan={3} className={base.empty}>
                      No badge awards found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className={base.pagination}>
          <span>
            {total} {tab === "definitions" ? "badges" : "awards"}
          </span>
          <div>
            <button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </button>
            <span>
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(1, table.getPageCount())}
            </span>
            <button
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      <Dialog
        open={editor !== null}
        title={editor === "new" ? "Create badge" : editor && (editor.awardCount > 0 || !canEdit) ? "Badge details" : "Edit badge"}
        onClose={() => setEditor(null)}
      >
        {editor && (
          <BadgeForm
            key={editor === "new" ? "new" : editor.id}
            badge={editor === "new" ? undefined : editor}
            readOnly={editor !== "new" && (editor.awardCount > 0 || !canEdit)}
            onCancel={() => setEditor(null)}
            onSaved={async () => {
              setEditor(null);
              await reload();
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={lockedDelete !== null}
        title="Badge cannot be deleted"
        onClose={() => setLockedDelete(null)}
      >
        <p className={styles.lockNotice}>
          &quot;{lockedDelete?.name}&quot; has already been awarded to{" "}
          {lockedDelete?.awardCount}{" "}
          {lockedDelete?.awardCount === 1 ? "user" : "users"}. Its definition
          and award history must be preserved.
        </p>
        <button
          type="button"
          className={base["btn-toolbar-primary"]}
          onClick={() => setLockedDelete(null)}
        >
          Close
        </button>
      </Dialog>
      <ConfirmModal
        open={!!deleting}
        title="Delete badge?"
        message={`Delete "${deleting?.name ?? ""}"? Only badges with no award history can be deleted.`}
        confirmLabel={busy ? "Deleting..." : "Delete badge"}
        onCancel={() => {
          if (!busy) setDeleting(null);
        }}
        onConfirm={() => void remove()}
      />
    </main>
  );
}
