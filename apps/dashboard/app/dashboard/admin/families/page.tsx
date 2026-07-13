"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { FamilyDetail, FamilyListItem } from "@muakhah/contracts";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { PlusIcon } from "@/components/dashboard/action-icons";
import { EyeIcon, EyeOffIcon, LockIcon, TrashIcon } from "@/components/admin/table-action-icons";
import { FamilyFundingProgress } from "@/components/donor/family-funding-progress";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { exportFamiliesDetailCsv } from "@/lib/export-families-csv";
import {
  EMPTY_FAMILY_FILTERS,
  filterFamilies,
  hasActiveFamilyFilters,
  type FamilyFilters,
} from "@/lib/family-filters";
import { localizedFamilyName } from "@/lib/localized-text";
import styles from "../../dashboard.module.css";

type PendingAction =
  | { type: "restrict"; family: FamilyListItem }
  | { type: "hide"; family: FamilyListItem }
  | { type: "delete"; family: FamilyListItem };

const EMPTY_FILTERS = EMPTY_FAMILY_FILTERS;

const GOVERNORATES = [
  "north_gaza",
  "gaza",
  "middle_area",
  "khan_younis",
  "rafah",
  "unknown",
] as const;

const CASE_CATEGORIES = [
  "martyr_family",
  "widow",
  "orphans",
  "modest_family",
  "no_breadwinner",
  "displaced",
  "medical",
  "disability",
  "general",
] as const;

const FAMILY_PROFILE_STATUSES = [
  "published",
  "hidden",
  "archived",
  "suspended",
  "needs_update",
] as const;

const PRIORITIES = ["critical", "high", "medium", "normal"] as const;

function hasActiveFilters(filters: FamilyFilters) {
  return hasActiveFamilyFilters(filters);
}

