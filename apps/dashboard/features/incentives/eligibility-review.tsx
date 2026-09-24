"use client";

/**
 * Opens a focused review dialog for a new or existing customer benefit.
 * Notes are optional; awarded benefits are read-only, and saving refreshes the table.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  IncentiveBenefit,
  IncentiveProgram,
} from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./incentives.module.css";
import { dateTime, UserPicker } from "./shared";

export function EligibilityReview({
  program,
  benefit,
  onClose,
  onSaved,
}: {
  program: IncentiveProgram;
  benefit?: IncentiveBenefit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [userId, setUserId] = useState(benefit?.userId ?? "");
  const [eligible, setEligible] = useState(benefit?.eligible !== false);
  const [reason, setReason] = useState(benefit?.eligibilityReason ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const readOnly = Boolean(benefit?.earnedAt);

  useEffect(() => {
    // Native dialogs contain focus and restore it to the button when closed.
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        "/admin/incentives/benefits/review",
        {
          method: "POST",
          body: JSON.stringify({
            programId: program.id,
            userId,
            eligible,
            reason,
          }),
        },
        getToken(),
      );
      onSaved();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save review.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="review-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={styles.stack}>
        <div className={styles.heading}>
          <h2 id="review-title">Eligibility review</h2>
          <button
            type="button"
            className={styles.buttonLink}
            disabled={busy}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {benefit ? (
          <div>
            <strong>{benefit.userName}</strong>
            <p className={styles.muted}>{benefit.email}</p>
            <p className={styles.muted}>
              Reviewed {dateTime(benefit.reviewedAt)}
            </p>
          </div>
        ) : (
          <UserPicker value={userId} onChange={setUserId} />
        )}
        {readOnly ? (
          <div className={styles.stack}>
            <span className={styles.status}>
              {eligible ? "Eligible" : "Not eligible"}
            </span>
            <p className={styles.reviewReason}>{reason}</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <fieldset disabled={busy} className={styles.formFields}>
              <label>
                Eligibility
                <select
                  value={String(eligible)}
                  onChange={(event) =>
                    setEligible(event.target.value === "true")
                  }
                >
                  <option value="true">Eligible</option>
                  <option value="false">Not eligible</option>
                </select>
              </label>
              <label>
                Review notes (optional)
                <textarea
                  maxLength={1000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            </fieldset>
            {error ? (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            ) : null}
            <button
              disabled={busy || !userId}
              className={base["btn-toolbar-primary"]}
            >
              {busy ? "Saving…" : "Save review"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
