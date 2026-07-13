"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type {
  TransferProofDetail,
  TransferProofListItem,
} from "@muakhah/contracts";
import { TransferProofDetailModal } from "@/components/admin/transfer-proof-detail-modal";
import { EyeIcon } from "@/components/admin/table-action-icons";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  TRANSFER_PROOF_STATUS_FILTER_OPTIONS,
  transferProofStatusClass,
} from "@/lib/transfer-proof-status";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

type TransferFilters = {
  search: string;
  status: string;
};

const EMPTY_FILTERS: TransferFilters = {
  search: "",
  status: "",
};

function hasActiveFilters(filters: TransferFilters) {
  return Object.values(filters).some((value) => value !== "");
}

function buildQuery(filters: TransferFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return qs ? `/admin/transfer-proofs?${qs}` : "/admin/transfer-proofs";
}

export default function AdminTransferRequestsPage() {
  const { t, te } = useI18n();
  const [proofs, setProofs] = useState<TransferProofListItem[]>([]);
  const [filters, setFilters] = useState<TransferFilters>(EMPTY_FILTERS);
  const [detail, setDetail] = useState<TransferProofDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProofs = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await apiRequest<{ transferProofs: TransferProofListItem[] }>(
          buildQuery(filters),
          {},
          getToken(),
        );
        setProofs(data.transferProofs);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("sponsorships.transferProof.loadFailed"),
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
      void loadProofs();
    }, filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadProofs, filters.search]);

  const emptyMessage = useMemo(() => {
    if (proofs.length === 0 && !hasActiveFilters(filters)) {
      return t("sponsorships.transferProof.adminEmpty");
    }
    return t("sponsorships.transferProof.adminNoResults");
  }, [proofs.length, filters, t]);

  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setError(null);
    try {
      const data = await apiRequest<{ transferProof: TransferProofDetail }>(
        `/admin/transfer-proofs/${encodeURIComponent(id)}`,
        {},
        getToken(),
      );
      setDetail(data.transferProof);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("sponsorships.transferProof.loadFailed"),
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleDetailUpdated(updated: TransferProofDetail) {
    setDetail(updated);
    setProofs((prev) =>
      prev.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              status: updated.status,
              adminNotes: updated.adminNotes,
              amount: updated.amount,
              transferDate: updated.transferDate,
            }
          : item,
      ),
    );
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
  }

  return (
    <>
      <TransferProofDetailModal
        open={detailOpen}
        detail={detail}
        loading={detailLoading}
        onClose={closeDetail}
        onUpdated={handleDetailUpdated}
        onError={setError}
      />

      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("sponsorships.transferProof.adminTitle")}</h1>
          <p>{t("sponsorships.transferProof.adminDescription")}</p>
        </div>
        <ListToolbar
          onRefresh={() => void loadProofs({ silent: true })}
          onExport={() => {}}
          exportDisabled
          refreshing={refreshing}
        />
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["filter-bar"]}>
          <div className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}>
            <label htmlFor="transfer-search">{t("filters.search")}</label>
            <input
              id="transfer-search"
              type="search"
              value={filters.search}
              placeholder={t("sponsorships.transferProof.searchPlaceholder")}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
          <div className={styles["filter-field"]}>
            <label htmlFor="transfer-status">{t("filters.status")}</label>
            <select
              id="transfer-status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">{t("filters.all")}</option>
              {TRANSFER_PROOF_STATUS_FILTER_OPTIONS.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {te("transferProofStatus", status)}
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

        {loading && <p>{t("common.loading")}</p>}
        {error && <div className={authStyles["error-banner"]}>{error}</div>}
        {!loading && !error && proofs.length === 0 && (
          <p>{emptyMessage}</p>
        )}
        {!loading && proofs.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("sponsorships.transferProof.table.family")}</th>
                  <th>{t("sponsorships.transferProof.table.donor")}</th>
                  <th>{t("sponsorships.transferProof.table.amount")}</th>
                  <th>{t("sponsorships.transferProof.table.transferDate")}</th>
                  <th>{t("sponsorships.transferProof.table.status")}</th>
                  <th>{t("sponsorships.transferProof.table.submitted")}</th>
                  <th>{t("sponsorships.transferProof.table.view")}</th>
                </tr>
              </thead>
              <tbody>
                {proofs.map((proof) => (
                  <tr key={proof.id}>
                    <td>
                      <Link
                        href={`/dashboard/admin/families/${encodeURIComponent(proof.familyId)}`}
                      >
                        {proof.familyPublicCode}
                      </Link>
                    </td>
                    <td>
                      <div>{proof.donorName}</div>
                      <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                        {proof.donorEmail}
                      </div>
                    </td>
                    <td>{formatTransferAmount(proof.amount)}</td>
                    <td>{formatTransferDate(proof.transferDate)}</td>
                    <td>
                      <span
                        className={`${styles["status-badge"]} ${transferProofStatusClass(proof.status)}`}
                      >
                        {te("transferProofStatus", proof.status)}
                      </span>
                    </td>
                    <td>{new Date(proof.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className={styles["icon-btn"]}
                        title={t("sponsorships.transferProof.table.view")}
                        aria-label={t("sponsorships.transferProof.table.view")}
                        onClick={() => void openDetail(proof.id)}
                      >
                        <EyeIcon />
                      </button>
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
