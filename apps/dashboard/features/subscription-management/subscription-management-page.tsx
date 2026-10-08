"use client";

import { useState } from "react";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./subscription-management.module.css";
import { PlansPanel } from "./plans-panel";
import { SubscriptionsPanel } from "./subscriptions-panel";

export function SubscriptionManagementPage() {
  const [tab, setTab] = useState("Plans");
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
      {tab === "Plans" ? <PlansPanel /> : <SubscriptionsPanel />}
    </main>
  );
}
