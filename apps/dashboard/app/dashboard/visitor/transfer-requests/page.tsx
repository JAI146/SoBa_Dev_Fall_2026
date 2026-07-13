"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { TransferProofListItem } from "@muakhah/contracts";
import { EyeIcon } from "@/components/admin/table-action-icons";
import { DonorTransferProofDetailModal } from "@/components/sponsorship/donor-transfer-proof-detail-modal";
import { RefreshButton } from "@/components/dashboard/refresh-button";
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
import { buildLandingFamilyUrl } from "@/lib/landing-links";

type TransferFilters = {
  family: string;
  status: string;
};

const EMPTY_FILTERS: TransferFilters = {
  family: "",
  status: "",
};

function hasActiveFilters(filters: TransferFilters) {
  return Object.values(filters).some((value) => value !== "");
}

export default function DonorTransferRequestsPage() {
  const { t, te } = useI18n();
  const [proofs, setProofs] = useState<TransferProofListItem[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [filters, setFilters] = useState<TransferFilters>(EMPTY_FILTERS);
  const [detailProof, setDetailProof] = useState<TransferProofListItem | null>(null);
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
        const data = await apiRequest<{
          transferProofs: TransferProofListItem[];
          approvedCount: number;
        }>("/donor/transfer-proofs", {}, getToken());
        setProofs(data.transferProofs);
        setApprovedCount(data.approvedCount);
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
    [t],
  );

  useEffect(() => {
    void loadProofs();
  }, [loadProofs]);

  const familyOptions = useMemo(
    () => [...new Set(proofs.map((proof) => proof.familyPublicCode))].sort(),
    [proofs],
  );

  const filteredProofs = useMemo(() => {
    return proofs.filter((proof) => {
      if (filters.family && proof.familyPublicCode !== filters.family) {
        return false;
      }
      if (filters.status && proof.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [proofs, filters]);

  const emptyMessage = useMemo(() => {
    if (proofs.length === 0) {
      return t("sponsorships.transferProof.empty");
    }
    return t("sponsorships.transferProof.adminNoResults");
  }, [proofs.length, t]);

  function updateFilter<K extends keyof TransferFilters>(
    key: K,
    value: TransferFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <DonorTransferProofDetailModal
        open={detailProof !== null}
        proof={detailProof}
        onClose={() => setDetailProof(null)}
      />

      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("sponsorships.transferProof.myTitle")}</h1>
          <p>{t("sponsorships.transferProof.myDescription")}</p>
          <p className={styles["form-hint"]} style={{ marginTop: "0.35rem" }}>
            {t("sponsorships.transferProof.approvedCountLabel")}: {approvedCount}
          </p>
        </div>
        <RefreshButton
          refreshing={refreshing}
          disabled={loading}
          onClick={() => void loadProofs({ silent: true })}
        />
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["filter-bar"]}>
          <div className={styles["filter-field"]}>
            <label htmlFor="transfer-family">{t("sponsorships.filters.family")}</label>
            <select
              id="transfer-family"
              value={filters.family}
              onChange={(e) => updateFilter("family", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              {familyOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="transfer-status">{t("filters.status")}</label>
            <select
              id="transfer-status"
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
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

        {loading && !refreshing && <p>{t("common.loading")}</p>}
        {!loading && proofs.length > 0 && (
          <p className={styles["results-count"]}>
            {t("sponsorships.resultsCount", { count: filteredProofs.length })}
          </p>
        )}
        {!loading && !error && filteredProofs.length === 0 && (
          <p className={styles["empty-state"]}>{emptyMessage}</p>
        )}
        {!loading && filteredProofs.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("sponsorships.transferProof.table.family")}</th>
                  <th>{t("sponsorships.transferProof.table.amount")}</th>
                  <th>{t("sponsorships.transferProof.table.transferDate")}</th>
                  <th>{t("sponsorships.transferProof.table.status")}</th>
                  <th>{t("sponsorships.transferProof.table.submitted")}</th>
                  <th>{t("sponsorships.table.details")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProofs.map((proof) => (
                  <tr key={proof.id}>
                    <td>
                      <Link
                        href={buildLandingFamilyUrl(proof.familyPublicCode)}
                      >
                        {proof.familyPublicCode}
                      </Link>
                    </td>
                    <td>{formatTransferAmount(proof.amount)}</td>
                    <td>{formatTransferDate(proof.transferDate)}</td>
                    <td>
                      <div>
                        <span
                          className={`${styles["status-badge"]} ${transferProofStatusClass(proof.status)}`}
                        >
                          {te("transferProofStatus", proof.status)}
                        </span>
                        {proof.adminNotes &&
                          (proof.status === "rejected" ||
                            proof.status === "clarification" ||
                            proof.status === "disputed") && (
                            <p
                              className={styles["form-hint"]}
                              style={{ marginTop: "0.35rem", maxWidth: "16rem" }}
                            >
                              {proof.adminNotes}
                            </p>
                          )}
                      </div>
                    </td>
                    <td>{new Date(proof.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className={styles["icon-btn"]}
                        title={t("sponsorships.actions.view")}
                        aria-label={t("sponsorships.actions.viewAria", {
                          code: proof.familyPublicCode,
                        })}
                        onClick={() => setDetailProof(proof)}
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
