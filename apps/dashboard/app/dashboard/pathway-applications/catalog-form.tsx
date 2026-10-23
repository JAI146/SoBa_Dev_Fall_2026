"use client";
import { useState, type FormEvent } from "react";
import {
  pathwayCatalogInputSchema,
  partnerCatalogInputSchema,
  type PartnerCatalog,
  type PartnerCatalogInput,
  type PathwayCatalog,
} from "@purposemint/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { TrashIcon } from "@/components/common/table-action-icons";
import styles from "./management.module.css";

type Props = {
  canManage: boolean;
  onSaved: () => Promise<void>;
  onClose: () => void;
};
export function PathwayForm({
  pathway,
  canManage,
  onSaved,
  onClose,
}: Props & { pathway: PathwayCatalog }) {
  const { key, version } = pathway;
  const initial = pathwayCatalogInputSchema.strip().parse(pathway);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof draft>(
    field: K,
    value: (typeof draft)[K],
  ) => setDraft((current) => ({ ...current, [field]: value }));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canManage || busy) return;
    const parsed = pathwayCatalogInputSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the fields.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        `/admin/pathway-management/pathways/${encodeURIComponent(key)}`,
        { method: "PATCH", body: JSON.stringify({ ...parsed.data, version }) },
        getToken(),
      );
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save pathway.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void save(event)} className={styles.form}>
      <fieldset disabled={!canManage || busy}>
        <label>
          Name
          <input
            required
            maxLength={150}
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            required
            maxLength={500}
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </label>
        <div className={styles.pair}>
          <label>
            Minimum savings ($)
            <input
              required
              type="number"
              min={0}
              max={99999999.99}
              step="0.01"
              value={draft.minimumAmount}
              onChange={(event) =>
                set("minimumAmount", Number(event.target.value))
              }
            />
          </label>
          <label>
            Icon emoji
            <input
              required
              value={draft.iconEmoji}
              onChange={(event) => set("iconEmoji", event.target.value)}
            />
          </label>
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
          />
          Active
        </label>
        <label>
          Display order
          <input
            type="number"
            min={0}
            max={10000}
            required
            value={draft.sortOrder}
            onChange={(event) => set("sortOrder", Number(event.target.value))}
          />
        </label>
        <label>
          Savings rationale
          <textarea
            required
            maxLength={10000}
            value={draft.whyThisAmountBody}
            onChange={(event) => set("whyThisAmountBody", event.target.value)}
          />
        </label>
        <h3>Cost breakdown</h3>
        {draft.whyThisAmountBreakdown.map((item, index) => (
          <div className={styles.breakdown} key={index}>
            <label>
              Cost label
              <input
                required
                maxLength={150}
                value={item.label}
                onChange={(event) =>
                  set(
                    "whyThisAmountBreakdown",
                    draft.whyThisAmountBreakdown.map((row, i) =>
                      i === index ? { ...row, label: event.target.value } : row,
                    ),
                  )
                }
              />
            </label>
            <label>
              Amount ($)
              <input
                type="number"
                required
                min={0}
                max={99999999.99}
                step="0.01"
                value={item.amount}
                onChange={(event) =>
                  set(
                    "whyThisAmountBreakdown",
                    draft.whyThisAmountBreakdown.map((row, i) =>
                      i === index
                        ? { ...row, amount: Number(event.target.value) }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              className={styles.iconButton}
              title="Remove cost"
              aria-label={`Remove cost ${index + 1}`}
              onClick={() =>
                set(
                  "whyThisAmountBreakdown",
                  draft.whyThisAmountBreakdown.filter((_, i) => i !== index),
                )
              }
            >
              <TrashIcon />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={draft.whyThisAmountBreakdown.length >= 20}
          onClick={() =>
            set("whyThisAmountBreakdown", [
              ...draft.whyThisAmountBreakdown,
              { label: "", amount: 0 },
            ])
          }
        >
          Add cost
        </button>
        <label>
          Source label
          <input
            required
            maxLength={150}
            value={draft.sourceLabel}
            onChange={(event) => set("sourceLabel", event.target.value)}
          />
        </label>
        <label>
          Source URL
          <input
            required
            type="url"
            maxLength={500}
            value={draft.sourceUrl}
            onChange={(event) => set("sourceUrl", event.target.value)}
          />
        </label>
      </fieldset>
      <p className={styles.note}>
        Eligibility uses Elevation membership and the current savings minimum.
        Existing application records remain available when a pathway is
        inactive.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {canManage && (
          <button className={styles.primary} disabled={busy} type="submit">
            {busy ? "Saving…" : "Save pathway"}
          </button>
        )}
        <button type="button" disabled={busy} onClick={onClose}>
          {canManage ? "Cancel" : "Close"}
        </button>
      </div>
    </form>
  );
}

export function PartnerForm({
  partner,
  pathways,
  canManage,
  onSaved,
  onClose,
}: Props & { partner?: PartnerCatalog; pathways: PathwayCatalog[] }) {
  const [draft, setDraft] = useState<PartnerCatalogInput>(() =>
    partner
      ? partnerCatalogInputSchema.parse({
          name: partner.name,
          partnerType: partner.partnerType,
          description: partner.description,
          locationLabel: partner.locationLabel,
          capabilityTags: partner.capabilityTags,
          pathwayKey: partner.pathwayKey,
          isActive: partner.isActive,
          sortOrder: partner.sortOrder,
        })
      : {
          name: "",
          partnerType: "",
          description: "",
          locationLabel: "",
          capabilityTags: [],
          pathwayKey: pathways.find((pathway) => pathway.isActive)?.key ?? "",
          isActive: true,
          sortOrder: 0,
        },
  );
  const [tags, setTags] = useState(draft.capabilityTags.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof PartnerCatalogInput>(
    field: K,
    value: PartnerCatalogInput[K],
  ) => setDraft((current) => ({ ...current, [field]: value }));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canManage || busy) return;
    const parsed = partnerCatalogInputSchema.safeParse({
      ...draft,
      capabilityTags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the fields.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        `/admin/pathway-management/partners${partner ? `/${partner.id}` : ""}`,
        {
          method: partner ? "PATCH" : "POST",
          body: JSON.stringify(
            partner
              ? { ...parsed.data, version: partner.version }
              : parsed.data,
          ),
        },
        getToken(),
      );
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save partner.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void save(event)} className={styles.form}>
      <fieldset disabled={!canManage || busy}>
        <label>
          Name
          <input
            required
            maxLength={180}
            value={draft.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </label>
        <label>
          Partner type
          <input
            required
            maxLength={100}
            value={draft.partnerType}
            onChange={(event) => set("partnerType", event.target.value)}
          />
        </label>
        <label>
          Associated pathway
          <select
            value={draft.pathwayKey}
            required
            disabled={Boolean(partner?.applicationCount)}
            onChange={(event) => set("pathwayKey", event.target.value)}
          >
            {pathways
              .filter(
                (pathway) =>
                  pathway.isActive || pathway.key === partner?.pathwayKey,
              )
              .map((pathway) => (
                <option key={pathway.key} value={pathway.key}>
                  {pathway.title}
                  {!pathway.isActive ? " (inactive)" : ""}
                </option>
              ))}
          </select>
        </label>
        <label>
          Description
          <textarea
            required
            maxLength={500}
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </label>
        <label>
          Location
          <input
            required
            maxLength={150}
            value={draft.locationLabel}
            onChange={(event) => set("locationLabel", event.target.value)}
          />
        </label>
        <label>
          Capability tags
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
          />
          Active
        </label>
        <label>
          Display order
          <input
            type="number"
            required
            min={0}
            max={10000}
            value={draft.sortOrder}
            onChange={(event) => set("sortOrder", Number(event.target.value))}
          />
        </label>
      </fieldset>
      {!!partner?.applicationCount && (
        <p className={styles.note}>
          The associated pathway is preserved because this partner is selected
          on applications.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {canManage && (
          <button disabled={busy} className={styles.primary} type="submit">
            {busy ? "Saving…" : partner ? "Save partner" : "Add partner"}
          </button>
        )}
        <button type="button" disabled={busy} onClick={onClose}>
          {canManage ? "Cancel" : "Close"}
        </button>
      </div>
    </form>
  );
}
