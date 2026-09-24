import Link from "next/link";
import styles from "../../dashboard.module.css";

export default function BadgesPage() {
  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Customer journey</p>
          <h1>Badges & achievements</h1>
          <p>Badge definitions, awards, and achievement history.</p>
        </div>
      </div>
      <section className={styles.panel}>
        <p className={styles["panel-empty"]}>
          Badge definitions and user awards are not available in the current
          database yet. This area will show badges and award history when those
          records and rules are implemented.
        </p>
        <Link className={styles["inline-link"]} href="/dashboard/progress">
          ← Back to progress
        </Link>
      </section>
    </main>
  );
}
