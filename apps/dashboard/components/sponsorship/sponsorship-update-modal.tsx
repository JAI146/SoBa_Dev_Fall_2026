"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { FamilyPublicProfile, SponsorshipListItem, SponsorshipDurationPresetValue } from "@muakhah/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "@/app/dashboard/dashboard.module.css";
import authStyles from "@/app/auth.module.css";

type SponsorType = "full" | "partial";

type SponsorshipUpdateModalProps = {
  open: boolean;
  sponsorship: SponsorshipListItem | null;
  onClose: () => void;
  onUpdated: (sponsorship: SponsorshipListItem) => void;
};

function applySponsorshipToForm(
  item: SponsorshipListItem,
  setters: {
    setType: (v: SponsorType) => void;
    setAmount: (v: string) => void;
    setDurationPreset: (v: SponsorshipDurationPresetValue) => void;
    setNotes: (v: string) => void;
    setCurrent: (v: SponsorshipListItem) => void;
  },
) {
  setters.setType(item.type);
  setters.setAmount(item.type === "partial" ? String(item.monthlyAmount) : "");
  setters.setDurationPreset(item.durationPreset);
  setters.setNotes(item.notes ?? "");
  setters.setCurrent(item);
}

export function SponsorshipUpdateModal({
  open,
  sponsorship,
  onClose,
  onUpdated,
}: SponsorshipUpdateModalProps) {
  const { t } = useI18n();
  const [current, setCurrent] = useState<SponsorshipListItem | null>(null);
  const [family, setFamily] = useState<FamilyPublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<SponsorType>("full");
  const [amount, setAmount] = useState("");
  const [durationPreset, setDurationPreset] =
    useState<SponsorshipDurationPresetValue>("3_months");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sponsorship) {
      setCurrent(null);
      return;
    }
    const requestedSponsorship = sponsorship;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [sponsorshipRes, familyRes] = await Promise.all([
          apiRequest<{ sponsorship: SponsorshipListItem }>(
            `/donor/sponsorships/${requestedSponsorship.id}`,
            {},
            getToken(),
          ),
          apiRequest<{ family: FamilyPublicProfile }>(
            `/donor/families/${encodeURIComponent(requestedSponsorship.familyPublicCode)}`,
            {},
            getToken(),
          ),
        ]);

        if (cancelled) return;

        applySponsorshipToForm(sponsorshipRes.sponsorship, {
          setType,
          setAmount,
          setDurationPreset,
          setNotes,
          setCurrent: setCurrent,
        });
        setFamily(familyRes.family);
      } catch (err) {
        if (!cancelled) {
          applySponsorshipToForm(requestedSponsorship, {
            setType,
            setAmount,
            setDurationPreset,
            setNotes,
            setCurrent: setCurrent,
          });
          setError(
            err instanceof Error ? err.message : t("sponsorships.loadFailed"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, sponsorship, t]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;

    setSubmitting(true);
    setError(null);

    try {
      const data = await apiRequest<{ sponsorship: SponsorshipListItem }>(
        `/donor/sponsorships/${current.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            type,
            amount: type === "partial" ? Number(amount) : undefined,
            durationPreset,
            notes: notes.trim() || null,
          }),
        },
        getToken(),
      );

      onUpdated(data.sponsorship);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("sponsorships.update.updateFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !sponsorship) return null;

  const display = current ?? sponsorship;
  const monthlyRequired = family?.monthlyRequiredAmount ?? 0;
  const savedNotes = display.notes?.trim() ?? "";
  const durationPresets: SponsorshipDurationPresetValue[] = [
    "1_month",
    "3_months",
    "6_months",
    "ongoing",
  ];

  return (
    <div
      className={styles["modal-overlay"]}
      role="presentation"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className={`${styles["modal-card"]} ${styles["modal-card--detail"]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsorship-update-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="sponsorship-update-title" className={styles["modal-title"]}>
          {t("sponsorships.update.title")}
        </h2>
        <p className={styles["sponsorship-detail-subtitle"]}>
          {display.familyPublicCode}
        </p>

        {display.adminNotes && (
          <div className={authStyles["error-banner"]} style={{ marginTop: "1rem" }}>
            <strong>{t("sponsorships.adminNotesLabel")}: </strong>
            {display.adminNotes}
          </div>
        )}

        <p className={styles["form-hint"]} style={{ marginTop: "1rem" }}>
          {t("sponsorships.update.hint")}
        </p>

        {error && (
          <div className={authStyles["error-banner"]} style={{ marginTop: "1rem" }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>{t("common.loading")}</p>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className={styles["form-grid"]}
            style={{ marginTop: "1rem" }}
          >
            <fieldset
              className={`${styles["sponsor-type-field"]} ${styles["form-field"]} ${styles.full}`}
            >
              <legend>{t("sponsorships.typeLabel")}</legend>
              <div className={styles["sponsor-type-cards"]}>
                <label
                  className={`${styles["sponsor-type-card"]} ${
                    type === "full" ? styles["sponsor-type-card--selected"] : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="updateSponsorType"
                    value="full"
                    checked={type === "full"}
                    onChange={() => setType("full")}
                  />
                  <span className={styles["sponsor-type-card__badge"]}>
                    {t("sponsorships.typeFull")}
                  </span>
                  <span className={styles["sponsor-type-card__amount"]}>
                    ${monthlyRequired.toFixed(2)}
                    <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                      /{t("sponsorships.perMonth")}
                    </span>
                  </span>
                </label>

                <label
                  className={`${styles["sponsor-type-card"]} ${
                    type === "partial" ? styles["sponsor-type-card--selected"] : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="updateSponsorType"
                    value="partial"
                    checked={type === "partial"}
                    onChange={() => {
                      setType("partial");
                      if (!amount && display) {
                        setAmount(String(display.monthlyAmount));
                      }
                    }}
                  />
                  <span className={styles["sponsor-type-card__badge"]}>
                    {t("sponsorships.typePartial")}
                  </span>
                  <span className={styles["sponsor-type-card__title"]}>
                    {t("sponsorships.amountLabel")}
                  </span>
                </label>
              </div>
            </fieldset>

            {type === "partial" && (
              <div className={styles["form-field"]}>
                <label htmlFor="update-amount">{t("sponsorships.amountLabel")}</label>
                <input
                  id="update-amount"
                  type="number"
                  min="0.01"
                  max={monthlyRequired || undefined}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            )}

            <fieldset
              className={`${styles["sponsor-type-field"]} ${styles["form-field"]} ${styles.full}`}
            >
              <legend>{t("sponsorships.durationLabel")}</legend>
              <div className={styles["duration-preset-grid"]}>
                {durationPresets.map((preset) => (
                  <label
                    key={preset}
                    className={`${styles["duration-preset-card"]} ${
                      durationPreset === preset
                        ? styles["duration-preset-card--selected"]
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="updateDurationPreset"
                      value={preset}
                      checked={durationPreset === preset}
                      onChange={() => setDurationPreset(preset)}
                    />
                    {t(`sponsorships.durationPresets.${preset}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={`${styles["form-field"]} ${styles.full}`}>
              <label htmlFor="update-notes">{t("sponsorships.notesLabel")}</label>
              {savedNotes && (
                <div className={styles["sponsorship-current-notes"]}>
                  <span className={styles["sponsorship-current-notes__label"]}>
                    {t("sponsorships.update.currentNotes")}
                  </span>
                  <p>{savedNotes}</p>
                </div>
              )}
              <textarea
                id="update-notes"
                key={`${display.id}-${display.updatedAt}-notes`}
                rows={4}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("sponsorships.notesPlaceholder")}
              />
            </div>

            <div className={`${styles["modal-actions"]} ${styles.full}`}>
              <button
                type="button"
                className={styles["modal-btn-cancel"]}
                onClick={onClose}
                disabled={submitting}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className={`${styles["modal-btn-confirm"]} ${styles["modal-tone-primary"]}`}
                disabled={submitting || (type === "partial" && !amount)}
              >
                {submitting
                  ? t("sponsorships.update.submitting")
                  : t("sponsorships.update.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
