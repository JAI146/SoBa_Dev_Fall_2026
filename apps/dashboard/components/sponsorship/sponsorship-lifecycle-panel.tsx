"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem } from "@muakhah/contracts";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { notifySponsorshipChanged } from "@/lib/sponsorship-events";
import {
  getSponsorshipStatusTargets,
  sponsorshipStatusClass,
  sponsorshipStatusKey,
  statusTargetToLifecycleAction,
  type SponsorshipStatusTarget,
} from "@/lib/sponsorship-status";
import styles from "@/app/dashboard/dashboard.module.css";

type SponsorshipLifecyclePanelProps = {
  sponsorship: SponsorshipListItem;
  role: "admin" | "donor";
  onUpdated: (sponsorship: SponsorshipListItem) => void;
  onError: (message: string) => void;
};

export function SponsorshipLifecyclePanel({
  sponsorship,
  role,
  onUpdated,
  onError,
}: SponsorshipLifecyclePanelProps) {
  const { t, te } = useI18n();
  const [selectedTarget, setSelectedTarget] = useState<SponsorshipStatusTarget | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const basePath =
    role === "admin"
      ? `/admin/sponsorships/${encodeURIComponent(sponsorship.id)}`
      : `/donor/sponsorships/${encodeURIComponent(sponsorship.id)}`;

  const statusTargets = useMemo(
    () => getSponsorshipStatusTargets(sponsorship.status, role),
    [sponsorship.status, role],
  );

  useEffect(() => {
    setSelectedTarget("");
    setNotes("");
  }, [sponsorship.id, sponsorship.status]);

  const pendingAction =
    role === "donor" && selectedTarget
      ? statusTargetToLifecycleAction(sponsorship.status, selectedTarget)
      : null;

  if (statusTargets.length === 0) {
    return null;
  }

  async function applyStatusChange() {
    if (!selectedTarget) return;

    setLoading(true);
    onError("");
    try {
      let data: { sponsorship: SponsorshipListItem };

      if (role === "admin") {
        data = await apiRequest<{ sponsorship: SponsorshipListItem }>(
          `${basePath}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: selectedTarget,
              notes: notes.trim() || null,
            }),
          },
          getToken(),
        );
      } else if (pendingAction === "approve") {
        data = await apiRequest<{ sponsorship: SponsorshipListItem }>(
          basePath,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: "active",
              adminNotes: notes.trim() || null,
            }),
          },
          getToken(),
        );
      } else if (pendingAction) {
        const path =
          pendingAction === "resume"
            ? `${basePath}/resume`
            : `${basePath}/${pendingAction}`;
        data = await apiRequest<{ sponsorship: SponsorshipListItem }>(
          path,
          {
            method: "PATCH",
            body:
              pendingAction === "resume"
                ? undefined
                : JSON.stringify({ notes: notes.trim() || null }),
          },
          getToken(),
        );
      } else {
        throw new Error(t("sponsorships.lifecycle.invalidTransition"));
      }

      onUpdated(data.sponsorship);
      notifySponsorshipChanged();
      setConfirmOpen(false);
      setSelectedTarget("");
      setNotes("");
    } catch (err) {
      onError(
        err instanceof Error ? err.message : t("sponsorships.lifecycle.failed"),
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedLabel = selectedTarget
    ? te("sponsorshipStatus", selectedTarget)
    : "";

  const currentStatusKey = sponsorshipStatusKey(sponsorship);

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        title={t("sponsorships.lifecycle.confirmTitle")}
        message={t("sponsorships.lifecycle.confirmMessage", {
          code: sponsorship.familyPublicCode,
          status: selectedLabel,
        })}
        tone={
          selectedTarget === "cancelled" || selectedTarget === "disputed"
            ? "danger"
            : "primary"
        }
        confirmLabel={t("sponsorships.lifecycle.updateStatus")}
        loading={loading}
        onConfirm={() => void applyStatusChange()}
        onCancel={() => {
          if (!loading) setConfirmOpen(false);
        }}
      />

      <section className={styles["sponsorship-action-panel"]}>
        <h3>{t("sponsorships.lifecycle.title")}</h3>
        <p className={styles["form-hint"]} style={{ marginTop: 0 }}>
          {t("sponsorships.lifecycle.currentStatus")}{" "}
          <span
            className={`${styles["status-badge"]} ${sponsorshipStatusClass(currentStatusKey)}`}
          >
            {te("sponsorshipStatus", currentStatusKey)}
          </span>
        </p>

        <div className={styles["sponsorship-status-form"]}>
          <div className={styles["form-field"]}>
            <label htmlFor="sponsorship-status-target">
              {t("sponsorships.lifecycle.updateTo")}
            </label>
            <select
              id="sponsorship-status-target"
              value={selectedTarget}
              onChange={(e) =>
                setSelectedTarget(e.target.value as SponsorshipStatusTarget | "")
              }
            >
              <option value="">{t("sponsorships.lifecycle.selectStatus")}</option>
              {statusTargets.map((status) => (
                <option key={status} value={status}>
                  {te("sponsorshipStatus", status)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles["form-field"]}>
            <label htmlFor="sponsorship-status-notes">
              {t("sponsorships.lifecycle.notesLabel")}
            </label>
            <textarea
              id="sponsorship-status-notes"
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("sponsorships.notesPlaceholder")}
            />
          </div>

          <button
            type="button"
            className={styles["btn-primary-inline"]}
            disabled={
              !selectedTarget ||
              loading ||
              (role === "donor" && !pendingAction)
            }
            onClick={() => setConfirmOpen(true)}
          >
            {t("sponsorships.lifecycle.updateStatus")}
          </button>
        </div>
      </section>
    </>
  );
}
