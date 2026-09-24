"use client";

/**
 * Reuses one validated form to create programs or edit their settings.
 * New programs start inactive; existing settings use version checks and require
 * approved eligibility criteria before activation.
 */
import { useState, type FormEvent } from "react";
import {
  incentiveProgramInputSchema,
  incentiveProgramCreateSchema,
  incentiveProgramSchema,
  type IncentiveProgram,
} from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./incentives.module.css";

export function ProgramSettings({
  program,
  reload,
  onCreated,
  onCancel,
}: {
  program?: IncentiveProgram;
  reload: () => Promise<void>;
  onCreated?: (program: IncentiveProgram) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(program?.name ?? "");
  const [amount, setAmount] = useState(
    ((program?.amountCents ?? 1000) / 100).toFixed(2),
  );
  const [rules, setRules] = useState(program?.eligibilityDescription ?? "");
  const [provisional, setProvisional] = useState(
    program?.rulesProvisional ?? true,
  );
  const [active, setActive] = useState(program?.active ?? false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const fields = {
      name,
      amountCents: Math.round(Number(amount) * 100),
      eligibilityDescription: rules,
    };
    const result = program
      ? incentiveProgramInputSchema.safeParse({
          ...fields,
          active,
          rulesProvisional: provisional,
          version: program.version,
        })
      : incentiveProgramCreateSchema.safeParse(fields);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the settings.");
      return;
    }
    setBusy(true);
    try {
      const savedProgram = await apiRequest<IncentiveProgram>(
        program
          ? `/admin/incentives/programs/${program.id}`
          : "/admin/incentives/programs",
        {
          method: program ? "PATCH" : "POST",
          body: JSON.stringify(result.data),
        },
        getToken(),
        incentiveProgramSchema,
      );
      if (!program && onCreated) await onCreated(savedProgram);
      else await reload();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${base.panel} ${styles.stack}`}>
      <div>
        <h2>{program ? "Program settings" : "New program"}</h2>
        <p className={styles.muted}>USD · One benefit per customer</p>
      </div>
      <form onSubmit={save} className={styles.form}>
        <label>
          Program name
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Bonus amount (USD)
          <input
            type="number"
            required
            min="0.01"
            max="1000000"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Eligibility criteria
          <textarea
            required
            minLength={10}
            maxLength={1000}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
          />
        </label>
        {program ? (
          <>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={provisional}
                onChange={(e) => {
                  setProvisional(e.target.checked);
                  if (e.target.checked) setActive(false);
                }}
              />
              Eligibility criteria awaiting approval
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={active}
                disabled={provisional}
                onChange={(e) => setActive(e.target.checked)}
              />
              Activate program for new awards
            </label>
            {!provisional && program.rulesProvisional ? (
              <p className={styles.notice}>
                Saving confirms approval of these eligibility criteria.
              </p>
            ) : null}
          </>
        ) : (
          <p className={styles.muted}>
            New programs start inactive. Activate them in Program settings.
          </p>
        )}
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className={styles.success}>
            Program settings saved.
          </p>
        ) : null}
        <button className={base["btn-toolbar-primary"]} disabled={busy}>
          {busy
            ? "Saving…"
            : program
              ? "Save program settings"
              : "Create program"}
        </button>
        {onCancel ? (
          <button
            type="button"
            className={styles.buttonLink}
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </form>
    </section>
  );
}
