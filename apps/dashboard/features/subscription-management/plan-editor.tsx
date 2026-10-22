"use client";

import { useState, type FormEvent } from "react";
import {
  adminPlanInputSchema,
  adminPlanSchema,
  subscriptionCapabilitiesSchema,
  type AdminPlan,
} from "@purposemint/contracts";
import { Dialog } from "@/components/common/dialog";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useAdminQuery } from "@/lib/use-admin-query";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./subscription-management.module.css";
import {
  apiRoot,
  localDate,
  optionalDate,
  optionalNumber,
  formErrorMessage,
} from "./shared";

export function PlanEditor({
  plan,
  onClose,
  onSaved,
}: {
  plan?: AdminPlan;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const capabilities = useAdminQuery(
    `${apiRoot}/capabilities`,
    subscriptionCapabilitiesSchema,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const promotionEnabled = form.get("promotionEnabled") === "on";
      const input = adminPlanInputSchema.parse({
        key: form.get("key"),
        name: form.get("name"),
        description: form.get("description"),
        tagline: form.get("tagline"),
        badge: form.get("badge") || null,
        ctaLabel: form.get("ctaLabel"),
        priceMonthly: Number(form.get("priceMonthly")),
        priceYearly: optionalNumber(form.get("priceYearly")),
        billingCycles: form.getAll("billingCycles"),
        features: String(form.get("features") ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        entitlements: {
          pathways: form.get("pathways") === "on",
          communityChallenges: form.get("communityChallenges") === "on",
        },
        limits: {
          pathwayApplications: optionalNumber(form.get("pathwayApplications")),
          challengeParticipations: optionalNumber(
            form.get("challengeParticipations"),
          ),
        },
        active: form.get("active") === "on",
        isDefault: form.get("isDefault") === "on",
        available: form.get("available") === "on",
        availableFrom: optionalDate(form.get("availableFrom")),
        availableUntil: optionalDate(form.get("availableUntil")),
        sortOrder: Number(form.get("sortOrder")),
        promotion: promotionEnabled
          ? {
              monthlyPrice: optionalNumber(form.get("promoMonthly")),
              yearlyPrice: optionalNumber(form.get("promoYearly")),
              startsAt: optionalDate(form.get("promoStart")),
              endsAt: optionalDate(form.get("promoEnd")),
            }
          : null,
      });
      setSaving(true);
      await apiRequest(
        `${apiRoot}/plans${plan ? `/${encodeURIComponent(plan.key)}` : ""}`,
        {
          method: plan ? "PATCH" : "POST",
          body: JSON.stringify(
            plan ? { expectedVersion: plan.version, plan: input } : input,
          ),
        },
        getToken(),
        adminPlanSchema,
      );
      await onSaved();
      onClose();
    } catch (cause) {
      setError(formErrorMessage(cause, "The plan could not be saved."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      className={styles["plan-dialog"]}
      title={plan ? `Edit ${plan.name}` : "Create subscription plan"}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form onSubmit={submit} className={styles.form}>
        <div className={`${styles.editor} ${styles.form}`}>
          <p className={styles.note}>
            Prices are in USD. Changes apply to new assignments and explicit
            plan changes. Existing agreed subscription charges remain unchanged.
          </p>
          <div className={styles.grid}>
            <label>
              Plan key
              <input
                name="key"
                required
                maxLength={20}
                pattern="[a-z][a-z0-9_-]*"
                defaultValue={plan?.key}
                readOnly={Boolean(plan)}
              />
            </label>
            <label>
              Plan name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={plan?.name}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              name="description"
              required
              maxLength={500}
              defaultValue={plan?.description}
            />
          </label>
          <label>
            Tagline
            <input
              name="tagline"
              maxLength={200}
              defaultValue={plan?.tagline}
            />
          </label>
          <div className={styles.grid}>
            <label>
              Badge
              <input
                name="badge"
                maxLength={100}
                defaultValue={plan?.badge ?? ""}
              />
            </label>
            <label>
              Call to action
              <input
                name="ctaLabel"
                required
                maxLength={100}
                defaultValue={plan?.ctaLabel ?? "Choose plan"}
              />
            </label>
          </div>
          <fieldset>
            <legend>Pricing and billing</legend>
            <div className={styles.grid}>
              <label>
                Monthly price
                <input
                  name="priceMonthly"
                  type="number"
                  min="0"
                  max="999999.99"
                  step="0.01"
                  required
                  defaultValue={plan?.priceMonthly ?? 0}
                />
              </label>
              <label>
                Yearly price
                <input
                  name="priceYearly"
                  type="number"
                  min="0"
                  max="999999.99"
                  step="0.01"
                  defaultValue={plan?.priceYearly ?? ""}
                />
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  name="billingCycles"
                  value="monthly"
                  defaultChecked={
                    plan?.billingCycles.includes("monthly") ?? true
                  }
                />
                Offer monthly billing
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  name="billingCycles"
                  value="yearly"
                  defaultChecked={
                    plan?.billingCycles.includes("yearly") ?? false
                  }
                />
                Offer yearly billing
              </label>
            </div>
          </fieldset>
          <label>
            Features shown to users (one per line)
            <textarea
              name="features"
              defaultValue={plan?.features.join("\n")}
            />
            <span className={styles.note}>
              Display descriptions do not grant access. Supported entitlements
              below control access.
            </span>
          </label>
          <fieldset>
            <legend>Entitlements and lifetime usage limits</legend>
            <div className={styles.form}>
              {capabilities.error ? (
                <p role="alert" className={base["inline-error"]}>
                  {capabilities.error}
                </p>
              ) : capabilities.loading ? (
                <p>Loading supported capabilities…</p>
              ) : (
                capabilities.data?.map((capability) => (
                  <div key={capability.key} className={styles.grid}>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        name={capability.key}
                        defaultChecked={
                          plan?.entitlements[capability.key] ?? false
                        }
                      />
                      {capability.name}
                    </label>
                    <label>
                      {capability.name} limit
                      <input
                        type="number"
                        min="1"
                        max="1000000"
                        name={capability.limitKey}
                        defaultValue={plan?.limits[capability.limitKey] ?? ""}
                        placeholder="Unlimited"
                      />
                    </label>
                  </div>
                ))
              )}
              <p className={styles.note}>
                Limits count all applications or challenge participations
                already created. Leave blank for unlimited. Existing records are
                preserved if a limit is lowered.
              </p>
            </div>
          </fieldset>
          <fieldset>
            <legend>Status and availability</legend>
            <div className={styles.grid}>
              <label className={styles.check}>
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={plan?.active ?? false}
                />
                Active
              </label>
              <label className={styles.check}>
                <input
                  name="isDefault"
                  type="checkbox"
                  defaultChecked={plan?.isDefault ?? false}
                />
                Default plan for new customers
              </label>
              <label className={styles.check}>
                <input
                  name="available"
                  type="checkbox"
                  defaultChecked={plan?.available ?? true}
                />
                Available for new subscriptions
              </label>
              <label>
                Available from
                <input
                  name="availableFrom"
                  type="datetime-local"
                  defaultValue={localDate(plan?.availableFrom)}
                />
              </label>
              <label>
                Available until
                <input
                  name="availableUntil"
                  type="datetime-local"
                  defaultValue={localDate(plan?.availableUntil)}
                />
              </label>
              <label>
                Display order
                <input
                  name="sortOrder"
                  type="number"
                  min="0"
                  max="1000000"
                  required
                  defaultValue={plan?.sortOrder ?? 0}
                />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Promotional pricing</legend>
            <div className={styles.form}>
              <label className={styles.check}>
                <input
                  name="promotionEnabled"
                  type="checkbox"
                  defaultChecked={Boolean(plan?.promotion)}
                />
                Enable promotion
              </label>
              <div className={styles.grid}>
                <label>
                  Promotional monthly price
                  <input
                    name="promoMonthly"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={plan?.promotion?.monthlyPrice ?? ""}
                  />
                </label>
                <label>
                  Promotional yearly price
                  <input
                    name="promoYearly"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={plan?.promotion?.yearlyPrice ?? ""}
                  />
                </label>
                <label>
                  Promotion starts
                  <input
                    name="promoStart"
                    type="datetime-local"
                    defaultValue={localDate(plan?.promotion?.startsAt)}
                  />
                </label>
                <label>
                  Promotion ends
                  <input
                    name="promoEnd"
                    type="datetime-local"
                    defaultValue={localDate(plan?.promotion?.endsAt)}
                  />
                </label>
              </div>
              <p className={styles.note}>
                New subscriptions receive the promotional price during this
                window. At a renewal after it ends, the subscription uses its
                originally agreed regular price.
              </p>
            </div>
          </fieldset>
        </div>
        {error && (
          <p className={base["inline-error"]} role="alert">
            {error}
          </p>
        )}
        <div className={base["modal-actions"]}>
          <button
            className={base["modal-btn-cancel"]}
            type="button"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={base["modal-btn-confirm"]}
            disabled={
              saving || capabilities.loading || Boolean(capabilities.error)
            }
          >
            {saving ? "Saving…" : "Save plan"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
