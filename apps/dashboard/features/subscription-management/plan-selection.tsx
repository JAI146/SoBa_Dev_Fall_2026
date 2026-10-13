"use client";

import { useMemo, useState } from "react";
import {
  adminPlansResponseSchema,
  type AdminPlan,
  type BillingTerms,
} from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import { formatMoney, formatEnum } from "@/lib/admin-format";
import { apiRoot } from "./shared";
import styles from "./subscription-management.module.css";
import { SearchableSelect } from "./searchable-select";

export function PlanSelection() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminPlan | null>(null);
  const [cycle, setCycle] = useState<BillingTerms["cycle"]>("monthly");
  const path = useMemo(
    () =>
      `${apiRoot}/plans?${new URLSearchParams({ pageSize: "100", active: "true", search })}`,
    [search],
  );
  const query = useAdminQuery(path, adminPlansResponseSchema);
  const options = query.data?.items ?? [];
  return (
    <fieldset className={styles.form}>
      <legend>Choose an active plan</legend>
      <input
        type="hidden"
        name="expectedPlanVersion"
        value={selected?.version ?? ""}
      />
      <SearchableSelect
        label="Plan"
        name="planKey"
        value={selected?.key ?? ""}
        selectedLabel={selected?.name ?? ""}
        search={search}
        onSearch={setSearch}
        options={options.map((plan) => ({
          value: plan.key,
          label: `${plan.name}${!plan.available ? " (unavailable)" : ""}`,
          disabled: !plan.available,
        }))}
        loading={query.loading}
        error={query.error}
        onSelect={(key) => {
          const plan = options.find((p) => p.key === key) ?? null;
          setSelected(plan);
          setCycle(plan?.billingCycles[0] ?? "monthly");
        }}
      />
      <label>
        Billing cycle
        <select
          name="cycle"
          required
          value={cycle}
          disabled={!selected}
          onChange={(event) =>
            setCycle(event.target.value as BillingTerms["cycle"])
          }
        >
          {(selected?.billingCycles ?? ["monthly"]).map((value) => (
            <option key={value} value={value}>
              {formatEnum(value)} ·{" "}
              {formatMoney(
                value === "monthly"
                  ? (selected?.priceMonthly ?? 0)
                  : (selected?.priceYearly ?? null),
              )}
            </option>
          ))}
        </select>
      </label>
      {selected?.promotion && (
        <p className={styles.note}>
          Promotional pricing applies when the change takes effect during the
          promotion window.
        </p>
      )}
      {query.data && query.data.total > 100 && (
        <p className={styles.note}>
          Showing the first 100 matches. Refine your search to find another
          plan.
        </p>
      )}
      <p className={styles.note}>
        Inactive and unavailable plans cannot receive new assignments.
        Availability dates are checked at the effective date.
      </p>
    </fieldset>
  );
}
