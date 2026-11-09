"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BotMessageSquare,
  LoaderCircle,
  Info,
  ShieldCheck,
  RotateCcw,
  Grip,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  assistantChatResponseSchema,
  assistantControlChanged,
  assistantControlPath,
  assistantStatusSchema,
  type AssistantStatus,
  type AssistantChatResponse,
  type AssistantChart as Chart,
} from "@purposemint/contracts";
import { AssistantChart } from "./assistant-chart";
import styles from "./assistant-launcher.module.css";
type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  charts?: Chart[];
};

function fitChatSize(
  width: number,
  height: number,
  right: number,
  bottom: number,
) {
  const maxWidth = right - 16;
  const maxHeight = bottom - 16;
  const minWidth = Math.min(440, window.innerWidth - 32, maxWidth);
  const minHeight = Math.min(
    620,
    window.innerHeight - (window.innerWidth <= 700 ? 108 : 124),
    maxHeight,
  );
  return {
    width: Math.max(minWidth, Math.min(maxWidth, width)),
    height: Math.max(minHeight, Math.min(maxHeight, height)),
  };
}

export function AssistantLauncher() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const conversationId = useRef<string | null>(null);
  const refreshStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await apiRequest(
        assistantControlPath + "/status",
        { signal },
        getToken(),
        assistantStatusSchema,
      );
      if (!signal?.aborted) setStatus(next);
    } catch {
      if (!signal?.aborted) setStatus(null);
    }
  }, []);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const resizeStart = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const info = useRef<HTMLDialogElement>(null);
  const infoButton = useRef<HTMLButtonElement>(null);

  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => {
    const element = conversation.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, pending, open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const load = () => void refreshStatus(controller.signal);
    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener(assistantControlChanged, load);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener(assistantControlChanged, load);
    };
  }, [open, refreshStatus]);

  async function requestAccess() {
    if (!input.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const next = await apiRequest(
        assistantControlPath + "/requests",
        {
          method: "POST",
          body: JSON.stringify({ note: input.trim() }),
        },
        getToken(),
        assistantStatusSchema,
      );
      setStatus(next);
      setInput("");
      window.dispatchEvent(new Event(assistantControlChanged));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to submit your request.",
      );
    } finally {
      setPending(false);
    }
  }

  const canChat = status?.access === "available";
  const canRequest =
    status && ["none", "denied", "revoked"].includes(status.access);
  const usage = status?.limitDollars
    ? Math.min(100, (status.usedDollars / status.limitDollars) * 100)
    : 0;

  function close() {
    resizeStart.current = null;
    info.current?.close();
    setOpen(false);
    launcher.current?.focus();
  }
  function reset() {
    request.current?.abort();
    setError(null);
    setMessages([]);
    conversationId.current = null;
    setPending(false);
    setInput("");
    field.current?.focus();
  }
  async function send() {
    const text = input.trim();
    if (!text || pending || !canChat) return;
    conversationId.current ??= crypto.randomUUID();
    const controller = new AbortController();
    request.current = controller;
    const updated: Message[] = [
      ...messages,
      { id: nextId.current++, role: "user", text },
    ];
    setMessages(updated);
    setInput("");
    setError(null);
    setPending(true);
    try {
      const result = await apiRequest<AssistantChatResponse>(
        "/admin/assistant/chat",
        {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            conversationId: conversationId.current,
            messages: updated.slice(-12).map((message) => ({
              role: message.role,
              content: message.text,
            })),
          }),
        },
        getToken(),
        assistantChatResponseSchema,
      );
      if (!controller.signal.aborted)
        setMessages((previous) => [
          ...previous,
          {
            id: nextId.current++,
            role: "assistant",
            text: result.text,
            charts: result.charts,
          },
        ]);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to send your message.",
        );
        setMessages((previous) =>
          previous.filter((message) => message.id !== updated.at(-1)?.id),
        );
        setInput(text);
      }
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
        void refreshStatus(controller.signal);
      }
    }
  }

  return (
    <>
      {open && (
        <section
          id="assistant-preview"
          className={styles.panel}
          style={size ? { width: size.width, height: size.height } : undefined}
          role="dialog"
          aria-label="PurposeMint assistant"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <button
            type="button"
            className={styles.resizeHandle}
            aria-label="Resize chat. Drag up or left to enlarge, or use arrow keys."
            title="Drag to resize · arrow keys to adjust · double-click to reset"
            onDoubleClick={() => setSize(null)}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              const rect =
                event.currentTarget.parentElement!.getBoundingClientRect();
              resizeStart.current = {
                x: event.clientX,
                y: event.clientY,
                width: rect.width,
                height: rect.height,
                maxWidth: rect.right - 16,
                maxHeight: rect.bottom - 16,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
              event.preventDefault();
            }}
            onPointerMove={(event) => {
              const start = resizeStart.current;
              if (!start) return;
              setSize(
                fitChatSize(
                  start.width + start.x - event.clientX,
                  start.height + start.y - event.clientY,
                  start.maxWidth + 16,
                  start.maxHeight + 16,
                ),
              );
            }}
            onPointerUp={() => {
              resizeStart.current = null;
            }}
            onPointerCancel={() => {
              resizeStart.current = null;
            }}
            onLostPointerCapture={() => {
              resizeStart.current = null;
            }}
            onKeyDown={(event) => {
              if (
                ![
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                ].includes(event.key)
              )
                return;
              event.preventDefault();
              if (event.key === "Home") {
                setSize(null);
                return;
              }
              const rect =
                event.currentTarget.parentElement!.getBoundingClientRect();
              const step = event.shiftKey ? 80 : 20;
              setSize(
                fitChatSize(
                  rect.width +
                    (event.key === "ArrowLeft"
                      ? step
                      : event.key === "ArrowRight"
                        ? -step
                        : 0),
                  rect.height +
                    (event.key === "ArrowUp"
                      ? step
                      : event.key === "ArrowDown"
                        ? -step
                        : 0),
                  rect.right,
                  rect.bottom,
                ),
              );
            }}
          >
            <Grip size={12} aria-hidden="true" />
          </button>
          <div className={styles.headerSection}>
            <header className={styles.header}>
              <BotMessageSquare size={21} aria-hidden="true" />
              <h2>PurposeMint assistant</h2>

              <button
                type="button"
                onClick={reset}
                title="New conversation"
                aria-label="New conversation"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                ref={infoButton}
                onClick={() => info.current?.showModal()}
                title="About the assistant"
                aria-label="About the assistant"
                aria-haspopup="dialog"
              >
                <Info size={17} />
              </button>
              <button
                type="button"
                onClick={close}
                title="Close assistant"
                aria-label="Close assistant"
              >
                <X size={18} />
              </button>
            </header>
            <div className={styles.budget}>
              <div className={styles.budgetLabel}>
                <span>Monthly AI budget</span>
                <span>
                  {status?.limitDollars
                    ? `$${status.usedDollars.toFixed(3)} / $${status.limitDollars.toFixed(2)}`
                    : "—"}
                </span>
              </div>
              <div
                className={styles.budgetTrack}
                role="progressbar"
                aria-label="Monthly AI budget usage"
                aria-valuenow={usage}
              >
                <div
                  className={styles.budgetFill}
                  style={{ width: usage + "%" }}
                />
              </div>
            </div>
          </div>
          <dialog
            ref={info}
            className={styles.infoDialog}
            aria-labelledby="assistant-info-title"
            onClose={() => infoButton.current?.focus()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <div className={styles.infoHeading}>
              <h3 id="assistant-info-title">About the AI assistant</h3>
              <button
                type="button"
                aria-label="Close assistant information"
                onClick={() => info.current?.close()}
              >
                <X size={18} />
              </button>
            </div>
            <h4>What it helps with</h4>
            <p>
              Explore customer activity, business operations, and reports, and
              turn results into charts. The assistant uses your existing
              permissions to access data. Review important figures and decisions
              against the source records.
            </p>
            <h4>Requesting access</h4>
            <p>
              Submit an access request here with a short note. Your Super Admin
              will review it and set your monthly AI allowance.
            </p>
            <h4>Prompts and activity</h4>
            <p>
              Your prompts and answers are recorded with your account and the
              time they are submitted. Data lookups are also logged for
              accountability and review by Super Admins. Do not share passwords,
              API keys, or other secrets in the chat.
            </p>
          </dialog>
          <div
            ref={conversation}
            className={styles.conversation}
            role="log"
            aria-label="Assistant conversation"
            aria-live="polite"
            aria-relevant="additions"
          >
            {!messages.length && (
              <div className={styles.welcome}>
                <BotMessageSquare
                  size={32}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3>
                  {canChat
                    ? "What would you like to explore?"
                    : "PurposeMint assistant"}
                </h3>
                <p>
                  {canChat
                    ? "Ask about customers, savings, operations, or reports."
                    : status?.access === "pending"
                      ? "Your access request is awaiting review."
                      : status?.access === "paused"
                        ? "Your AI budget is currently paused. Contact your Super Admin."
                        : canRequest
                          ? "Tell your Super Admin how you plan to use the assistant."
                          : "Checking assistant access…"}
                </p>
                <p className={styles.auditNotice}>
                  <ShieldCheck size={14} aria-hidden="true" /> Your prompts are
                  logged for audit. Don’t include passwords or other secrets.
                </p>
              </div>
            )}
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className={styles.userMessage}>
                  <span className={styles.speaker}>You</span>
                  <p>{message.text}</p>
                </div>
              ) : (
                <article key={message.id} className={styles.reply}>
                  <span className={styles.speaker}>PurposeMint</span>
                  <p style={{ whiteSpace: "pre-wrap" }}>{message.text}</p>
                  {message.charts?.map((chart, index) => (
                    <AssistantChart key={index} chart={chart} />
                  ))}
                </article>
              ),
            )}
            {pending && (
              <div className={styles.pending} role="status">
                <LoaderCircle size={16} aria-hidden="true" />
                Thinking...
              </div>
            )}
          </div>
          {error && (
            <p role="alert" className={styles.reply}>
              {error}
            </p>
          )}
          {(canChat || canRequest) && (
            <form
              className={styles.composer}
              onSubmit={(event) => {
                event.preventDefault();
                if (canChat) void send();
                else void requestAccess();
              }}
            >
              <textarea
                ref={field}
                aria-label={
                  canChat ? "Message assistant" : "Access request note"
                }
                placeholder={
                  canChat ? "Ask PurposeMint..." : "Why do you need access?"
                }
                value={input}
                maxLength={canChat ? 2000 : 1000}
                rows={2}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    canChat &&
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || pending}
                aria-label={canChat ? "Send message" : "Request access"}
                title={canChat ? "Send message" : "Request access"}
              >
                <ArrowUp size={20} />
              </button>
            </form>
          )}
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        className={styles.launcher}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        aria-expanded={open}
        aria-controls="assistant-preview"
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
        title="AI assistant"
      >
        {open ? (
          <X size={26} aria-hidden="true" />
        ) : (
          <BotMessageSquare size={28} strokeWidth={1.7} aria-hidden="true" />
        )}
      </button>
    </>
  );
}
