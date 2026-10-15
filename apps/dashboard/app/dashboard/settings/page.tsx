import Link from "next/link";
import styles from "../dashboard.module.css";
import settings from "./settings.module.css";
export default function SettingsPage() {
  return (
    <main className={styles["dashboard-page"]}>
      <header className={styles["page-header"]}>
        <h1>Settings</h1>
      </header>
      <Link href="/dashboard/settings/notifications" className={settings.card}>
        <div className={styles["panel-heading"]}>
          <div>
            <h2>Notifications</h2>
            <p>Email setup, customer preferences, and notification activity.</p>
          </div>
        </div>
        <span className={settings.action}>Open notifications →</span>
      </Link>
    </main>
  );
}
