"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorTicketDetail, SponsorTicketListItem } from "@muakhah/contracts";
import { EyeIcon } from "@/components/admin/table-action-icons";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { DonorTicketDetailModal } from "@/components/sponsorship/donor-ticket-detail-modal";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  SPONSOR_TICKET_STATUS_OPTIONS,
  sponsorTicketStatusClass,
} from "@/lib/sponsor-ticket-status";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

type TicketFilters = {
  search: string;
  status: string;
  family: string;
};

const EMPTY_FILTERS: TicketFilters = {
  search: "",
  status: "",
  family: "",
};

function hasActiveFilters(filters: TicketFilters) {
  return Object.values(filters).some((value) => value !== "");
}

function truncate(text: string | null, max = 48) {
  if (!text) return "—";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export default function DonorTicketsPage() {
  const { t, te, locale } = useI18n();
  const [tickets, setTickets] = useState<SponsorTicketListItem[]>([]);
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SponsorTicketDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await apiRequest<{ tickets: SponsorTicketListItem[] }>(
          "/donor/tickets",
          {},
          getToken(),
        );
        setTickets(data.tickets);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("sponsorships.tickets.loadFailed"),
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
    void loadTickets();
  }, [loadTickets]);

  const familyOptions = useMemo(
    () => [...new Set(tickets.map((ticket) => ticket.familyPublicCode))].sort(),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filters.status && ticket.status !== filters.status) return false;
      if (filters.family && ticket.familyPublicCode !== filters.family) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        ticket.subject,
        ticket.familyPublicCode,
        ticket.lastMessagePreview ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [tickets, filters]);

  const emptyMessage = useMemo(() => {
    if (tickets.length === 0) {
      return t("sponsorships.tickets.empty");
    }
    return t("sponsorships.tickets.noResults");
  }, [tickets.length, t]);

  async function openTicket(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setReply("");
    setError(null);
    try {
      const data = await apiRequest<{ ticket: SponsorTicketDetail }>(
        `/donor/tickets/${encodeURIComponent(id)}`,
        {},
        getToken(),
      );
      setDetail(data.ticket);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("sponsorships.tickets.loadFailed"),
      );
      setDetailOpen(false);
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitReply() {
    if (!selectedId || !reply.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiRequest<{ ticket: SponsorTicketDetail }>(
        `/donor/tickets/${encodeURIComponent(selectedId)}/replies`,
        {
          method: "POST",
          body: JSON.stringify({ message: reply.trim() }),
        },
        getToken(),
      );
      setDetail(data.ticket);
      setReply("");
      await loadTickets({ silent: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("sponsorships.tickets.replyFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedId(null);
    setDetail(null);
    setReply("");
  }

  function updateFilter<K extends keyof TicketFilters>(
    key: K,
    value: TicketFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <DonorTicketDetailModal
        open={detailOpen}
        detail={detail}
        loading={detailLoading}
        reply={reply}
        submitting={submitting}
        onReplyChange={setReply}
        onSubmitReply={() => void submitReply()}
        onClose={closeDetail}
      />

      <div className={styles["page-actions"]}>
        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>
          <h1>{t("sponsorships.tickets.myTitle")}</h1>
          <p className={styles["page-description"]}>
            {t("sponsorships.tickets.myDescription")}
          </p>
          <Link
            href="/dashboard/visitor/sponsorships"
            className={`${styles["text-link"]} ${styles["text-link-inline"]}`}
            style={{ marginTop: "0.35rem", display: "inline-block" }}
          >
            {t("sponsorships.tickets.backToSponsorships")}
          </Link>
        </div>
        <RefreshButton
          refreshing={refreshing}
          disabled={loading}
          onClick={() => void loadTickets({ silent: true })}
        />
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <div className={styles["filter-bar"]}>
          <div className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}>
            <label htmlFor="ticket-search">{t("filters.search")}</label>
            <input
              id="ticket-search"
              type="search"
              value={filters.search}
              placeholder={t("sponsorships.tickets.searchPlaceholder")}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>

          <div className={styles["filter-field"]}>
            <label htmlFor="ticket-family">{t("sponsorships.filters.family")}</label>
            <select
              id="ticket-family"
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
            <label htmlFor="ticket-status">{t("filters.status")}</label>
            <select
              id="ticket-status"
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              {SPONSOR_TICKET_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {te("sponsorTicketStatus", status)}
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

        {loading && !refreshing && <p>{t("sponsorships.tickets.loading")}</p>}

        {!loading && tickets.length > 0 && (
          <p className={styles["results-count"]}>
            {t("sponsorships.resultsCount", { count: String(filteredTickets.length) })}
          </p>
        )}

        {!loading && filteredTickets.length === 0 && (
          <p className={styles["empty-state"]}>{emptyMessage}</p>
        )}

        {!loading && filteredTickets.length > 0 && (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("sponsorships.tickets.table.subject")}</th>
                  <th>{t("sponsorships.tickets.table.family")}</th>
                  <th>{t("sponsorships.tickets.table.status")}</th>
                  <th>{t("sponsorships.tickets.table.preview")}</th>
                  <th>{t("sponsorships.tickets.table.updated")}</th>
                  <th>{t("sponsorships.table.details")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.subject}</strong>
                    </td>
                    <td>{ticket.familyPublicCode}</td>
                    <td>
                      <span
                        className={`${styles["status-badge"]} ${sponsorTicketStatusClass(ticket.status)}`}
                      >
                        {te("sponsorTicketStatus", ticket.status)}
                      </span>
                    </td>
                    <td className={styles["ticket-preview-cell"]}>
                      {truncate(ticket.lastMessagePreview)}
                    </td>
                    <td>
                      {new Date(ticket.updatedAt).toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles["icon-btn"]}
                        title={t("sponsorships.actions.view")}
                        aria-label={t("sponsorships.tickets.viewAria", {
                          subject: ticket.subject,
                        })}
                        onClick={() => void openTicket(ticket.id)}
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
