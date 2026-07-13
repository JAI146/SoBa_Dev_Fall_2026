"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { TransferProofListItem } from "@muakhah/contracts";
import { EyeIcon } from "@/components/admin/table-action-icons";
import { FamilyTransferProofDetailModal } from "@/components/sponsorship/family-transfer-proof-detail-modal";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

export default function FamilyTransfersPage() {
  const { t } = useI18n();
  const [proofs, setProofs] = useState<TransferProofListItem[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [donorFilter, setDonorFilter] = useState("");
  const [detailProof, setDetailProof] = useState<TransferProofListItem | null>(
    null,
  );
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
        }>("/family/transfer-proofs", {}, getToken());
        setProofs(data.transferProofs);
        setApprovedCount(data.approvedCount);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("family.transfers.loadFailed"),
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

  const donorOptions = useMemo(
    () =>
      [...new Set(proofs.map((proof) => proof.donorName).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [proofs],
  );

  const filteredProofs = useMemo(() => {
    if (!donorFilter) return proofs;
    return proofs.filter((proof) => proof.donorName === donorFilter);
  }, [proofs, donorFilter]);

  return (
    <>
      <FamilyTransferProofDetailModal
        open={detailProof !== null}
        proof={detailProof}
        onClose={() => setDetailProof(null)}
      />

      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("family.transfers.title")}</h1>
          <p>{t("family.transfers.description")}</p>
          <p className={styles["form-hint"]} style={{ marginTop: "0.35rem" }}>
            {t("family.transfers.approvedCountLabel")}: {approvedCount}
          </p>
        </div>
        <RefreshButton
          refreshing={refreshing}
          disabled={loading}
          onClick={() => void loadProofs({ silent: true })}
        />
      </div>

      {error && (
        <div
          className={authStyles["error-banner"]}
          style={{ marginBottom: "1rem" }}
        >
          {error}
        </div>
      )}

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        {proofs.length > 0 && (
          <div className={styles["filter-bar"]}>
            <div className={styles["filter-field"]}>
              <label htmlFor="family-transfer-donor">
                {t("family.transfers.table.donor")}
              </label>
              <select
                id="family-transfer-donor"
                value={donorFilter}
                onChange={(e) => setDonorFilter(e.target.value)}
              >
                <option value="">{t("filters.all")}</option>
                {donorOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {donorFilter && (
              <div className={styles["filter-actions"]}>
                <button
                  type="button"
                  className={styles["btn-filter-clear"]}
                  onClick={() => setDonorFilter("")}
                >
                  {t("filters.clear")}
                </button>
              </div>
            )}
          </div>
        )}

        {loading && !refreshing && <p>{t("family.transfers.loading")}</p>}
        {!loading && proofs.length > 0 && (
          <p className={styles["results-count"]}>
            {t("family.transfers.resultsCount", {
              count: filteredProofs.length,
            })}
          </p>
        )}
        {!loading && !error && filteredProofs.length === 0 && (
          <p className={styles["empty-state"]}>{t("family.transfers.empty")}</p>
        )}
        {!loading && filteredProofs.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("family.transfers.table.donor")}</th>
                  <th>{t("family.transfers.table.email")}</th>
                  <th>{t("family.transfers.table.amount")}</th>
                  <th>{t("family.transfers.table.transferDate")}</th>
                  <th>{t("family.transfers.table.submitted")}</th>
                  <th>{t("family.transfers.table.details")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProofs.map((proof) => (
                  <tr key={proof.id}>
                    <td>{proof.donorName}</td>
                    <td>{proof.donorEmail}</td>
                    <td>{formatTransferAmount(proof.amount)}</td>
                    <td>{formatTransferDate(proof.transferDate)}</td>
                    <td>{new Date(proof.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className={styles["icon-btn"]}
                        title={t("sponsorships.actions.view")}
                        aria-label={t("family.transfers.viewAria", {
                          name: proof.donorName,
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
