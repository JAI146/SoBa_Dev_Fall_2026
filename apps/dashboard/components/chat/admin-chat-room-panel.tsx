"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { ChatMessageListItem, ChatRoomListItem } from "@muakhah/contracts";
import {
  editChatMessageContent,
  getChatRoom,
  listChatMessages,
  reviewChatMessage,
} from "@/lib/chat-api";
import { getToken } from "@/lib/auth";
import {
  CHAT_MESSAGE_STATUS_TABS,
  chatMessageStatusClass,
  type ChatMessageStatusTab,
} from "@/lib/chat-message-status";
import { ChatMessageBody } from "@/components/chat/chat-message-body";
import { ChatStatusTabIcon } from "@/components/chat/chat-status-tab-icons";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import styles from "@/app/dashboard/dashboard.module.css";
import authStyles from "@/app/auth.module.css";

type AdminChatRoomPanelProps = {
  initialRoom: ChatRoomListItem;
};

export function AdminChatRoomPanel({ initialRoom }: AdminChatRoomPanelProps) {
  const { t, te } = useI18n();
  const [room, setRoom] = useState(initialRoom);
  const [tab, setTab] = useState<ChatMessageStatusTab>("pending");
  const [messages, setMessages] = useState<ChatMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const refreshAll = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const token = getToken();
        if (!token) {
          throw new Error(t("chat.loadFailed"));
        }
        const [roomData, messageData] = await Promise.all([
          getChatRoom("admin", room.id, token),
          listChatMessages("admin", room.id, token, tab),
        ]);
        setRoom(roomData.room);
        setMessages(messageData.messages);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("chat.loadFailed"));
      } finally {
        if (opts?.silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [room.id, tab, t],
  );

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  async function handleReview(
    messageId: string,
    status: "approved" | "rejected" | "escalated",
  ) {
    setActionId(messageId);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error(t("chat.reviewFailed"));
      }
      await reviewChatMessage(
        messageId,
        {
          status,
          adminNotes:
            status === "rejected"
              ? rejectNotes[messageId]?.trim() || null
              : null,
        },
        token,
      );
      await refreshAll({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("chat.reviewFailed"));
    } finally {
      setActionId(null);
    }
  }

  async function handleSaveEdit(messageId: string) {
    const content = editDrafts[messageId]?.trim();
    if (!content) return;

    setActionId(messageId);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error(t("chat.editFailed"));
      }
      await editChatMessageContent(messageId, content, token);
      setEditingId(null);
      await refreshAll({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("chat.editFailed"));
    } finally {
      setActionId(null);
    }
  }

  function startEditing(message: ChatMessageListItem) {
    setEditingId(message.id);
    setEditDrafts((prev) => ({
      ...prev,
      [message.id]: message.content ?? "",
    }));
  }

  function renderModerationActions(
    message: ChatMessageListItem,
    mode: "pending" | "escalated",
  ) {
    return (
      <div className={styles["chat-admin-actions"]}>
        <div className={styles["chat-admin-actions__buttons"]}>
          <button
            type="button"
            className={styles["btn-primary-inline"]}
            disabled={actionId === message.id}
            onClick={() => void handleReview(message.id, "approved")}
          >
            <ChatStatusTabIcon
              status="approved"
              className={styles["chat-action-btn__icon"]}
            />
            {t("chat.approve")}
          </button>
          {mode === "pending" && (
            <button
              type="button"
              className={styles["btn-secondary-inline"]}
              disabled={actionId === message.id}
              onClick={() => void handleReview(message.id, "escalated")}
            >
              <ChatStatusTabIcon
                status="escalated"
                className={styles["chat-action-btn__icon"]}
              />
              {t("chat.escalate")}
            </button>
          )}
        </div>
        <div className={styles["chat-reject-panel"]}>
          <label
            className={styles["chat-reject-panel__label"]}
            htmlFor={`reject-notes-${message.id}`}
          >
            {t("chat.rejectionReasonLabel")}
          </label>
          <textarea
            id={`reject-notes-${message.id}`}
            className={styles["chat-reject-panel__input"]}
            placeholder={t("chat.rejectNotesPlaceholder")}
            value={rejectNotes[message.id] ?? ""}
            rows={2}
            onChange={(e) =>
              setRejectNotes((prev) => ({
                ...prev,
                [message.id]: e.target.value,
              }))
            }
          />
          <div className={styles["chat-reject-panel__footer"]}>
            <button
              type="button"
              className={styles["chat-reject-btn"]}
              disabled={
                actionId === message.id || !rejectNotes[message.id]?.trim()
              }
              onClick={() => void handleReview(message.id, "rejected")}
            >
              <ChatStatusTabIcon
                status="rejected"
                className={styles["chat-action-btn__icon"]}
              />
              {t("chat.reject")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["chat-panel"]}>
      <div className={styles["chat-panel__header"]}>
        <div>
          <h2 className={styles["chat-panel__title"]}>
            {room.familyPublicCode} · {room.donorName}
          </h2>
          <p className={styles["form-hint"]}>{room.donorEmail}</p>
        </div>
        <div className={styles["chat-panel__header-actions"]}>
          {room.pendingCount > 0 && (
            <span className={styles["chat-pending-badge"]}>
              {t("chat.pendingCount", { count: room.pendingCount })}
            </span>
          )}
          <RefreshButton
            refreshing={refreshing}
            disabled={loading}
            onClick={() => void refreshAll({ silent: true })}
          />
        </div>
      </div>

      <div className={`${styles["tab-buttons"]} ${styles["chat-status-tabs"]}`}>
        {CHAT_MESSAGE_STATUS_TABS.map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles["chat-status-tab"]} ${
              tab === value ? styles.active : ""
            }`}
            onClick={() => setTab(value)}
          >
            <ChatStatusTabIcon
              status={value}
              className={styles["chat-status-tab__icon"]}
            />
            <span>{te("chatMessageStatus", value)}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ margin: "1rem 0" }}>
          {error}
        </div>
      )}

      <div className={styles["chat-messages"]}>
        {loading && !refreshing && <p>{t("chat.loadingMessages")}</p>}
        {!loading && messages.length === 0 && (
          <p className={styles["empty-state"]}>{t("chat.noMessagesInTab")}</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={styles["chat-admin-message"]}>
            <div className={styles["chat-message__meta"]}>
              <span>{message.senderName}</span>
              <span>{te("chatSenderRole", message.senderRole)}</span>
              <span>{new Date(message.createdAt).toLocaleString()}</span>
              <span
                className={`${styles["status-badge"]} ${chatMessageStatusClass(message.status)}`}
              >
                {te("chatMessageStatus", message.status)}
              </span>
            </div>
            {message.type === "text" ? (
              editingId === message.id ? (
                <textarea
                  className={styles["chat-edit-textarea"]}
                  value={editDrafts[message.id] ?? ""}
                  onChange={(e) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                      [message.id]: e.target.value,
                    }))
                  }
                  rows={4}
                />
              ) : (
                <p className={styles["chat-message__text"]}>{message.content}</p>
              )
            ) : (
              <ChatMessageBody
                message={message}
                documentLabel={t("chat.downloadDocument")}
              />
            )}
            {message.status === "rejected" && message.adminNotes && (
              <p className={styles["form-hint"]} style={{ marginTop: "0.5rem" }}>
                {t("chat.rejectionReasonLabel")}: {message.adminNotes}
              </p>
            )}
            {message.status !== "rejected" && message.adminNotes && (
              <p className={styles["form-hint"]} style={{ marginTop: "0.5rem" }}>
                {t("chat.adminNotesLabel")}: {message.adminNotes}
              </p>
            )}
            {tab === "pending" && renderModerationActions(message, "pending")}
            {tab === "escalated" && renderModerationActions(message, "escalated")}
            {tab === "approved" &&
              message.type === "text" &&
              (message.status === "approved" || message.status === "edited") &&
              (editingId === message.id ? (
                <div className={styles["chat-admin-actions"]}>
                  <button
                    type="button"
                    className={styles["btn-primary-inline"]}
                    disabled={actionId === message.id}
                    onClick={() => void handleSaveEdit(message.id)}
                  >
                    {t("chat.saveEdit")}
                  </button>
                  <button
                    type="button"
                    className={styles["btn-secondary-inline"]}
                    disabled={actionId === message.id}
                    onClick={() => setEditingId(null)}
                  >
                    {t("chat.cancelEdit")}
                  </button>
                </div>
              ) : (
                <div className={styles["chat-admin-actions"]}>
                  <button
                    type="button"
                    className={styles["btn-secondary-inline"]}
                    disabled={actionId === message.id}
                    onClick={() => startEditing(message)}
                  >
                    {t("chat.edit")}
                  </button>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
