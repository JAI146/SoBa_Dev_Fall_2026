"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@muakhah/i18n";

import type { ChatMessageListItem, ChatRoomListItem } from "@muakhah/contracts";

import { ChatComposer } from "@/components/chat/chat-composer";

import { ChatMessageBody } from "@/components/chat/chat-message-body";

import { ChatRejectionFlag } from "@/components/chat/chat-rejection-flag";

import { listChatMessages, type ChatRole } from "@/lib/chat-api";

import { formatLocalDateTime } from "@/lib/format-local-datetime";
import { getToken } from "@/lib/auth";

import styles from "@/app/dashboard/dashboard.module.css";

import authStyles from "@/app/auth.module.css";



type ParticipantChatPanelProps = {

  role: ChatRole;

  room: ChatRoomListItem;

  pollMs?: number;

};



function mergeMessages(

  current: ChatMessageListItem[],

  incoming: ChatMessageListItem[],

) {

  const byId = new Map<string, ChatMessageListItem>();

  for (const message of current) {

    byId.set(message.id, message);

  }

  for (const message of incoming) {

    byId.set(message.id, message);

  }

  return [...byId.values()].sort(

    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),

  );

}



export function ParticipantChatPanel({

  role,

  room,

  pollMs = 10000,

}: ParticipantChatPanelProps) {

  const { t, locale } = useI18n();

  const [messages, setMessages] = useState<ChatMessageListItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);



  const loadMessages = useCallback(async () => {

    try {

      const token = getToken();

      if (!token) {

        throw new Error(t("chat.loadFailed"));

      }

      const data = await listChatMessages(role, room.id, token);

      setMessages((current) => mergeMessages(current, data.messages));

      setError(null);

    } catch (err) {

      setError(err instanceof Error ? err.message : t("chat.loadFailed"));

    } finally {

      setLoading(false);

    }

  }, [role, room.id, t]);



  useEffect(() => {

    void loadMessages();

    const timer = window.setInterval(() => {

      void loadMessages();

    }, pollMs);

    return () => window.clearInterval(timer);

  }, [loadMessages, pollMs]);



  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [messages]);



  const title = role === "donor" ? room.familyPublicCode : room.donorName;



  return (

    <div className={styles["chat-panel"]}>

      <div className={styles["chat-panel__header"]}>

        <h2 className={styles["chat-panel__title"]}>{title}</h2>

      </div>



      {error && (

        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>

          {error}

        </div>

      )}



      <div className={styles["chat-messages"]}>

        {loading && <p>{t("chat.loadingMessages")}</p>}

        {!loading && messages.length === 0 && (

          <p className={styles["empty-state"]}>{t("chat.noMessagesYet")}</p>

        )}

        {messages.map((message) => {

          const isMine = message.senderRole === role;

          const isRejected = isMine && message.status === "rejected";

          const rejectionReason = message.adminNotes?.trim();



          return (

            <div

              key={message.id}

              className={`${styles["chat-message"]} ${

                isMine

                  ? styles["chat-message--mine"]

                  : styles["chat-message--theirs"]

              }${isRejected ? ` ${styles["chat-message--rejected"]}` : ""}`}

            >

              {isRejected && (
                <div className={styles["chat-message__meta"]}>
                  <ChatRejectionFlag
                    reason={
                      rejectionReason
                        ? `${t("chat.rejectionReasonLabel")}: ${rejectionReason}`
                        : t("chat.rejectionReasonUnknown")
                    }
                  />
                </div>
              )}

              <ChatMessageBody
                message={message}
                documentLabel={t("chat.downloadDocument")}
              />
              <time
                className={styles["chat-message__time"]}
                dateTime={message.createdAt}
              >
                {formatLocalDateTime(message.createdAt, locale)}
              </time>

            </div>

          );

        })}

        <div ref={bottomRef} />

      </div>



      {room.canSend ? (

        <ChatComposer

          role={role}

          roomId={room.id}

          onMessageSent={(message) => {

            setMessages((current) => mergeMessages(current, [message]));

            setError(null);

          }}

          onError={setError}

        />

      ) : (

        <p className={styles["chat-closed-notice"]}>{t("chat.closedNotice")}</p>

      )}

    </div>

  );

}


