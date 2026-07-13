import type { ChatMessageListItem } from "@muakhah/contracts";
import styles from "@/app/dashboard/dashboard.module.css";

type ChatMessageBodyProps = {
  message: ChatMessageListItem;
  documentLabel: string;
};

function DocumentFileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function ChatMessageBody({ message, documentLabel }: ChatMessageBodyProps) {
  if (message.type === "text") {
    return <p className={styles["chat-message__text"]}>{message.content}</p>;
  }

  if (!message.mediaUrl) {
    return null;
  }

  if (message.mediaKind === "document") {
    return (
      <a
        href={message.mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles["chat-document-card"]}
      >
        <span className={styles["chat-document-card__icon"]}>
          <DocumentFileIcon />
        </span>
        <span className={styles["chat-document-card__meta"]}>
          <strong>{message.content || documentLabel}</strong>
          <span>{documentLabel}</span>
        </span>
      </a>
    );
  }

  if (message.mediaKind === "sticker") {
    return (
      <img
        src={message.mediaUrl}
        alt=""
        className={styles["chat-message__sticker"]}
      />
    );
  }

  if (message.mediaKind === "video") {
    return (
      <video
        src={message.mediaUrl}
        controls
        className={styles["chat-message__media"]}
      />
    );
  }

  return (
    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
      <img
        src={message.mediaUrl}
        alt=""
        className={styles["chat-message__media"]}
      />
    </a>
  );
}
