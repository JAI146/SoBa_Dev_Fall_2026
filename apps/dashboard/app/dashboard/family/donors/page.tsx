"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { EyeIcon } from "@/components/admin/table-action-icons";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatLocalDateTime } from "@/lib/format-local-datetime";
import {
  canChatSponsorship,
  SPONSORSHIP_STATUS_FILTER_OPTIONS,
  sponsorshipStatusClass,
  sponsorshipStatusKey,
} from "@/lib/sponsorship-status";
import {
  EMPTY_FAMILY_DONOR_FILTERS,
  filterFamilyDonors,
  hasActiveFamilyDonorFilters,
  type FamilyDonorFilters,
} from "@/lib/family-donor-filters";
import { useRefetchTriggers } from "@/lib/use-refetch-triggers";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

export default function FamilyDonorsPage() {
  const { t, te, locale } = useI18n();
  const [sponsorships, setSponsorships] = useState<SponsorshipListItem[]>([]);
  const [filters, setFilters] = useState<FamilyDonorFilters>(
    EMPTY_FAMILY_DONOR_FILTERS,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDonors = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await apiRequest<{ sponsorships: SponsorshipListItem[] }>(
          "/family/sponsorships",
          {},
          getToken(),
        );
        setSponsorships(data.sponsorships);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("family.donors.loadFailed"),
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
    void loadDonors();
  }, [loadDonors]);

  useRefetchTriggers(() => {
    void loadDonors({ silent: true });
  });

  const filteredSponsorships = useMemo(
    () => filterFamilyDonors(sponsorships, filters),
    [sponsorships, filters],
  );

  const emptyMessage = useMemo(() => {
    if (sponsorships.length === 0) {
      return t("family.donors.empty");
    }
    return t("family.donors.noFilterResults");
  }, [sponsorships.length, t]);

  function updateFilter<K extends keyof FamilyDonorFilters>(
    key: K,
    value: FamilyDonorFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("family.donors.title")}</h1>
          <p>{t("family.donors.description")}</p>
        </div>
        <RefreshButton
          refreshing={refreshing}
          disabled={loading}
          onClick={() => void loadDonors({ silent: true })}
        />
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["filter-bar"]}>
          <div
            className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}
          >
            <label htmlFor="family-donor-search">{t("filters.search")}</label>
            <input
              id="family-donor-search"
              type="search"
              value={filters.search}
              placeholder={t("filters.searchDonors")}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="family-donor-status">{t("filters.status")}</label>
            <select
              id="family-donor-status"
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
            <label htmlFor="family-donor-type">{t("sponsorships.table.type")}</label>
            <select
              id="family-donor-type"
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              <option value="full">{t("sponsorships.typeFull")}</option>
              <option value="partial">{t("sponsorships.typePartial")}</option>
            </select>
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="family-donor-duration-min">
              {t("sponsorships.filters.durationMin")}
            </label>
            <input
              id="family-donor-duration-min"
              type="number"
              min="1"
              placeholder={t("filters.all")}
              value={filters.durationMin}
              onChange={(e) => updateFilter("durationMin", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="family-donor-duration-max">
              {t("sponsorships.filters.durationMax")}
            </label>
            <input
              id="family-donor-duration-max"
              type="number"
              min="1"
              placeholder={t("filters.all")}
              value={filters.durationMax}
              onChange={(e) => updateFilter("durationMax", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="family-donor-submitted-from">
              {t("sponsorships.filters.submittedFrom")}
            </label>
            <input
              id="family-donor-submitted-from"
              type="date"
              value={filters.submittedFrom}
              onChange={(e) => updateFilter("submittedFrom", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="family-donor-submitted-to">
              {t("sponsorships.filters.submittedTo")}
            </label>
            <input
              id="family-donor-submitted-to"
              type="date"
              value={filters.submittedTo}
              onChange={(e) => updateFilter("submittedTo", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="family-donor-amount-min">
              {t("sponsorships.filters.amountMin")}
            </label>
            <input
              id="family-donor-amount-min"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("filters.all")}
              value={filters.amountMin}
              onChange={(e) => updateFilter("amountMin", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="family-donor-amount-max">
              {t("sponsorships.filters.amountMax")}
            </label>
            <input
              id="family-donor-amount-max"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("filters.all")}
              value={filters.amountMax}
              onChange={(e) => updateFilter("amountMax", e.target.value)}
            />
          </div>

          {hasActiveFamilyDonorFilters(filters) && (
            <div className={styles["filter-actions"]}>
              <button
                type="button"
                className={styles["btn-filter-clear"]}
                onClick={() => setFilters(EMPTY_FAMILY_DONOR_FILTERS)}
              >
                {t("filters.clear")}
              </button>
            </div>
          )}
        </div>

        {loading && !refreshing && <p>{t("family.donors.loading")}</p>}
        {!loading && !error && sponsorships.length > 0 && (
          <p className={styles["results-count"]}>
            {t("family.donors.resultsCount", {
              count: filteredSponsorships.length,
            })}
          </p>
        )}
        {!loading && !error && filteredSponsorships.length === 0 && (
          <p className={styles["empty-state"]}>{emptyMessage}</p>
        )}
        {!loading && !error && filteredSponsorships.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("family.donors.table.name")}</th>
                  <th>{t("family.donors.table.email")}</th>
                  <th>{t("family.donors.table.type")}</th>
                  <th>{t("family.donors.table.amount")}</th>
                  <th>{t("family.donors.table.duration")}</th>
                  <th>{t("family.donors.table.status")}</th>
                  <th>{t("family.donors.table.submitted")}</th>
                  <th>{t("family.donors.table.details")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSponsorships.map((item) => (
                  <tr key={item.id}>
                    <td>{item.donorName}</td>
                    <td>{item.donorEmail}</td>
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
                    <td>
                      <span className={styles["local-datetime"]}>
                        {formatLocalDateTime(item.createdAt, locale)}
                      </span>
                    </td>
                    <td>
                      <div className={styles["table-actions"]}>
                        {canChatSponsorship(item.status) && (
                          <Link
                            href={`/dashboard/family/chat/start/${encodeURIComponent(item.id)}`}
                            className={styles["icon-btn"]}
                            title={t("chat.openChat")}
                            aria-label={t("chat.openChat")}
                          >
                            💬
                          </Link>
                        )}
                        <Link
                          href={`/dashboard/family/donors/${encodeURIComponent(item.id)}`}
                          className={styles["icon-btn"]}
                          title={t("sponsorships.actions.view")}
                          aria-label={t("family.donors.viewAria", {
                            name: item.donorName,
                          })}
                        >
                          <EyeIcon />
                        </Link>
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
