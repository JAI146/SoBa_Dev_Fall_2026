"use client";

import {
  adminOverviewResponseSchema,
  type AdminOverviewResponse,
} from "@purposemint/contracts";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { useAdminQuery } from "@/lib/use-admin-query";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const query = useAdminQuery("/admin/overview", adminOverviewResponseSchema);

  if (query.error) {
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  }
  if (query.loading || !query.data) {
    return <DashboardLoading label="Loading overview…" />;
  }

  const data = query.data;
  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Overview</p>
          <h1>Admin dashboard</h1>
          <p>Current customer, pathway, and upgrade activity.</p>
        </div>
      </div>

      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Key metrics"
      >
        <DashboardStatCard
          label="Total users"
          value={data.totalUsers.toLocaleString()}
          icon="users"
          accent
        />
        <DashboardStatCard
          label={`Active users · ${data.activeUsers.windowDays} days`}
          value={data.activeUsers.count.toLocaleString()}
          icon="habits"
        />
        <DashboardStatCard
          label="Onboarding completion"
          value={`${data.onboardingCompletionRate}%`}
          icon="goals"
        />
        <DashboardStatCard
          label="Submitted applications"
          value={data.submittedPathwayApplications.toLocaleString()}
          icon="accounts"
        />
      </section>

      <section className={styles["overview-grid"]}>
        <CountPanel
          title="Users by membership"
          subtitle="Customer accounts"
          items={data.usersByTier}
        />
        <CountPanel
          title="Upgrade intents by plan"
          subtitle="Recorded demand"
          items={data.upgradeIntentsByPlan}
        />
        <CountPanel
          title="Submitted applications by pathway"
          subtitle="Applications awaiting or receiving coordinator support"
          items={data.pathwayApplicationsByPathway}
          wide
        />
      </section>
    </main>
  );
}

function CountPanel({
  items,
  subtitle,
  title,
  wide = false,
}: {
  items: AdminOverviewResponse["pathwayApplicationsByPathway"];
  subtitle: string;
  title: string;
  wide?: boolean;
}) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <article className={`${styles.panel} ${wide ? styles["panel--wide"] : ""}`}>
      <div className={styles["panel-heading"]}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className={styles["progress-list"]}>
        {items.map((item) => (
          <div key={item.key} className={styles["progress-item"]}>
            <div>
              <span>{item.label}</span>
              <strong>{item.count.toLocaleString()}</strong>
            </div>
            <div className={styles["progress-track"]}>
              <span style={{ width: `${(item.count / maximum) * 100}%` }} />
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className={styles["panel-empty"]}>No data recorded.</p>
        ) : null}
      </div>
    </article>
  );
}
