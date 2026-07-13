"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { EyeIcon, StopIcon } from "@/components/admin/table-action-icons";
import { SponsorshipDetailModal } from "@/components/sponsorship/sponsorship-detail-modal";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { notifySponsorshipChanged } from "@/lib/sponsorship-events";
import {
  canReviewSponsorship,
  SPONSORSHIP_STATUS_FILTER_OPTIONS,
  sponsorshipStatusClass,
  sponsorshipStatusKey,
} from "@/lib/sponsorship-status";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

type PendingReview = {
  sponsorship: SponsorshipListItem;
  action: "active" | "cancelled" | "clarification";
};

type SponsorshipFilters = {
  search: string;
  status: string;
};

const EMPTY_FILTERS: SponsorshipFilters = {
  search: "",
  status: "",
};

function hasActiveFilters(filters: SponsorshipFilters) {
  return Object.values(filters).some((value) => value !== "");
}

function buildQuery(filters: SponsorshipFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return qs ? `/admin/sponsorships?${qs}` : "/admin/sponsorships";
}


export default function AdminSponsorshipsPage() {
  const { t, te } = useI18n();
  const [sponsorships, setSponsorships] = useState<SponsorshipListItem[]>([]);
  const [filters, setFilters] = useState<SponsorshipFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [detailSponsorship, setDetailSponsorship] =
    useState<SponsorshipListItem | null>(null);

  const loadSponsorships = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await apiRequest<{ sponsorships: SponsorshipListItem[] }>(
          buildQuery(filters),
          {},
          getToken(),
        );
        setSponsorships(data.sponsorships);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("sponsorships.loadFailed"),
        );
      } finally {
        if (opts?.silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [filters, t],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSponsorships();
    }, filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadSponsorships, filters.search]);

  const emptyMessage = useMemo(() => {
    if (sponsorships.length === 0 && !hasActiveFilters(filters)) {
      return t("sponsorships.adminEmpty");
    }
    return t("sponsorships.adminNoResults");
  }, [sponsorships.length, filters, t]);

  async function confirmReview() {
    if (!pendingReview) return;

    if (
      pendingReview.action === "clarification" &&
      !adminNotes.trim()
    ) {
      setError(t("sponsorships.modal.clarifyNotesRequired"));
      return;
    }

    setActionId(pendingReview.sponsorship.id);
    try {
      await apiRequest(
        `/admin/sponsorships/${pendingReview.sponsorship.id}`,
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
      await loadSponsorships();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("sponsorships.reviewFailed"),
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleLifecycleUpdated(updated: SponsorshipListItem) {
    setSponsorships((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
    setDetailSponsorship(updated);
    notifySponsorshipChanged();
  }

  const modalConfig = pendingReview
    ? pendingReview.action === "active"
      ? {
          title: t("sponsorships.modal.approveTitle"),
          message: t("sponsorships.modal.approveMessage", {
            code: pendingReview.sponsorship.familyPublicCode,
            name: pendingReview.sponsorship.donorName,
          }),
          confirmLabel: t("sponsorships.actions.approve"),
          tone: "primary" as const,
        }
      : pendingReview.action === "clarification"
        ? {
            title: t("sponsorships.modal.clarifyTitle"),
            message: t("sponsorships.modal.clarifyMessage", {
              code: pendingReview.sponsorship.familyPublicCode,
              name: pendingReview.sponsorship.donorName,
            }),
            confirmLabel: t("sponsorships.actions.clarify"),
            tone: "warning" as const,
          }
        : {
            title: t("sponsorships.modal.rejectTitle"),
            message: t("sponsorships.modal.rejectMessage", {
              code: pendingReview.sponsorship.familyPublicCode,
              name: pendingReview.sponsorship.donorName,
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
        <div className={`${styles["form-field"]} ${styles.full}`} style={{ marginTop: "1rem" }}>
          <label htmlFor="admin-notes">{t("sponsorships.adminNotesLabel")}</label>
          <textarea
            id="admin-notes"
            rows={3}
            maxLength={2000}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder={t("sponsorships.adminNotesPlaceholder")}
          />
        </div>
      </ConfirmModal>

      <SponsorshipDetailModal
        open={detailSponsorship !== null}
        sponsorship={detailSponsorship}
        showDonor
        lifecycleRole="admin"
        familyHref={
          detailSponsorship
            ? `/dashboard/admin/families/${detailSponsorship.familyId}`
            : undefined
        }
        donorHref={
          detailSponsorship
            ? `/dashboard/admin/donors/${detailSponsorship.donorUserId}`
            : undefined
        }
        onLifecycleUpdated={(updated) => void handleLifecycleUpdated(updated)}
        onLifecycleError={setError}
        onClose={() => setDetailSponsorship(null)}
      />

      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("sponsorships.adminTitle")}</h1>
        </div>
        <ListToolbar
          onRefresh={() => void loadSponsorships({ silent: true })}
          onExport={() => {}}
          exportDisabled
          refreshing={refreshing}
        />
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["filter-bar"]}>
          <div className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}>
            <label htmlFor="sponsorship-search">{t("filters.search")}</label>
            <input
              id="sponsorship-search"
              type="search"
              value={filters.search}
              placeholder={t("sponsorships.searchPlaceholder")}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="sponsorship-status">{t("filters.status")}</label>
            <select
              id="sponsorship-status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              {SPONSORSHIP_STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {te("sponsorshipStatus", status)}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters(filters) && (
            <div className={styles["filter-actions"]}>
              <button
                type="button"
                className={styles["btn-filter-clear"]}
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                {t("filters.clear")}
              </button>
            </div>
          )}
        </div>

        {loading && <p>{t("sponsorships.loading")}</p>}
        {error && <div className={authStyles["error-banner"]}>{error}</div>}
        {!loading && !error && sponsorships.length === 0 && (
          <p>{emptyMessage}</p>
        )}
        {!loading && sponsorships.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("sponsorships.table.family")}</th>
                  <th>{t("sponsorships.table.donor")}</th>
                  <th>{t("sponsorships.table.type")}</th>
                  <th>{t("sponsorships.table.amount")}</th>
                  <th>{t("sponsorships.table.duration")}</th>
                  <th>{t("sponsorships.table.status")}</th>
                  <th>{t("sponsorships.table.submitted")}</th>
                  <th>{t("sponsorships.table.details")}</th>
                  <th>{t("sponsorships.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {sponsorships.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/dashboard/admin/families/${item.familyId}`}
                      >
                        {item.familyPublicCode}
                      </Link>
                    </td>
                    <td>
                      <div>{item.donorName}</div>
                      <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                        {item.donorEmail}
                      </div>
                    </td>
                    <td>
                      {item.type === "full"
                        ? t("sponsorships.typeFull")
                        : t("sponsorships.typePartial")}
                    </td>
                    <td>
                      ${item.monthlyAmount.toFixed(2)}/{t("sponsorships.perMonth")}
                    </td>
                    <td>
                      {item.durationMonths == null
                        ? t("sponsorships.durationPresets.ongoing")
                        : t("sponsorships.monthsCount", {
                            count: item.durationMonths,
                          })}
                    </td>
                    <td>
                      <span
                        className={`${styles["status-badge"]} ${sponsorshipStatusClass(sponsorshipStatusKey(item))}`}
                      >
                        {te("sponsorshipStatus", sponsorshipStatusKey(item))}
                      </span>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className={styles["icon-btn"]}
                        title={t("sponsorships.actions.view")}
                        aria-label={t("sponsorships.actions.viewAria", {
                          code: item.familyPublicCode,
                        })}
                        onClick={() => setDetailSponsorship(item)}
                      >
                        <EyeIcon />
                      </button>
                    </td>
                    <td>
                      {canReviewSponsorship(item.status) ? (
                        <div className={styles["table-actions"]}>
                          <button
                            type="button"
                            className={`${styles["btn-primary-inline"]} ${styles["btn-sm"]}`}
                            disabled={actionId === item.id}
                            onClick={() =>
                              setPendingReview({
                                sponsorship: item,
                                action: "active",
                              })
                            }
                          >
                            {t("sponsorships.actions.approve")}
                          </button>
                          <button
                            type="button"
                            className={`${styles["btn-secondary-inline"]} ${styles["btn-sm"]}`}
                            disabled={actionId === item.id}
                            onClick={() =>
                              setPendingReview({
                                sponsorship: item,
                                action: "clarification",
                              })
                            }
                          >
                            {t("sponsorships.actions.clarify")}
                          </button>
                          <button
                            type="button"
                            className={`${styles["btn-secondary-inline"]} ${styles["btn-sm"]}`}
                            disabled={actionId === item.id}
                            onClick={() =>
                              setPendingReview({
                                sponsorship: item,
                                action: "cancelled",
                              })
                            }
                          >
                            {t("sponsorships.actions.reject")}
                          </button>
                        </div>
                      ) : (
                        <span className={styles["form-hint"]}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
