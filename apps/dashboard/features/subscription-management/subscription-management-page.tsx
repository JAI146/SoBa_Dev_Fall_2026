"use client";

import { useState } from "react";
import { subscriptionAdminAccessSchema } from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { apiRoot } from "./shared";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./subscription-management.module.css";
import { PlansPanel } from "./plans-panel";
import { SubscriptionsPanel } from "./subscriptions-panel";

export function SubscriptionManagementPage() {
  const [tab, setTab] = useState("Plans");
  const access = useAdminQuery(
    `${apiRoot}/permissions`,
    subscriptionAdminAccessSchema,
  );
  if (access.error)
    return (
      <DashboardError
        message={access.error}
        onRetry={() => void access.reload()}
      />
    );
  if (!access.data || access.loading)
    return <DashboardLoading label="Loading subscriptions…" />;
  return (
    <main className={`${base["dashboard-page"]} ${styles.workspace}`}>
      <div className={base["page-header"]}>
        <div>
          <p className={base.eyebrow}>Admin Control Center</p>
          <h1>Subscriptions &amp; Plans</h1>
        </div>
      </div>
      <nav
        className={styles.tabs}
        aria-label="Subscription management sections"
      >
        {["Plans", "Subscriptions"].map((name) => (
          <button
            key={name}
            aria-current={tab === name ? "page" : undefined}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      {tab === "Plans" ? (
        <PlansPanel canManagePlans={access.data.canManagePlans} />
      ) : (
        <SubscriptionsPanel canEdit={access.data.canEdit} />
      )}
    </main>
  );
}
