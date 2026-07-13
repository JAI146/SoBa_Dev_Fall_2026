"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { DonorListItem } from "@muakhah/contracts";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { EyeIcon, LockIcon, TrashIcon } from "@/components/admin/table-action-icons";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { downloadCsv } from "@/lib/export-csv";
import styles from "../../dashboard.module.css";

type PendingAction =
  | { type: "restrict"; donor: DonorListItem }
  | { type: "delete"; donor: DonorListItem };

type DonorFilters = {
  search: string;
  status: string;
  userType: string;
};

const EMPTY_FILTERS: DonorFilters = {
  search: "",
  status: "",
  userType: "",
};

function hasActiveFilters(filters: DonorFilters) {
  return Object.values(filters).some((value) => value !== "");
}

function buildDonorsQuery(filters: DonorFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.userType) params.set("userType", filters.userType);
  const qs = params.toString();
  return qs ? `/admin/donors?${qs}` : "/admin/donors";
}

function DonorAvatar({ donor }: { donor: DonorListItem }) {
  const { t } = useI18n();
  const initials = `${donor.firstName.charAt(0)}${donor.lastName.charAt(0)}`.toUpperCase();

  if (donor.profileImageUrl) {
    return (
      <img
        src={donor.profileImageUrl}
        alt={t("donors.profileAlt")}
        className={styles["donor-avatar"]}
      />
    );
  }

  return (
    <span className={`${styles["donor-avatar"]} ${styles["donor-avatar--placeholder"]}`}>
      {initials}
    </span>
  );
}

function donorTypeLabel(
  userType: string,
  t: (key: string) => string,
): string {
  return userType === "sponsor"
    ? t("donors.types.sponsor")
    : t("donors.types.visitor");
}

