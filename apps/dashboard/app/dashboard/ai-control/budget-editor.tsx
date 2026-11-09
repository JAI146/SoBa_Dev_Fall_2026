"use client";

import { useState } from "react";
import type { AssistantBudget, AssistantControl } from "@purposemint/contracts";
import { dollars } from "./expense-carousel";
import styles from "./ai-control.module.css";

export function BudgetEditor({
  data,
  busy,
  save,
}: {
  data: AssistantControl;
  busy: boolean;
  save: (budget: AssistantBudget) => Promise<void>;
}) {
  const [draft, setDraft] = useState(data.budget);
  const [limit, setLimit] = useState(String(data.budget.limitCents / 100));
  const total = Object.values(draft.shares).reduce(
    (sum, share) => sum + share,
    0,
  );
  const headroom = Math.max(0, 10000 - total);
  const balanced = draft.mode === "balanced";
  const cents = Math.round(Number(limit) * 100);
  const validLimit =
    /^\d+(\.\d{0,2})?$/.test(limit) && cents >= 0 && cents <= 10_000_000;
  const dirty =
    cents !== data.budget.limitCents ||
    draft.mode !== data.budget.mode ||
    Object.entries(draft.shares).some(
      ([id, share]) => share !== data.budget.shares[id],
    );
  const stale = draft.revision !== data.budget.revision;

  function switchMode(mode: AssistantBudget["mode"]) {
    const ids = Object.keys(draft.shares);
    const shares =
      mode === "balanced" && total > 10000
        ? Object.fromEntries(
            ids.map((id, index) => [
              id,
              Math.floor(10000 / ids.length) +
                (index < 10000 % ids.length ? 1 : 0),
            ]),
          )
        : draft.shares;
    setDraft({ ...draft, mode, shares });
  }

  return (
    <form
      className={styles.card}
      onSubmit={async (event) => {
        event.preventDefault();
        if (validLimit && dirty && !stale)
          await save({ ...draft, limitCents: cents });
      }}
    >
      <div className={styles.cardHeading}>
        <div>
          <h2>Monthly budget</h2>
          <p>
            Changes apply after you save. Budgets reset at the start of each
            month in UTC.
          </p>
        </div>
      </div>
      <div className={styles.budgetOptions}>
        <label>
          Overall monthly limit (USD)
          <input
            value={limit}
            type="number"
            min={0}
            max={100000}
            step="0.01"
            required
            onChange={(event) => setLimit(event.target.value)}
          />
        </label>
        <fieldset>
          <legend>Allocation mode</legend>
          <div className={styles.modes}>
            {(["flexible", "balanced"] as const).map((mode) => (
              <label key={mode}>
                <input
                  type="radio"
                  name="allocation"
                  checked={draft.mode === mode}
                  onChange={() => switchMode(mode)}
                />
                {mode === "flexible" ? "Flexible" : "Balanced"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <p className={styles.muted}>
        {balanced
          ? "Shares can add up to 100%. The lighter track shows how much more each admin can be allocated."
          : "Each admin can have up to 100% of the budget. All admins share the overall spending cap."}
      </p>
      <div className={styles.budgetList}>
        {data.admins
          .filter(({ id }) => draft.shares[id] !== undefined)
          .map((admin) => {
            const share = draft.shares[admin.id]!;
            const max = balanced ? Math.min(10000, share + headroom) : 10000;
            return (
              <div className={styles.budgetRow} key={admin.id}>
                <div>
                  <label htmlFor={"share-" + admin.id}>{admin.name}</label>
                  <span>
                    {share / 100}% ·{" "}
                    {dollars(validLimit ? (cents * share) / 1_000_000 : 0)}
                    {share === 0 ? " · Paused" : ""}
                  </span>
                </div>
                <div className={styles.range}>
                  <span
                    className={styles.rangeAvailable}
                    style={{ width: (balanced ? max : share) / 100 + "%" }}
                  />
                  <span
                    className={styles.rangeUsed}
                    style={{ width: share / 100 + "%" }}
                  />
                  <input
                    id={"share-" + admin.id}
                    type="range"
                    min={0}
                    max={10000}
                    step={1}
                    value={share}
                    aria-valuetext={share / 100 + " percent"}
                    onKeyDown={(event) => {
                      if (event.key === "End") {
                        event.preventDefault();
                        setDraft({
                          ...draft,
                          shares: { ...draft.shares, [admin.id]: max },
                        });
                      }
                    }}
                    onChange={(event) => {
                      const next = Math.min(max, Number(event.target.value));
                      setDraft({
                        ...draft,
                        shares: { ...draft.shares, [admin.id]: next },
                      });
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
      {stale && (
        <p role="status">
          Access or budget settings changed. Reopen Budget to load the latest
          settings.
        </p>
      )}
      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={!validLimit || !dirty || busy || stale}
        >
          Save budget
        </button>
      </div>
    </form>
  );
}
