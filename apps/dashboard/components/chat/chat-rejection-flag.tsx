import styles from "@/app/dashboard/dashboard.module.css";

function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 22V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 4h11l-2 4 2 4H4"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatRejectionFlag({ reason }: { reason: string }) {
  return (
    <span className={styles["chat-rejection-flag"]}>
      <span className={styles["chat-rejection-flag__icon"]} aria-hidden>
        <FlagIcon />
      </span>
      <span className={styles["chat-rejection-flag__tooltip"]} role="tooltip">
        {reason}
      </span>
    </span>
  );
}
