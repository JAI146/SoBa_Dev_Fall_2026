"use client";

import { useState, type FormEvent } from "react";
import {
  badgeInputSchema,
  badgeVariables,
  type BadgeDefinition,
  type BadgeRule,
} from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { EmojiField } from "./emoji-field";
import { TrashIcon } from "@/components/common/table-action-icons";
import base from "../../dashboard.module.css";
import styles from "./badges.module.css";

const newRule = (): BadgeRule => ({
  variable: "savings_progress",
  operator: "=",
  not: false,
  value: 100,
});

export function BadgeForm({
  badge,
  onSaved,
  onCancel,
  readOnly = false,
}: {
  badge?: BadgeDefinition;
  onSaved: () => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
}) {
  const [name, setName] = useState(badge?.name ?? "");
  const [description, setDescription] = useState(badge?.description ?? "");
  const [category, setCategory] = useState(badge?.category ?? "Savings");
  const [emoji, setEmoji] = useState(badge?.iconEmoji ?? "");
  const [active, setActive] = useState(badge?.active ?? false);
  const [reward, setReward] = useState(badge?.reward ?? "");
  const [criteria, setCriteria] = useState<BadgeRule[]>(
    badge?.criteria ?? [newRule()],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function changeRule(index: number, change: Partial<BadgeRule>) {
    setCriteria((rules) =>
      rules.map((rule, i) => (i === index ? { ...rule, ...change } : rule)),
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (readOnly || busy) return;
    const parsed = badgeInputSchema.safeParse({
      name,
      description,
      category,
      iconEmoji: emoji,
      active,
      reward: reward.trim() || null,
      criteria,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check badge fields.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        badge ? `/admin/badges/${badge.id}` : "/admin/badges",
        {
          method: badge ? "PATCH" : "POST",
          body: JSON.stringify(
            badge ? { ...parsed.data, version: badge.version } : parsed.data,
          ),
        },
        getToken(),
      );
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save badge.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className={styles.form}>
      {badge && badge.awardCount > 0 && (
        <p className={styles.lockNotice}>
          This badge has already been awarded to {badge.awardCount}{" "}
          {badge.awardCount === 1 ? "user" : "users"}. Its definition cannot be
          edited or deleted.
        </p>
      )}
      <fieldset disabled={busy || readOnly} className={styles.fields}>
        <EmojiField value={emoji} onChange={setEmoji} onError={setError} />
        <label>
          Name
          <input
            required
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            required
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          Category
          <input
            required
            maxLength={100}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>
        <div className={styles.ruleHeading}>
          <strong>Criteria (all required)</strong>
          <button
            type="button"
            disabled={criteria.length >= 20}
            onClick={() => setCriteria((rules) => [...rules, newRule()])}
          >
            + Add rule
          </button>
        </div>
        {criteria.map((rule, index) => {
          const variable = badgeVariables.find(
            (item) => item.value === rule.variable,
          )!;
          return (
            <div key={index} className={styles.rule}>
              <label>
                Variable
                <select
                  value={rule.variable}
                  onChange={(event) =>
                    changeRule(index, {
                      variable: event.target.value as BadgeRule["variable"],
                      value: event.target.value === "current_level" ? 1 : 0,
                    })
                  }
                >
                  {badgeVariables.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Operator
                <select
                  value={rule.operator}
                  onChange={(event) =>
                    changeRule(index, {
                      operator: event.target.value as BadgeRule["operator"],
                    })
                  }
                >
                  {["=", "<", "<=", ">", ">="].map((operator) => (
                    <option key={operator}>{operator}</option>
                  ))}
                </select>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={rule.not}
                  onChange={(event) =>
                    changeRule(index, { not: event.target.checked })
                  }
                />
                Not
              </label>
              <label>
                Value ({variable.unit})
                <input
                  required
                  type="number"
                  min={rule.variable === "current_level" ? 1 : 0}
                  max={
                    rule.variable === "savings_progress"
                      ? 100
                      : rule.variable === "current_level"
                        ? 5
                        : undefined
                  }
                  step={
                    rule.variable === "saved_amount"
                      ? "0.01"
                      : rule.variable === "savings_progress"
                        ? "any"
                        : "1"
                  }
                  value={Number.isNaN(rule.value) ? "" : rule.value}
                  onChange={(event) =>
                    changeRule(index, { value: event.target.valueAsNumber })
                  }
                />
              </label>
              <button
                type="button"
                title="Remove rule"
                aria-label={`Remove rule ${index + 1}`}
                disabled={criteria.length === 1}
                onClick={() =>
                  setCriteria((rules) => rules.filter((_, i) => i !== index))
                }
              >
                <TrashIcon />
              </button>
            </div>
          );
        })}
        <label>
          Reward
          <input
            value={reward}
            maxLength={500}
            placeholder="None"
            onChange={(event) => setReward(event.target.value)}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>
      </fieldset>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {!readOnly && (
          <button className={base["btn-toolbar-primary"]} disabled={busy}>
            {busy ? "Saving..." : badge ? "Save badge" : "Create badge"}
          </button>
        )}
        <button type="button" disabled={busy} onClick={onCancel}>
          {readOnly ? "Close" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
