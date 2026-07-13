import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import styles from "./dashboard.module.css";

const activity = [
  { label: "Workspace review completed", time: "Today, 9:42 AM" },
  { label: "Quarterly goal updated", time: "Yesterday, 4:18 PM" },
  { label: "New team member invited", time: "Jul 10, 11:05 AM" },
];

const progress = [
  { label: "Product planning", value: 78 },
  { label: "Team onboarding", value: 56 },
  { label: "Operations", value: 41 },
];

export default function DashboardPage() {
  // TODO: Replace these neutral demo metrics with product API data when the
  // new PurposeMint domain model is defined.
  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Overview</p>
          <h1>Dashboard</h1>
          <p>Track the signals that matter across your workspace.</p>
        </div>
        <span className={styles["demo-label"]}>Demo data</span>
      </div>

      <section
        className={styles["dashboard-stat-grid"]}
        aria-label="Key metrics"
      >
        <DashboardStatCard
          label="Active users"
          value="1,284"
          icon="users"
          accent
        />
        <DashboardStatCard label="Open goals" value="36" icon="goals" />
        <DashboardStatCard label="Habits tracked" value="218" icon="habits" />
        <DashboardStatCard label="Linked accounts" value="94" icon="accounts" />
      </section>

      <section className={styles["overview-grid"]}>
        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Goal progress</h2>
              <p>Completion by focus area</p>
            </div>
            <span>Last 30 days</span>
          </div>
          <div className={styles["progress-list"]}>
            {progress.map((item) => (
              <div key={item.label} className={styles["progress-item"]}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}%</strong>
                </div>
                <div className={styles["progress-track"]}>
                  <span style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles["panel-heading"]}>
            <div>
              <h2>Recent activity</h2>
              <p>Latest workspace changes</p>
            </div>
          </div>
          <ul className={styles["activity-list"]}>
            {activity.map((item) => (
              <li key={item.label}>
                <span className={styles["activity-dot"]} aria-hidden />
                <div>
                  <strong>{item.label}</strong>
                  <time>{item.time}</time>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