export default function AdminDonorsPage() {
  const { t, te } = useI18n();
  const [donors, setDonors] = useState<DonorListItem[]>([]);
  const [filters, setFilters] = useState<DonorFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const loadDonors = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await apiRequest<{ donors: DonorListItem[] }>(
        buildDonorsQuery(filters),
        {},
        getToken(),
      );
      setDonors(data.donors);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("donors.loadFailed"));
    } finally {
      if (opts?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [filters, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDonors();
    }, filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadDonors, filters.search]);

  const emptyMessage = useMemo(() => {
    if (donors.length === 0 && !hasActiveFilters(filters)) {
      return t("donors.empty");
    }
    return t("donors.noResults");
  }, [donors.length, filters, t]);

  async function confirmAction() {
    if (!pendingAction) return;

    const { donor } = pendingAction;
    setActionId(donor.id);

    try {
      if (pendingAction.type === "restrict") {
        const restricted = !donor.accountRestricted;
        await apiRequest(
          `/admin/donors/${donor.id}/restrict`,
          {
            method: "PATCH",
            body: JSON.stringify({ restricted }),
          },
          getToken(),
        );
      } else {
        await apiRequest(`/admin/donors/${donor.id}`, { method: "DELETE" }, getToken());
      }

      setPendingAction(null);
      await loadDonors();
    } catch (err) {
      const fallback =
        pendingAction.type === "restrict"
          ? t("donors.restrictFailed")
          : t("donors.deleteFailed");
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setActionId(null);
    }
  }

  const modalConfig = pendingAction
    ? pendingAction.type === "delete"
      ? {
          title: t("donors.modal.deleteTitle"),
          message: t("donors.modal.deleteMessage", {
            name: pendingAction.donor.fullName,
            email: pendingAction.donor.email,
          }),
          confirmLabel: t("common.delete"),
          tone: "danger" as const,
        }
      : pendingAction.donor.accountRestricted
        ? {
            title: t("donors.modal.restoreTitle"),
            message: t("donors.modal.restoreMessage", {
              name: pendingAction.donor.fullName,
            }),
            confirmLabel: t("donors.modal.restoreConfirm"),
            tone: "primary" as const,
          }
        : {
            title: t("donors.modal.restrictTitle"),
            message: t("donors.modal.restrictMessage", {
              name: pendingAction.donor.fullName,
            }),
            confirmLabel: t("donors.modal.restrictConfirm"),
            tone: "warning" as const,
          }
    : null;

  function exportDonorsCsv() {
    const headers = [
      t("donors.table.name"),
      t("donors.table.email"),
      t("donors.table.type"),
      t("donors.table.status"),
      t("donors.table.joined"),
      t("filters.account"),
    ];
    const rows = donors.map((donor) => [
      donor.fullName,
      donor.email,
      donorTypeLabel(donor.userType, t),
      te("accountStatus", donor.status),
      new Date(donor.createdAt).toLocaleDateString(),
      donor.accountRestricted
        ? t("filters.accountRestricted")
        : t("filters.accountActive"),
    ]);
    downloadCsv(`donors-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <>
      <ConfirmModal
        open={pendingAction !== null}
        title={modalConfig?.title ?? ""}
        message={modalConfig?.message ?? ""}
        confirmLabel={modalConfig?.confirmLabel}
        tone={modalConfig?.tone}
        loading={actionId !== null}
        onConfirm={() => void confirmAction()}
        onCancel={() => {
          if (!actionId) setPendingAction(null);
        }}
      />

      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("donors.title")}</h1>
        </div>
        <ListToolbar
          onRefresh={() => void loadDonors({ silent: true })}
          onExport={exportDonorsCsv}
          refreshing={refreshing}
          exportDisabled={donors.length === 0}
        />
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["filter-bar"]}>
          <div className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}>
            <label htmlFor="donor-search">{t("filters.search")}</label>
            <input
              id="donor-search"
              type="search"
              value={filters.search}
              placeholder={t("filters.searchDonors")}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="donor-type">{t("filters.donorType")}</label>
            <select
              id="donor-type"
              value={filters.userType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, userType: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              <option value="visitor">{t("donors.types.visitor")}</option>
              <option value="sponsor">{t("donors.types.sponsor")}</option>
            </select>
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="donor-status">{t("filters.status")}</label>
            <select
              id="donor-status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              <option value="active">{te("accountStatus", "active")}</option>
              <option value="suspended">{te("accountStatus", "suspended")}</option>
              <option value="pending_email">
                {te("accountStatus", "pending_email")}
              </option>
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

        {loading && <p>{t("donors.loading")}</p>}
        {error && <p style={{ color: "var(--error-text)" }}>{error}</p>}
        {!loading && !error && donors.length === 0 && <p>{emptyMessage}</p>}
        {!loading && donors.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("donors.table.name")}</th>
                  <th>{t("donors.table.email")}</th>
                  <th>{t("donors.table.type")}</th>
                  <th>{t("donors.table.status")}</th>
                  <th>{t("donors.table.joined")}</th>
                  <th>{t("donors.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((donor) => (
                  <tr key={donor.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <DonorAvatar donor={donor} />
                        <span>
                          {donor.fullName}
                          {donor.accountRestricted && (
                            <span className={styles["restricted-badge"]}>
                              {t("donors.restrictedBadge")}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>{donor.email}</td>
                    <td>{donorTypeLabel(donor.userType, t)}</td>
                    <td>{te("accountStatus", donor.status)}</td>
                    <td>{new Date(donor.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className={styles["table-actions"]}>
                        <Link
                          href={`/dashboard/admin/donors/${donor.id}`}
                          className={styles["icon-btn"]}
                          title={t("donors.actions.view")}
                          aria-label={t("donors.actions.viewAria", {
                            name: donor.fullName,
                          })}
                        >
                          <EyeIcon />
                        </Link>
                        <button
                          type="button"
                          className={`${styles["icon-btn"]} ${styles.warning} ${donor.accountRestricted ? styles.active : ""}`}
                          title={
                            donor.accountRestricted
                              ? t("donors.actions.restore")
                              : t("donors.actions.restrict")
                          }
                          aria-label={
                            donor.accountRestricted
                              ? t("donors.actions.restoreAria", {
                                  name: donor.fullName,
                                })
                              : t("donors.actions.restrictAria", {
                                  name: donor.fullName,
                                })
                          }
                          disabled={actionId === donor.id}
                          onClick={() =>
                            setPendingAction({ type: "restrict", donor })
                          }
                        >
                          <LockIcon />
                        </button>
                        <button
                          type="button"
                          className={`${styles["icon-btn"]} ${styles.danger}`}
                          title={t("donors.actions.delete")}
                          aria-label={t("donors.actions.deleteAria", {
                            name: donor.fullName,
                          })}
                          disabled={actionId === donor.id}
                          onClick={() =>
                            setPendingAction({ type: "delete", donor })
                          }
                        >
                          <TrashIcon />
                        </button>
                      </div>
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
