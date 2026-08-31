import styles from "@/app/dashboard/dashboard.module.css";

export function DashboardLoading({
  label = "Loading data…",
}: {
  label?: string;
}) {
  return (
    <main className={styles["dashboard-loading"]}>
      <span className={styles["loading-spinner"]} aria-hidden />
      <p>{label}</p>
    </main>
  );
}

export function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className={styles["dashboard-page"]}>
      <section className={styles["error-state"]} role="alert">
        <h1>Unable to load data</h1>
        <p>{message}</p>
        <button
          type="button"
          className={styles["btn-primary"]}
          onClick={onRetry}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
