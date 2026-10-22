import Link from "next/link";
import { ArrowUpRight, Medal, PiggyBank, Route } from "lucide-react";
import styles from "../dashboard.module.css";
import { LevelProgressPanel } from "./level-progress-panel";
import progressStyles from "./progress.module.css";

const sections = [
  {
    id: "savings",
    title: "Savings & financial progress",
    href: "/dashboard/progress/savings",
    icon: PiggyBank,
  },
  {
    id: "badges",
    title: "Badges & achievements",
    href: "/dashboard/progress/badges",
    icon: Medal,
  },
  {
    id: "pathways",
    title: "Pathways & partners",
    href: "/dashboard/progress/pathways",
    icon: Route,
  },
];

export default function ProgressPage() {
  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Customer journey</p>
          <h1>Progress</h1>
          <p>Savings, five-level progression, achievements, and pathways.</p>
        </div>
      </div>
      <div className={progressStyles.sections}>
        <nav
          className={progressStyles.featureGrid}
          aria-label="Progress sections"
        >
          {sections.map(({ id, title, href, icon: Icon }) => (
            <Link
              id={id}
              key={id}
              className={progressStyles.featureCard}
              href={href}
              aria-labelledby={`${id}-title`}
            >
              <span className={progressStyles.featureIcon} aria-hidden="true">
                <Icon strokeWidth={1.7} />
              </span>
              <h2 id={`${id}-title`}>{title}</h2>
              <ArrowUpRight
                className={progressStyles.featureArrow}
                size={18}
                aria-hidden="true"
              />
            </Link>
          ))}
        </nav>
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
      </div>
    </main>
  );
}