export default function AdminFamiliesPage() {
  const { t, te, locale } = useI18n();
  const [families, setFamilies] = useState<FamilyListItem[]>([]);
  const [filters, setFilters] = useState<FamilyFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const loadFamilies = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await apiRequest<{ families: FamilyListItem[] }>(
        "/admin/families",
        {},
        getToken(),
      );
      setFamilies(data.families);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("families.loadFailed"));
    } finally {
      if (opts?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadFamilies();
  }, [loadFamilies]);

  function familyDisplayName(
    family: Pick<FamilyListItem, "headOfFamilyName" | "headOfFamilyNameAr">,
  ) {
    return localizedFamilyName(locale, family) ?? family.headOfFamilyName ?? "";
  }

  const filteredFamilies = useMemo(
    () => filterFamilies(families, filters),
    [families, filters],
  );

  async function confirmAction() {
    if (!pendingAction) return;

    const { family } = pendingAction;
    setActionId(family.id);

    try {
      if (pendingAction.type === "restrict") {
        const restricted = !family.accountRestricted;
        await apiRequest(
          `/admin/families/${family.id}/restrict`,
          {
            method: "PATCH",
            body: JSON.stringify({ restricted }),
          },
          getToken(),
        );
      } else if (pendingAction.type === "hide") {
        const hidden = family.profileStatus !== "hidden";
        await apiRequest(
          `/admin/families/${family.id}/hide`,
          {
            method: "PATCH",
            body: JSON.stringify({ hidden }),
          },
          getToken(),
        );
      } else {
        await apiRequest(
          `/admin/families/${family.id}`,
          { method: "DELETE" },
          getToken(),
        );
      }

      setPendingAction(null);
      await loadFamilies();
    } catch (err) {
      const fallback =
        pendingAction.type === "restrict"
          ? t("families.restrictFailed")
          : pendingAction.type === "hide"
            ? t("families.hideFailed")
            : t("families.deleteFailed");
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setActionId(null);
    }
  }

  const modalConfig = pendingAction
    ? pendingAction.type === "delete"
      ? {
          title: t("families.modal.deleteTitle"),
          message: t("families.modal.deleteMessage", {
            name: familyDisplayName(pendingAction.family),
            code: pendingAction.family.publicCode,
          }),
          confirmLabel: t("common.delete"),
          tone: "danger" as const,
        }
      : pendingAction.type === "hide"
        ? pendingAction.family.profileStatus === "hidden"
          ? {
              title: t("families.modal.showTitle"),
              message: t("families.modal.showMessage", {
                name: familyDisplayName(pendingAction.family),
                code: pendingAction.family.publicCode,
              }),
              confirmLabel: t("families.modal.showConfirm"),
              tone: "primary" as const,
            }
          : {
              title: t("families.modal.hideTitle"),
              message: t("families.modal.hideMessage", {
                name: familyDisplayName(pendingAction.family),
                code: pendingAction.family.publicCode,
              }),
              confirmLabel: t("families.modal.hideConfirm"),
              tone: "warning" as const,
            }
        : pendingAction.family.accountRestricted
        ? {
            title: t("families.modal.restoreTitle"),
            message: t("families.modal.restoreMessage", {
              name: familyDisplayName(pendingAction.family),
            }),
            confirmLabel: t("families.modal.restoreConfirm"),
            tone: "primary" as const,
          }
        : {
            title: t("families.modal.restrictTitle"),
            message: t("families.modal.restrictMessage", {
              name: familyDisplayName(pendingAction.family),
            }),
            confirmLabel: t("families.modal.restrictConfirm"),
            tone: "warning" as const,
          }
    : null;

  const emptyMessage =
    families.length === 0
      ? t("families.empty")
      : hasActiveFilters(filters)
        ? t("families.noResults")
        : t("families.empty");

  async function exportFamiliesCsv() {
    setExporting(true);
    setError(null);
    try {
      const data = await apiRequest<{ families: FamilyDetail[] }>(
        "/admin/families/export",
        {},
        getToken(),
      );
      const rows = filterFamilies(data.families, filters);
      if (rows.length === 0) return;
      exportFamiliesDetailCsv(rows, t, te);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("families.loadFailed"));
    } finally {
      setExporting(false);
    }
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
          <h1>{t("families.title")}</h1>
        </div>
        <ListToolbar
          onRefresh={() => void loadFamilies({ silent: true })}
          onExport={() => void exportFamiliesCsv()}
          refreshing={refreshing}
          exporting={exporting}
          exportDisabled={filteredFamilies.length === 0}
        >
          <Link href="/dashboard/admin/families/add" className={styles["btn-primary-inline"]}>
            <PlusIcon />
            {t("families.addFamily")}
          </Link>
        </ListToolbar>
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["filter-bar"]}>
          <div className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}>
            <label htmlFor="family-search">{t("filters.search")}</label>
            <input
              id="family-search"
              type="search"
              value={filters.search}
              placeholder={t("filters.searchFamilies")}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="family-region">{t("filters.region")}</label>
            <select
              id="family-region"
              value={filters.governorate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, governorate: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              {GOVERNORATES.map((value) => (
                <option key={value} value={value}>
                  {te("governorate", value)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="family-category">{t("filters.category")}</label>
            <select
              id="family-category"
              value={filters.caseCategory}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, caseCategory: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              {CASE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {te("caseCategory", value)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="family-priority">{t("filters.priority")}</label>
            <select
              id="family-priority"
              value={filters.priorityLevel}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, priorityLevel: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {te("priorityLevel", value)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="family-status">{t("filters.status")}</label>
            <select
              id="family-status"
              value={filters.profileStatus}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, profileStatus: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              {FAMILY_PROFILE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {te("profileStatus", value)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="family-account">{t("filters.account")}</label>
            <select
              id="family-account"
              value={filters.accountAccess}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, accountAccess: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              <option value="active">{t("filters.accountActive")}</option>
              <option value="restricted">{t("filters.accountRestricted")}</option>
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

        {loading && <p>{t("families.loading")}</p>}
        {error && <p style={{ color: "var(--error-text)" }}>{error}</p>}
        {!loading && !error && filteredFamilies.length === 0 && <p>{emptyMessage}</p>}
        {!loading && filteredFamilies.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("families.table.code")}</th>
                  <th>{t("families.table.head")}</th>
                  <th>{t("families.table.region")}</th>
                  <th>{t("families.table.size")}</th>
                  <th>{t("families.table.category")}</th>
                  <th>{t("families.table.priority")}</th>
                  <th>{t("families.table.required")}</th>
                  <th>{t("families.table.funding")}</th>
                  <th>{t("families.table.status")}</th>
                  <th>{t("families.table.loginEmail")}</th>
                  <th>{t("families.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFamilies.map((family) => (
                  <tr key={family.id}>
                    <td>{family.publicCode}</td>
                    <td>
                      {familyDisplayName(family)}
                      {family.accountRestricted && (
                        <span className={styles["restricted-badge"]}>
                          {t("families.restrictedBadge")}
                        </span>
                      )}
                      {family.profileStatus === "hidden" && (
                        <span className={styles["hidden-badge"]}>
                          {t("families.hiddenBadge")}
                        </span>
                      )}
                    </td>
                    <td>{te("governorate", family.governorate)}</td>
                    <td>{family.familySize}</td>
                    <td>{te("caseCategory", family.caseCategory)}</td>
                    <td>{te("priorityLevel", family.priorityLevel)}</td>
                    <td>${family.monthlyRequiredAmount}</td>
                    <td style={{ minWidth: "180px" }}>
                      <FamilyFundingProgress family={family} compact />
                    </td>
                    <td>{te("profileStatus", family.profileStatus)}</td>
                    <td>{family.accountEmail ?? t("common.empty")}</td>
                    <td>
                      <div className={styles["table-actions"]}>
                        <Link
                          href={`/dashboard/admin/families/${family.id}`}
                          className={styles["icon-btn"]}
                          title={t("families.actions.viewEdit")}
                          aria-label={t("families.actions.viewAria", {
                            name: familyDisplayName(family)
                          })}
                        >
                          <EyeIcon />
                        </Link>
                        <button
                          type="button"
                          className={`${styles["icon-btn"]} ${styles.warning} ${family.accountRestricted ? styles.active : ""}`}
                          title={
                            family.accountRestricted
                              ? t("families.actions.restore")
                              : t("families.actions.restrict")
                          }
                          aria-label={
                            family.accountRestricted
                              ? t("families.actions.restoreAria", {
                                  name: familyDisplayName(family)
                                })
                              : t("families.actions.restrictAria", {
                                  name: familyDisplayName(family)
                                })
                          }
                          disabled={actionId === family.id}
                          onClick={() =>
                            setPendingAction({ type: "restrict", family })
                          }
                        >
                          <LockIcon />
                        </button>
                        <button
                          type="button"
                          className={`${styles["icon-btn"]} ${styles.warning} ${family.profileStatus === "hidden" ? styles.active : ""}`}
                          title={
                            family.profileStatus === "hidden"
                              ? t("families.actions.show")
                              : t("families.actions.hide")
                          }
                          aria-label={
                            family.profileStatus === "hidden"
                              ? t("families.actions.showAria", {
                                  name: familyDisplayName(family)
                                })
                              : t("families.actions.hideAria", {
                                  name: familyDisplayName(family)
                                })
                          }
                          disabled={actionId === family.id}
                          onClick={() =>
                            setPendingAction({ type: "hide", family })
                          }
                        >
                          {family.profileStatus === "hidden" ? (
                            <EyeIcon />
                          ) : (
                            <EyeOffIcon />
                          )}
                        </button>
                        <button
                          type="button"
                          className={`${styles["icon-btn"]} ${styles.danger}`}
                          title={t("families.actions.delete")}
                          aria-label={t("families.actions.deleteAria", {
                            name: familyDisplayName(family)
                          })}
                          disabled={actionId === family.id}
                          onClick={() =>
                            setPendingAction({ type: "delete", family })
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
