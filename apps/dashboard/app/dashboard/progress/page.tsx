import Link from "next/link";
import styles from "../dashboard.module.css";
import { LevelProgressPanel } from "./level-progress-panel";
import progressStyles from "./progress.module.css";

export default function ProgressPage() {
  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Customer journey</p>
          <h1>Progress</h1>
          <p>Savings, five-level progression, and achievements in one place.</p>
        </div>
      </div>

      <nav className={progressStyles.jumps} aria-label="Progress sections">
        <a href="#levels">Five-level progress</a>
        <a href="#savings">Savings & goals</a>
        <a href="#badges">Badges & achievements</a>
      </nav>

      <div className={progressStyles.sections}>
        <section
          id="levels"
          className={styles.panel}
          aria-labelledby="levels-title"
        >
          <div className={styles["panel-heading"]}>
            <div>
              <h2 id="levels-title">Five-level progress</h2>
              <p>
                Milestones and current level are two views of the same journey.
              </p>
            </div>
          </div>
          <LevelProgressPanel />
        </section>

        <div className={progressStyles.featureGrid}>
          <Link
            id="savings"
            className={progressStyles.featureCard}
            href="/dashboard/progress/savings"
            aria-labelledby="savings-title"
          >
            <h2 id="savings-title">Savings & financial progress</h2>
            <div className={progressStyles.featureVisual} aria-hidden="true">
              <svg
                className={progressStyles.savingsVisual}
                viewBox="0 0 460 165"
                fill="none"
                preserveAspectRatio="xMidYMid meet"
              >
                <path d="M15 146H445" stroke="#d1fae5" strokeWidth="2" />
                <path
                  d="M16 135C40 131 47 139 72 126C92 115 105 122 125 113C146 102 154 108 172 99C195 87 200 94 219 83C242 69 252 80 273 68C296 55 305 63 326 46C343 34 359 42 379 28C400 14 420 23 443 12V146H16Z"
                  fill="#d1fae5"
                  opacity=".55"
                />
                <path
                  d="M16 135C40 131 47 139 72 126C92 115 105 122 125 113C146 102 154 108 172 99C195 87 200 94 219 83C242 69 252 80 273 68C296 55 305 63 326 46C343 34 359 42 379 28C400 14 420 23 443 12"
                  stroke="#059669"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className={progressStyles.featureAction}>View users →</span>
          </Link>

          <Link
            id="badges"
            className={progressStyles.featureCard}
            href="/dashboard/progress/badges"
            aria-labelledby="badges-title"
          >
            <h2 id="badges-title">Badges & achievements</h2>
            <div className={progressStyles.featureVisual} aria-hidden="true">
              <svg
                className={progressStyles.badgeVisual}
                viewBox="0 0 160 160"
                fill="none"
              >
                <path
                  d="M53 15H77L87 54L69 67L53 15Z"
                  fill="#34d399"
                  stroke="#047857"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M83 15H107L91 67L73 54L83 15Z"
                  fill="#6ee7b7"
                  stroke="#047857"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <circle
                  cx="80"
                  cy="95"
                  r="46"
                  fill="#ecfdf5"
                  stroke="#059669"
                  strokeWidth="7"
                />
                <circle
                  cx="80"
                  cy="95"
                  r="34"
                  stroke="#6ee7b7"
                  strokeWidth="3"
                />
                <path
                  d="M80 71L87 85L103 87L92 99L95 115L80 108L65 115L68 99L57 87L73 85L80 71Z"
                  fill="#059669"
                  stroke="#047857"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className={progressStyles.featureAction}>
              Explore badges →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
