"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  adminUsersResponseSchema,
  adminSubscriptionDetailSchema,
  subscriptionAssignSchema,
  subscriptionChangeSchema,
  subscriptionCancelSchema,
  subscriptionPaymentInputSchema,
  type AdminSubscription,
} from "@purposemint/contracts";
import { Dialog } from "@/components/common/dialog";
import { useAdminQuery } from "@/lib/use-admin-query";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatMoney } from "@/lib/admin-format";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./subscription-management.module.css";
import {
  apiRoot,
  dateLabel,
  localDate,
  optionalDate,
  formErrorMessage,
} from "./shared";
import { PlanSelection } from "./plan-selection";
import { SearchableSelect } from "./searchable-select";

export type SubscriptionEditorAction =
  "assign" | "change" | "cancel" | "payment";
export function SubscriptionEditor({
  action,
  subscription,
  onClose,
  onSaved,
}: {
  action: SubscriptionEditorAction;
  subscription?: AdminSubscription;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titles = {
    assign: "Assign subscription",
    change: "Change plan or billing cycle",
    cancel: "Cancel subscription",
    payment: "Record payment outcome",
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const expectedVersion = subscription?.version;
    try {
      const input =
        action === "assign"
          ? subscriptionAssignSchema.parse({
              userId: form.get("userId"),
              expectedPlanVersion: Number(form.get("expectedPlanVersion")),
              planKey: form.get("planKey"),
              cycle: form.get("cycle"),
            })
          : action === "change"
            ? subscriptionChangeSchema.parse({
                expectedVersion,
                expectedPlanVersion: Number(form.get("expectedPlanVersion")),
                planKey: form.get("planKey"),
                cycle: form.get("cycle"),
                timing: form.get("timing"),
              })
            : action === "cancel"
              ? subscriptionCancelSchema.parse({
                  expectedVersion,
                  timing: form.get("timing"),
                })
              : subscriptionPaymentInputSchema.parse({
                  expectedVersion,
                  status: form.get("status"),
                  amountCents: Math.round(Number(form.get("amount")) * 100),
                  reference: form.get("reference"),
                  note: form.get("note"),
                  occurredAt: optionalDate(form.get("occurredAt")),
                });
      const path =
        action === "assign"
          ? `${apiRoot}/subscriptions`
          : `${apiRoot}/subscriptions/${subscription!.id}/${action === "payment" ? "payments" : action}`;
      setSaving(true);
      await apiRequest(
        path,
        { method: "POST", body: JSON.stringify(input) },
        getToken(),
        adminSubscriptionDetailSchema,
      );
      await onSaved();
      onClose();
    } catch (cause) {
      setError(formErrorMessage(cause, "The subscription could not be saved."));
    } finally {
      setSaving(false);
    }
  }
  const paymentAmount =
    subscription &&
    subscription.billing.promotionEndsAt &&
    Date.parse(subscription.billing.promotionEndsAt) <=
      Date.parse(subscription.renewalAt) &&
    Date.parse(subscription.renewalAt) <= Date.now()
      ? subscription.billing.regularAmountCents
      : (subscription?.billing.amountCents ?? 0);
  return (
    <Dialog
      open
      title={titles[action]}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form className={styles.form} onSubmit={submit}>
        <div className={`${styles.form} ${styles.editor}`}>
          {subscription && (
            <p className={styles.note}>
              {subscription.userName} · {subscription.userEmail}
              <br />
              Current plan: {subscription.planName}. Renewal:{" "}
              {dateLabel(subscription.renewalAt)}.
            </p>
          )}
          {action === "assign" && <CustomerSelection />}
          {(action === "assign" || action === "change") && <PlanSelection />}
          {(action === "change" || action === "cancel") && (
            <>
              <label>
                Effective date
                <select name="timing" defaultValue="immediate">
                  <option value="immediate">Immediately</option>
                  <option
                    value="renewal"
                    disabled={
                      subscription?.status === "cancelled" ||
                      Date.parse(subscription?.renewalAt ?? "") <= Date.now()
                    }
                  >
                    At next renewal
                  </option>
                </select>
              </label>
              <p className={styles.note}>
                {action === "change"
                  ? "Immediate changes start a new billing period. No automatic proration, refunds, or payment collection is performed."
                  : "Cancellation revokes subscription entitlements at the effective date and preserves all history."}
              </p>
            </>
          )}
          {action === "payment" && (
            <>
              <p className={styles.note}>
                Record an outcome confirmed outside PurposeMint. This action
                does not collect a payment. A failed payment suspends paid
                entitlements until a successful payment is recorded.
              </p>
              <label>
                Payment outcome
                <select name="status">
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label>
                Amount (USD)
                <input
                  name="amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  defaultValue={paymentAmount / 100}
                />
              </label>
              <p className={styles.note}>
                Agreed amount: {formatMoney(paymentAmount / 100)}. One payment
                covers one billing period.
              </p>
              <label>
                Unique payment reference
                <input name="reference" required maxLength={160} />
              </label>
              <label>
                Evidence or note
                <textarea name="note" required maxLength={500} />
              </label>
              <label>
                Payment occurred
                <input
                  name="occurredAt"
                  type="datetime-local"
                  required
                  defaultValue={localDate(new Date().toISOString())}
                />
              </label>
            </>
          )}
        </div>
        {error && (
          <p className={base["inline-error"]} role="alert">
            {error}
          </p>
        )}
        <div className={base["modal-actions"]}>
          <button
            type="button"
            className={base["modal-btn-cancel"]}
            disabled={saving}
            onClick={onClose}
          >
            Close
          </button>
          <button className={base["modal-btn-confirm"]} disabled={saving}>
            {saving
              ? "Saving…"
              : action === "cancel"
                ? "Confirm cancellation"
                : "Save subscription"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function CustomerSelection() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({ value: "", label: "" });
  const path = useMemo(
    () => `/admin/users?${new URLSearchParams({ pageSize: "100", search })}`,
    [search],
  );
  const query = useAdminQuery(path, adminUsersResponseSchema);
  return (
    <fieldset className={styles.form}>
      <legend>Choose a customer</legend>
      <SearchableSelect
        label="Customer"
        name="userId"
        value={selected.value}
        selectedLabel={selected.label}
        search={search}
        onSearch={setSearch}
        options={(query.data?.items ?? []).map((user) => ({
          value: user.id,
          label: `${user.firstName} ${user.lastName} · ${user.email}`,
        }))}
        loading={query.loading}
        error={query.error}
        onSelect={(value) => {
          const user = query.data?.items.find((user) => user.id === value);
          setSelected(
            user
              ? {
                  value: user.id,
                  label: `${user.firstName} ${user.lastName} · ${user.email}`,
                }
              : { value: "", label: "" },
          );
        }}
      />
      {query.data && query.data.total > 100 && (
        <p className={styles.note}>
          Showing the first 100 matches. Refine your search to find another
          customer.
        </p>
      )}
      <p className={styles.note}>
        Customers with existing subscriptions should use Change plan so their
        history is retained.
      </p>
    </fieldset>
  );
}
