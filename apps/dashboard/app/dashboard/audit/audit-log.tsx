"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AuditAction,
  auditPageSchema,
  auditDetailSchema,
  type AuditListEvent as Event,
  type AuditDetail as Detail,
  type AuditPage,
} from "@purposemint/contracts";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Dialog } from "@/components/common/dialog";
import { BackIcon, RefreshIcon } from "@/components/dashboard/action-icons";
import { EyeIcon } from "@/components/common/table-action-icons";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatAdminDateTime } from "@/lib/admin-format";
import styles from "./audit.module.css";

function readable(value: string) {
  return value
    .replace(/^admin\./, "")
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RecordId({
  value,
  fallback,
}: {
  value: string | null;
  fallback: string;
}) {
  return (
    <span className={styles.recordId} title={value ?? undefined}>
      {value
        ? value.length > 18
          ? `${value.slice(0, 8)}…${value.slice(-6)}`
          : value
        : fallback}
    </span>
  );
}

export type AuditFilters = {
  action: string;
  outcome: string;
  actorUserId: string;
  entityId: string;
  from: string;
  to: string;
};
export const emptyAuditFilters: AuditFilters = {
  action: "",
  outcome: "",
  actorUserId: "",
  entityId: "",
  from: "",
  to: "",
};

export default function AuditLogView({
  actorId,
  initialFilters = emptyAuditFilters,
  embedded = false,
}: {
  actorId?: string;
  initialFilters?: AuditFilters;
  embedded?: boolean;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [ascending, setAscending] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const params = new URLSearchParams({
    ...filters,
    actorUserId: actorId ?? filters.actorUserId,
    page: String(page),
    order: ascending ? "asc" : "desc",
  });
  const { data, loading, error, reload } = useAuditQuery(
    `/admin/audit-events?${params}`,
  );
  const columns = useMemo<ColumnDef<Event>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Time (UTC)",
        cell: ({ row }) => formatAdminDateTime(row.original.createdAt, "UTC"),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <>
            <strong className={styles.actionName}>
              {readable(row.original.action)}
            </strong>
            <small>{row.original.action}</small>
          </>
        ),
      },
      {
        accessorKey: "actorUserId",
        header: "Actor",
        cell: ({ row }) => (
          <>
            <span className={styles.actorType}>
              {readable(row.original.actorType)}
            </span>
            <small>
              <RecordId
                value={row.original.actorUserId}
                fallback="Not recorded"
              />
            </small>
          </>
        ),
      },
      {
        accessorKey: "entityId",
        header: "Affected record",
        cell: ({ row }) => (
          <>
            <span>
              {row.original.entityType
                ? readable(row.original.entityType)
                : "Not specified"}
            </span>
            <small>
              <RecordId value={row.original.entityId} fallback="—" />
            </small>
          </>
        ),
      },
      {
        accessorKey: "outcome",
        header: "Result",
        cell: ({ row }) => (
          <span
            className={`${styles.status} ${row.original.outcome === "failure" ? styles.failure : ""}`}
          >
            {readable(row.original.outcome)}
          </span>
        ),
      },
      {
        id: "details",
        header: "",
        cell: ({ row }) => (
          <button
            className={styles.iconButton}
            aria-label={`View details for ${readable(row.original.action)}`}
            disabled={!data?.canViewDetails}
            title={
              data?.canViewDetails
                ? "View event details"
                : "Full audit access required"
            }
            onClick={() => {
              setSelected(row.original.id);
              setDetail(null);
              setDetailError(null);
            }}
          >
            <EyeIcon />
          </button>
        ),
      },
    ],
    [data?.canViewDetails],
  );
  const table = useReactTable({
    data: !error && !loading ? (data?.items ?? []) : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const change = (key: keyof typeof filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };
  return (
    <section className={`${styles.page} ${embedded ? styles.embedded : ""}`}>
      <div className={styles.header}>
        <div>
          {!embedded && <p className={styles.eyebrow}>Administration</p>}
          <h2>{embedded ? "Event filters" : "Detailed overview"}</h2>
        </div>
        <button
          className={styles.iconButton}
          onClick={() => void reload()}
          disabled={loading}
          aria-label="Refresh audit history"
          title="Refresh audit history"
        >
          <RefreshIcon spinning={loading} />
        </button>
      </div>
      <div className={styles.filters}>
        <label>
          Action
          <select
            value={filters.action}
            onChange={(e) => change("action", e.target.value)}
          >
            <option value="">All actions</option>
            {Object.values(AuditAction).map((action) => (
              <option key={action} value={action}>
                {readable(action)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Result
          <select
            value={filters.outcome}
            onChange={(e) => change("outcome", e.target.value)}
          >
            <option value="">All results</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </label>
        <label>
          Actor ID
          <input
            value={actorId ?? filters.actorUserId}
            disabled={Boolean(actorId)}
            onChange={(e) => change("actorUserId", e.target.value)}
            maxLength={100}
            placeholder="User ID"
          />
        </label>
        <label>
          Affected record ID
          <input
            value={filters.entityId}
            onChange={(e) => change("entityId", e.target.value)}
            maxLength={100}
            placeholder="Record ID"
          />
        </label>
        <label>
          From (UTC)
          <input
            type="date"
            value={filters.from}
            onChange={(e) => change("from", e.target.value)}
          />
        </label>
        <label>
          Through (UTC)
          <input
            type="date"
            value={filters.to}
            onChange={(e) => change("to", e.target.value)}
          />
        </label>
        <button
          className={styles.clearButton}
          onClick={() => {
            setFilters({
              action: "",
              outcome: "",
              actorUserId: "",
              entityId: "",
              from: "",
              to: "",
            });
            setPage(1);
          }}
        >
          Clear filters
        </button>
        <label>
          Order
          <select
            value={ascending ? "asc" : "desc"}
            onChange={(event) => {
              setAscending(event.target.value === "asc");
              setPage(1);
            }}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </label>
      </div>
      <div className={styles.tableHeading}>
        <h2>Activity history</h2>
        <span>
          {loading
            ? "Loading..."
            : `${(data?.total ?? 0).toLocaleString()} matching events`}
        </span>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.tableScroll}>
        <table className={styles.table} aria-label="Audit events">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} scope="col">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.original.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ overflowWrap: "anywhere" }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading ? (
        <p role="status">Loading audit events...</p>
      ) : (
        !error &&
        !data?.items.length && (
          <p className={styles.empty}>No matching audit events.</p>
        )
      )}
      <div className={styles.pagination}>
        <span>
          {data?.total ?? 0} events · Page {page} of{" "}
          {Math.max(1, Math.ceil((data?.total ?? 0) / 25))}
        </span>
        <div>
          <button
            className={styles.iconButton}
            aria-label="Previous page"
            title="Previous page"
            disabled={loading || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <BackIcon />
          </button>
          <button
            className={`${styles.iconButton} ${styles.nextButton}`}
            aria-label="Next page"
            title="Next page"
            disabled={loading || !data || page * 25 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            <BackIcon />
          </button>
        </div>
      </div>
      <p className={styles.note}>
        History covers recorded events only. Detailed metadata and IP addresses
        require full audit access.
      </p>
      <Dialog
        open={selected !== null}
        title="Audit event"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <DetailLoader
            key={selected}
            id={selected}
            onData={setDetail}
            onError={setDetailError}
          />
        )}
        {detailError ? (
          <p role="alert">{detailError}</p>
        ) : detail ? (
          <div className={styles.detail}>
            <div className={styles.detailHeading}>
              <h3>{readable(detail.action)}</h3>
              <span
                className={`${styles.status} ${detail.outcome === "failure" ? styles.failure : ""}`}
              >
                {readable(detail.outcome)}
              </span>
            </div>
            <dl className={styles.detailFields}>
              <div>
                <dt>Recorded at (UTC)</dt>
                <dd>{formatAdminDateTime(detail.createdAt, "UTC")}</dd>
              </div>
              <div>
                <dt>Actor type</dt>
                <dd>{readable(detail.actorType)}</dd>
              </div>
              <div>
                <dt>Actor ID</dt>
                <dd>{detail.actorUserId ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>Affected record</dt>
                <dd>
                  {detail.entityType ?? "Not specified"}
                  <small>{detail.entityId}</small>
                </dd>
              </div>
              <div>
                <dt>IP address</dt>
                <dd>{detail.ipAddress ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>Event ID</dt>
                <dd>{detail.id}</dd>
              </div>
            </dl>
            <h3 className={styles.metadataTitle}>Event data</h3>
            {detail.metadata ? (
              <pre className={styles.metadata}>
                {JSON.stringify(detail.metadata, null, 2)}
              </pre>
            ) : (
              <p className={styles.note}>No additional data recorded.</p>
            )}
          </div>
        ) : (
          <p>Loading event...</p>
        )}
      </Dialog>
    </section>
  );
}

function DetailLoader({
  id,
  onData,
  onError,
}: {
  id: string;
  onData: (detail: Detail) => void;
  onError: (message: string) => void;
}) {
  useEffect(() => {
    let active = true;
    void apiRequest(
      `/admin/audit-events/${id}`,
      {},
      getToken(),
      auditDetailSchema,
    )
      .then((result) => {
        if (active) onData(result);
      })
      .catch((cause: unknown) => {
        if (active)
          onError(
            cause instanceof Error ? cause.message : "Unable to load event.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, onData, onError]);
  return null;
}

function useAuditQuery(path: string) {
  const [data, setData] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setData(null);
    void apiRequest(path, {}, getToken(), auditPageSchema)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load audit history.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return {
    data,
    loading,
    error,
    reload: () => setRevision((value) => value + 1),
  };
}
