"use client";

/**
 * Collects the amount, goal, reference, and evidence for a benefit event.
 * Validates input and preserves the same request key for retries; the API enforces
 * eligibility and balances before recording the event.
 */
import { useState, type FormEvent } from "react";
import {
  incentiveEventInputSchema,
  incentiveEventKinds,
  incentiveCategories,
  type IncentiveDetail,
  type IncentiveProgram,
} from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./incentives.module.css";
import { money, label } from "./shared";
export function EventForm({
  data,
  program,
  reload,
}: {
  data: IncentiveDetail;
  program: IncentiveProgram;
  reload: () => Promise<void>;
}) {
  const benefit = data.benefit;
  const [kind, setKind] = useState<(typeof incentiveEventKinds)[number]>(
    benefit.earnedAt ? "distribution" : "award",
  );
  const [amount, setAmount] = useState((benefit.amountCents / 100).toFixed(2));
  const [goal, setGoal] = useState("");
  const [category, setCategory] =
    useState<(typeof incentiveCategories)[number]>("other");
  const [reverses, setReverses] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [occurred, setOccurred] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Preserve the exact payload/key after an uncertain network failure. Editing clears it.
  const [pending, setPending] = useState<ReturnType<
    typeof incentiveEventInputSchema.parse
  > | null>(null);
  const original = data.events.find((e) => e.id === reverses);
  const supportsGoal = ["allocation", "release", "withdrawal"].includes(kind);
  const awardDisabled =
    kind === "award" &&
    (!program.active ||
      program.rulesProvisional ||
      !benefit.eligible ||
      !!benefit.earnedAt);
  const canReverse = data.events.filter(
    (e) =>
      !["eligibility", "award", "reversal"].includes(e.kind) &&
      !data.events.some((r) => r.reversesEventId === e.id),
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = incentiveEventInputSchema.safeParse(
      pending ?? {
        kind,
        amountCents:
          kind === "reversal"
            ? original?.amountCents
            : Math.round(Number(amount) * 100),
        ...(supportsGoal && goal ? { goalId: goal, category } : {}),
        ...(kind === "reversal" ? { reversesEventId: reverses } : {}),
        reason,
        reference,
        idempotencyKey: crypto.randomUUID(),
        occurredAt: occurred
          ? new Date(`${occurred}Z`).toISOString()
          : new Date().toISOString(),
      },
    );
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the event.");
      return;
    }
    setPending(result.data);
    setBusy(true);
    try {
      await apiRequest(
        `/admin/incentives/benefits/${benefit.id}/events`,
        { method: "POST", body: JSON.stringify(result.data) },
        getToken(),
      );
      setPending(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record event.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${base.panel} ${styles.stack}`}>
      <h2>Record a benefit event</h2>
      <p className={styles.muted}>
        Add an award, payment, allocation, or withdrawal.
      </p>
      <form
        className={styles.form}
        onSubmit={submit}
        onChange={() => {
          if (!busy) setPending(null);
        }}
      >
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, margin: 0 }}
          className={styles.form}
        >
          <div className={styles.row}>
            <label>
              Event
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as typeof kind);
                  setGoal("");
                  setConfirmed(false);
                }}
              >
                {incentiveEventKinds.map((k) => (
                  <option key={k} value={k}>
                    {label(k)}
                  </option>
                ))}
              </select>
            </label>
            {kind !== "reversal" ? (
              <label>
                Amount (USD)
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1000000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            ) : null}
          </div>
          {awardDisabled ? (
            <p className={styles.notice}>
              This benefit is not ready for an award.
            </p>
          ) : null}
          {supportsGoal ? (
            <div className={styles.row}>
              <label>
                {kind === "withdrawal" ? "Withdraw from" : "Goal"}
                <select
                  value={goal}
                  required={kind !== "withdrawal"}
                  onChange={(e) => setGoal(e.target.value)}
                >
                  <option value="">
                    {kind === "withdrawal"
                      ? "Unallocated funds"
                      : "Select a goal"}
                  </option>
                  {data.goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
              {goal ? (
                <label>
                  Recorded purpose/category
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as typeof category)
                    }
                  >
                    {incentiveCategories.map((c) => (
                      <option key={c} value={c}>
                        {label(c)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          {kind === "reversal" ? (
            <label>
              Original event
              <select
                required
                value={reverses}
                onChange={(e) => setReverses(e.target.value)}
              >
                <option value="">Select an event to reverse in full</option>
                {canReverse.map((e) => (
                  <option key={e.id} value={e.id}>
                    {label(e.kind)} · {money(e.amountCents)} · {e.reference}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Occurred at (UTC, optional)
            <input
              type="datetime-local"
              step="1"
              value={occurred}
              onChange={(e) => setOccurred(e.target.value)}
            />
            <span className={styles.muted}>
              Leave blank to use the current time.
            </span>
          </label>
          <label>
            Reference
            <input
              required
              minLength={3}
              maxLength={160}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Case, transfer, or review reference"
            />
          </label>
          <label>
            Notes
            <textarea
              required
              minLength={10}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className={styles.check}>
            <input
              required
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I have verified this event.
          </label>
        </fieldset>
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <button
          className={base["btn-toolbar-primary"]}
          disabled={busy || awardDisabled || !confirmed}
        >
          {busy
            ? "Recording…"
            : pending
              ? "Retry recording same event"
              : "Record event"}
        </button>
      </form>
    </section>
  );
}
