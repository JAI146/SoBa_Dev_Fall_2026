"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { ProfileUpdateRequestListItem } from "@muakhah/contracts";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  getUpdatableFieldMeta,
  parseStoredProfileValue,
} from "@/lib/family-updatable-fields";
import { sponsorshipStatusClass } from "@/lib/sponsorship-status";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

type PendingReview = {
  request: ProfileUpdateRequestListItem;
  action: "approved" | "rejected";
};

type RequestFilters = {
  search: string;
  status: string;
};

const EMPTY_FILTERS: RequestFilters = { search: "", status: "" };

function buildQuery(filters: RequestFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return qs
    ? `/admin/profile-update-requests?${qs}`
    : "/admin/profile-update-requests";
}

export default function AdminProfileUpdateRequestsPage() {
  const { t, te } = useI18n();
  const [requests, setRequests] = useState<ProfileUpdateRequestListItem[]>([]);
  const [filters, setFilters] = useState<RequestFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const loadRequests = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<{ requests: ProfileUpdateRequestListItem[] }>(
          buildQuery(filters),
          {},
          getToken(),
        );
        setRequests(data.requests);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("admin.profileUpdates.loadFailed"));
      } finally {
        if (opts?.silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [filters, t],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests();
    }, filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests, filters.search]);

  const emptyMessage = useMemo(() => {
    if (requests.length === 0 && !filters.search && !filters.status) {
      return t("admin.profileUpdates.empty");
    }
    return t("admin.profileUpdates.noResults");
  }, [requests.length, filters.search, filters.status, t]);

  async function confirmReview() {
    if (!pendingReview) return;
    setActionId(pendingReview.request.id);
    setError(null);
    try {
      const data = await apiRequest<{ request: ProfileUpdateRequestListItem }>(
        `/admin/profile-update-requests/${pendingReview.request.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: pendingReview.action,
            adminNotes: adminNotes.trim() || null,
          }),
        },
        getToken(),
      );
      setPendingReview(null);
      setAdminNotes("");
      setRequests((prev) =>
        prev.map((item) => (item.id === data.request.id ? data.request : item)),
      );
      await loadRequests({ silent: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("admin.profileUpdates.reviewFailed"),
      );
    } finally {
      setActionId(null);
    }
  }

  const modalConfig = pendingReview
    ? pendingReview.action === "approved"
      ? {
          title: t("admin.profileUpdates.approveTitle"),
          message: t("admin.profileUpdates.approveMessage", {
            code: pendingReview.request.familyPublicCode,
          }),
          confirmLabel: t("sponsorships.actions.approve"),
          tone: "primary" as const,
        }
      : {
          title: t("admin.profileUpdates.rejectTitle"),
          message: t("admin.profileUpdates.rejectMessage", {
            code: pendingReview.request.familyPublicCode,
          }),
          confirmLabel: t("sponsorships.actions.reject"),
          tone: "danger" as const,
        }
    : null;

  return (
    <>
      <ConfirmModal
        open={pendingReview !== null}
        title={modalConfig?.title ?? ""}
        message={modalConfig?.message ?? ""}
        confirmLabel={modalConfig?.confirmLabel}
        tone={modalConfig?.tone}
        loading={actionId !== null}
        onConfirm={() => void confirmReview()}
        onCancel={() => {
          if (!actionId) {
            setPendingReview(null);
            setAdminNotes("");
          }
        }}
      >
        <div className={styles["form-field"]} style={{ marginTop: "1rem" }}>
          <label htmlFor="profile-update-admin-notes">
            {t("sponsorships.adminNotesLabel")}
          </label>
          <textarea
            id="profile-update-admin-notes"
            rows={3}
            maxLength={2000}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder={t("sponsorships.adminNotesPlaceholder")}
          />
        </div>
      </ConfirmModal>

      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("admin.profileUpdates.title")}</h1>
          <p>{t("admin.profileUpdates.description")}</p>
        </div>
        <ListToolbar
          onRefresh={() => void loadRequests({ silent: true })}
          onExport={() => {}}
          exportDisabled
          refreshing={refreshing}
        />
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["filter-bar"]}>
          <div className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}>
            <label htmlFor="profile-update-search">{t("filters.search")}</label>
            <input
              id="profile-update-search"
              type="search"
              value={filters.search}
              placeholder={t("admin.profileUpdates.searchPlaceholder")}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="profile-update-status">{t("filters.status")}</label>
            <select
              id="profile-update-status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              <option value="pending">{te("profileUpdateStatus", "pending")}</option>
              <option value="approved">{te("profileUpdateStatus", "approved")}</option>
              <option value="rejected">{te("profileUpdateStatus", "rejected")}</option>
            </select>
          </div>
        </div>

        {loading && <p>{t("admin.profileUpdates.loading")}</p>}
        {error && <div className={authStyles["error-banner"]}>{error}</div>}
        {!loading && !error && requests.length === 0 && <p>{emptyMessage}</p>}
        {!loading && requests.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("admin.profileUpdates.table.family")}</th>
                  <th>{t("admin.profileUpdates.table.field")}</th>
                  <th>{t("admin.profileUpdates.table.current")}</th>
                  <th>{t("admin.profileUpdates.table.requested")}</th>
                  <th>{t("admin.profileUpdates.table.status")}</th>
                  <th>{t("admin.profileUpdates.table.submitted")}</th>
                  <th>{t("admin.profileUpdates.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => {
                  const meta = getUpdatableFieldMeta(item.fieldKey);
                  const current = parseStoredProfileValue(item.currentValue);
                  const requested = parseStoredProfileValue(item.requestedValue);
                  const format = (val: unknown) => {
                    if (meta?.type === "boolean") {
                      return val === true ? t("common.yes") : t("common.no");
                    }
                    if (meta?.type === "enum" && typeof val === "string") {
                      return te(meta.enumGroup ?? item.fieldKey, val);
                    }
                    return val === null || val === undefined
                      ? t("common.empty")
                      : String(val);
                  };
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link href={`/dashboard/admin/families/${item.familyId}`}>
                          {item.familyPublicCode}
                        </Link>
                      </td>
                      <td>{meta ? t(meta.labelKey) : item.fieldKey}</td>
                      <td>{format(current)}</td>
                      <td>{format(requested)}</td>
                      <td>
                        <span
                          className={`${styles["status-badge"]} ${sponsorshipStatusClass(item.status === "pending" ? "pending" : item.status === "approved" ? "approved" : "rejected")}`}
                        >
                          {te("profileUpdateStatus", item.status)}
                        </span>
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        {item.status === "pending" ? (
                          <div className={styles["table-actions"]}>
                            <button
                              type="button"
                              className={`${styles["btn-primary-inline"]} ${styles["btn-sm"]}`}
                              disabled={actionId === item.id}
                              onClick={() =>
                                setPendingReview({ request: item, action: "approved" })
                              }
                            >
                              {t("sponsorships.actions.approve")}
                            </button>
                            <button
                              type="button"
                              className={`${styles["btn-secondary-inline"]} ${styles["btn-sm"]}`}
                              disabled={actionId === item.id}
                              onClick={() =>
                                setPendingReview({ request: item, action: "rejected" })
                              }
                            >
                              {t("sponsorships.actions.reject")}
                            </button>
                          </div>
                        ) : (
                          <span className={styles["form-hint"]}>
                            {item.adminNotes || "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
