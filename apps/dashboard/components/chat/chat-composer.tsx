"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { ChatMessageListItem } from "@muakhah/contracts";
import { sendChatMedia, sendChatText, type ChatRole } from "@/lib/chat-api";
import { CHAT_STICKERS, stickerToFile, type ChatSticker } from "@/lib/chat-stickers";
import { getToken } from "@/lib/auth";
import styles from "./chat-composer.module.css";

type ChatComposerProps = {
  role: ChatRole;
  roomId: string;
  disabled?: boolean;
  onMessageSent: (message: ChatMessageListItem) => void;
  onError: (message: string | null) => void;
};

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m22 2-7 20-4-9-9-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M22 2 11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path d="m3 16 5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="m16 10 5-3v10l-5-3v-4Z" fill="currentColor" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StickerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="13" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

export function ChatComposer({
  role,
  roomId,
  disabled = false,
  onMessageSent,
  onError,
}: ChatComposerProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setStickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [text]);

  async function sendFile(file: File, kind?: "document" | "sticker") {
    if (disabled || sending) return;

    setSending(true);
    setMenuOpen(false);
    setStickerOpen(false);
    onError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error(t("chat.sendFailed"));
      }
      const data = await sendChatMedia(role, roomId, file, token, kind);
      onMessageSent(data.message);
    } catch (err) {
      onError(err instanceof Error ? err.message : t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function handleSendText() {
    const content = text.trim();
    if (!content || disabled || sending) return;

    setSending(true);
    onError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error(t("chat.sendFailed"));
      }
      const data = await sendChatText(role, roomId, content, token);
      setText("");
      onMessageSent(data.message);
    } catch (err) {
      onError(err instanceof Error ? err.message : t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function handleStickerSelect(sticker: ChatSticker) {
    try {
      const file = await stickerToFile(sticker);
      await sendFile(file, "sticker");
    } catch {
      onError(t("chat.stickerSendFailed"));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendText();
    }
  }

  return (
    <div ref={rootRef} className={styles.composer}>
      {menuOpen && (
        <div className={styles.menu}>
          <button
            type="button"
            className={styles.menuItem}
            disabled={disabled || sending}
            onClick={() => photoInputRef.current?.click()}
          >
            <span className={styles.menuIcon}>
              <PhotoIcon />
            </span>
            {t("chat.attachPhoto")}
          </button>
          <button
            type="button"
            className={styles.menuItem}
            disabled={disabled || sending}
            onClick={() => videoInputRef.current?.click()}
          >
            <span className={styles.menuIcon}>
              <VideoIcon />
            </span>
            {t("chat.attachVideo")}
          </button>
          <button
            type="button"
            className={styles.menuItem}
            disabled={disabled || sending}
            onClick={() => documentInputRef.current?.click()}
          >
            <span className={styles.menuIcon}>
              <DocumentIcon />
            </span>
            {t("chat.attachDocument")}
          </button>
          <button
            type="button"
            className={styles.menuItem}
            disabled={disabled || sending}
            onClick={() => {
              setMenuOpen(false);
              setStickerOpen((open) => !open);
            }}
          >
            <span className={styles.menuIcon}>
              <StickerIcon />
            </span>
            {t("chat.attachSticker")}
          </button>
        </div>
      )}

      {stickerOpen && (
        <div className={styles.stickerPanel}>
          {CHAT_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              className={styles.stickerButton}
              disabled={disabled || sending}
              onClick={() => void handleStickerSelect(sticker)}
              title={t(sticker.labelKey)}
            >
              <img
                src={sticker.file}
                alt={t(sticker.labelKey)}
                className={styles.stickerImage}
              />
              <span className={styles.stickerLabel}>{t(sticker.labelKey)}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.row}>
        <button
          type="button"
          className={styles.attachButton}
          disabled={disabled || sending}
          aria-label={t("chat.openAttachMenu")}
          onClick={() => {
            setStickerOpen(false);
            setMenuOpen((open) => !open);
          }}
        >
          <PlusIcon />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          maxLength={5000}
          placeholder={t("chat.messagePlaceholder")}
          className={styles.input}
          disabled={disabled || sending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className={styles.sendButton}
          disabled={disabled || sending || !text.trim()}
          aria-label={t("chat.send")}
          onClick={() => void handleSendText()}
        >
          <SendIcon />
        </button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenFile}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void sendFile(file);
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className={styles.hiddenFile}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void sendFile(file);
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/zip"
        className={styles.hiddenFile}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void sendFile(file, "document");
        }}
      />
    </div>
  );
}
