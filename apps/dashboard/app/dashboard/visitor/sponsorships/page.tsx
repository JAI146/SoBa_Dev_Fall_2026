"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { EyeIcon, EditIcon } from "@/components/admin/table-action-icons";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { SponsorshipDetailModal } from "@/components/sponsorship/sponsorship-detail-modal";
import { SponsorshipUpdateModal } from "@/components/sponsorship/sponsorship-update-modal";
import {
  canChatSponsorship,
  needsSponsorshipClarification,
  SPONSORSHIP_STATUS_FILTER_OPTIONS,
  sponsorshipStatusClass,
  sponsorshipStatusKey,
} from "@/lib/sponsorship-status";
import { notifySponsorshipChanged } from "@/lib/sponsorship-events";
import {
  EMPTY_DONOR_SPONSORSHIP_FILTERS,
  filterDonorSponsorships,
  hasActiveDonorSponsorshipFilters,
  uniqueFamilyCodes,
  type DonorSponsorshipFilters,
} from "@/lib/donor-sponsorship-filters";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { formatSponsorshipDuration } from "@/lib/sponsorship-duration";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";
import { buildLandingFamilyUrl } from "@/lib/landing-links";

export default function DonorSponsorshipsPage() {
  const { t, te } = useI18n();
  const [sponsorships, setSponsorships] = useState<SponsorshipListItem[]>([]);
  const [filters, setFilters] = useState<DonorSponsorshipFilters>(
    EMPTY_DONOR_SPONSORSHIP_FILTERS,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailSponsorship, setDetailSponsorship] =
    useState<SponsorshipListItem | null>(null);
  const [updateSponsorship, setUpdateSponsorship] =
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
          "/donor/sponsorships",
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
    [t],
  );

  useEffect(() => {
    void loadSponsorships();
  }, [loadSponsorships]);

  const familyOptions = useMemo(
    () => uniqueFamilyCodes(sponsorships),
    [sponsorships],
  );

  const filteredSponsorships = useMemo(
    () => filterDonorSponsorships(sponsorships, filters),
    [sponsorships, filters],
  );

  const emptyMessage = useMemo(() => {
    if (sponsorships.length === 0) {
      return t("sponsorships.empty");
    }
    return t("sponsorships.noFilterResults");
  }, [sponsorships.length, t]);

  function updateFilter<K extends keyof DonorSponsorshipFilters>(
    key: K,
    value: DonorSponsorshipFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleLifecycleUpdated(updated: SponsorshipListItem) {
    setSponsorships((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
    setDetailSponsorship(updated);
    notifySponsorshipChanged();
  }

  return (
    <>
      <SponsorshipDetailModal
        open={detailSponsorship !== null}
        sponsorship={detailSponsorship}
        lifecycleRole="donor"
        familyHref={
          detailSponsorship
            ? buildLandingFamilyUrl(detailSponsorship.familyPublicCode)
            : undefined
        }
        onEdit={(item) => {
          setDetailSponsorship(null);
          setUpdateSponsorship(item);
        }}
        onLifecycleUpdated={handleLifecycleUpdated}
        onLifecycleError={setError}
        onClose={() => setDetailSponsorship(null)}
      />

      <SponsorshipUpdateModal
        open={updateSponsorship !== null}
        sponsorship={updateSponsorship}
        onClose={() => setUpdateSponsorship(null)}
        onUpdated={(updated) => {
          setSponsorships((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );
          setUpdateSponsorship(null);
        }}
      />

      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("sponsorships.myTitle")}</h1>
          <p>{t("sponsorships.myDescription")}</p>
        </div>
        <RefreshButton
          refreshing={refreshing}
          disabled={loading}
          onClick={() => void loadSponsorships({ silent: true })}
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
            <label htmlFor="sponsorship-family">
              {t("sponsorships.filters.family")}
            </label>
            <select
              id="sponsorship-family"
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
            <label htmlFor="sponsorship-status">{t("filters.status")}</label>
            <select
              id="sponsorship-status"
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              {SPONSORSHIP_STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {te("sponsorshipStatus", status)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="sponsorship-type">
              {t("sponsorships.table.type")}
            </label>
            <select
              id="sponsorship-type"
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              <option value="full">{t("sponsorships.typeFull")}</option>
              <option value="partial">{t("sponsorships.typePartial")}</option>
            </select>
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="sponsorship-duration-min">
              {t("sponsorships.filters.durationMin")}
            </label>
            <input
              id="sponsorship-duration-min"
              type="number"
              min="1"
              placeholder={t("filters.all")}
              value={filters.durationMin}
              onChange={(e) => updateFilter("durationMin", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="sponsorship-duration-max">
              {t("sponsorships.filters.durationMax")}
            </label>
            <input
              id="sponsorship-duration-max"
              type="number"
              min="1"
              placeholder={t("filters.all")}
              value={filters.durationMax}
              onChange={(e) => updateFilter("durationMax", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="sponsorship-submitted-from">
              {t("sponsorships.filters.submittedFrom")}
            </label>
            <input
              id="sponsorship-submitted-from"
              type="date"
              value={filters.submittedFrom}
              onChange={(e) => updateFilter("submittedFrom", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="sponsorship-submitted-to">
              {t("sponsorships.filters.submittedTo")}
            </label>
            <input
              id="sponsorship-submitted-to"
              type="date"
              value={filters.submittedTo}
              onChange={(e) => updateFilter("submittedTo", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="sponsorship-amount-min">
              {t("sponsorships.filters.amountMin")}
            </label>
            <input
              id="sponsorship-amount-min"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("filters.all")}
              value={filters.amountMin}
              onChange={(e) => updateFilter("amountMin", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="sponsorship-amount-max">
              {t("sponsorships.filters.amountMax")}
            </label>
            <input
              id="sponsorship-amount-max"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("filters.all")}
              value={filters.amountMax}
              onChange={(e) => updateFilter("amountMax", e.target.value)}
            />
          </div>

          {hasActiveDonorSponsorshipFilters(filters) && (
            <div className={styles["filter-actions"]}>
              <button
                type="button"
                className={styles["btn-filter-clear"]}
                onClick={() => setFilters(EMPTY_DONOR_SPONSORSHIP_FILTERS)}
              >
                {t("filters.clear")}
              </button>
            </div>
          )}
        </div>

        {loading && !refreshing && <p>{t("sponsorships.loading")}</p>}
        {!loading && sponsorships.length > 0 && (
          <p className={styles["results-count"]}>
            {t("sponsorships.resultsCount", {
              count: filteredSponsorships.length,
            })}
          </p>
        )}
        {!loading && !error && filteredSponsorships.length === 0 && (
          <p className={styles["empty-state"]}>{emptyMessage}</p>
        )}
        {!loading && filteredSponsorships.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("sponsorships.table.family")}</th>
                  <th>{t("sponsorships.table.type")}</th>
                  <th>{t("sponsorships.table.amount")}</th>
                  <th>{t("sponsorships.table.duration")}</th>
                  <th>{t("sponsorships.table.status")}</th>
                  <th>{t("sponsorships.table.submitted")}</th>
                  <th>{t("sponsorships.table.details")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSponsorships.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={buildLandingFamilyUrl(item.familyPublicCode)}
                      >
                        {item.familyPublicCode}
                      </Link>
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
                      {formatSponsorshipDuration(item, t)}
                    </td>
                    <td>
                      <div>
                        <span
                          className={`${styles["status-badge"]} ${sponsorshipStatusClass(sponsorshipStatusKey(item))}`}
                        >
                          {te("sponsorshipStatus", sponsorshipStatusKey(item))}
                        </span>
                        {needsSponsorshipClarification(item) && item.adminNotes && (
                          <p
                            className={styles["form-hint"]}
                            style={{ marginTop: "0.35rem", maxWidth: "16rem" }}
                          >
                            {item.adminNotes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className={styles["table-actions"]}>
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
                        {needsSponsorshipClarification(item) && (
                          <button
                            type="button"
                            className={styles["icon-btn"]}
                            title={t("sponsorships.actions.update")}
                            aria-label={t("sponsorships.actions.updateAria", {
                              code: item.familyPublicCode,
                            })}
                            onClick={() => setUpdateSponsorship(item)}
                          >
                            <EditIcon />
                          </button>
                        )}
                        {canChatSponsorship(item.status) && (
                          <Link
                            href={`/dashboard/visitor/chat/start/${encodeURIComponent(item.familyPublicCode)}`}
                            className={styles["icon-btn"]}
                            title={t("chat.openChat")}
                            aria-label={t("chat.openChat")}
                          >
                            💬
                          </Link>
                        )}
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
