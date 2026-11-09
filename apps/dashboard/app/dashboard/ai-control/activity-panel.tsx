"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw, X } from "lucide-react";
import {
  assistantControlPath,
  assistantTranscriptSchema,
  type AssistantControl,
  type AssistantTranscript,
} from "@purposemint/contracts";
import { AssistantChart } from "@/components/dashboard/assistant-chart";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "./ai-control.module.css";

type Staff = AssistantControl["admins"][number];
type Sides = { prompts: boolean; answers: boolean };
type Filters = Sides & { from: string; to: string; search: string };
const dateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";

function MessageOptions({
  value,
  onChange,
}: {
  value: Sides;
  onChange: (value: Sides) => void;
}) {
  return (
    <fieldset className={styles.messageOptions}>
      <legend>Include in transcript</legend>
      {(["prompts", "answers"] as const).map((side) => (
        <label key={side}>
          <input
            type="checkbox"
            checked={value[side]}
            disabled={value[side] && !(value.prompts && value.answers)}
            onChange={(event) =>
              onChange({ ...value, [side]: event.target.checked })
            }
          />
          {side === "prompts" ? "Prompts" : "Answers"}
        </label>
      ))}
    </fieldset>
  );
}

function Transcript({
  admin,
  filters,
  close,
}: {
  admin: Staff;
  filters: Filters;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sides, setSides] = useState<Sides>({
    prompts: filters.prompts,
    answers: filters.answers,
  });
  const [result, setResult] = useState<AssistantTranscript | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      ...filters,
      ...sides,
      cursor,
      searchPrompts: filters.prompts,
      searchAnswers: filters.answers,
    })) {
      if (value !== "" && value !== null) params.set(key, String(value));
    }
    void apiRequest(
      assistantControlPath + "/activity/" + admin.id + "?" + params,
      { signal: controller.signal },
      getToken(),
      assistantTranscriptSchema,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setError("");
          setResult((previous) =>
            cursor && previous
              ? { ...data, turns: [...previous.turns, ...data.turns] }
              : data,
          );
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load this transcript.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [admin.id, filters, sides, cursor, retry]);

  const conversations = new Map<string, AssistantTranscript["turns"]>();
  for (const turn of result?.turns ?? []) {
    const turns = conversations.get(turn.conversationId) ?? [];
    turns.push(turn);
    conversations.set(turn.conversationId, turns);
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      onClose={close}
      aria-labelledby="transcript-title"
    >
      <header className={styles.cardHeading}>
        <div>
          <p className={styles.kicker}>ASSISTANT ACTIVITY</p>
          <h2 id="transcript-title">{admin.name}</h2>
          <p>{admin.role}</p>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Close transcript"
          onClick={() => dialog.current?.close()}
        >
          <X size={19} />
        </button>
      </header>
      <MessageOptions
        value={sides}
        onChange={(value) => {
          setResult(null);
          setError("");
          setCursor(null);
          setSides(value);
        }}
      />
      {filters.search && (
        <p className={styles.muted}>
          Search term: <strong>{filters.search}</strong>
          {" · Matched in "}
          {filters.prompts && filters.answers
            ? "prompts and answers"
            : filters.prompts
              ? "prompts"
              : "answers"}
        </p>
      )}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setRetry(retry + 1);
            }}
          >
            Retry
          </button>
        </p>
      ) : !result ? (
        <p role="status" className={styles.muted}>
          Loading transcript…
        </p>
      ) : !conversations.size ? (
        <p className={styles.empty}>No messages match these filters.</p>
      ) : (
        Array.from(conversations, ([id, turns]) => (
          <section key={id} className={styles.transcript}>
            <h3>Conversation · {dateTime(turns.at(-1)!.at)}</h3>
            {[...turns].reverse().map((turn) => (
              <article key={turn.id}>
                <time dateTime={turn.at}>{dateTime(turn.at)}</time>
                {turn.prompt !== null && (
                  <div>
                    <strong>Prompt</strong>
                    <p>{turn.prompt}</p>
                  </div>
                )}
                {turn.answer !== null && (
                  <div>
                    <strong>Answer</strong>
                    <p>{turn.answer}</p>
                    {turn.charts?.map((chart, index) => (
                      <AssistantChart key={index} chart={chart} />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        ))
      )}
      {result?.next && !error && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setCursor(result.next);
          }}
        >
          Load older messages
        </button>
      )}
    </dialog>
  );
}

export function ActivityPanel({
  admins,
  reload,
  refreshing,
}: {
  admins: Staff[];
  reload: () => void;
  refreshing: boolean;
}) {
  const [filters, setFilters] = useState<Filters>({
    prompts: true,
    answers: true,
    from: "",
    to: "",
    search: "",
  });
  const [open, setOpen] = useState<{ admin: Staff; filters: Filters } | null>(
    null,
  );
  const invalidDates = !!(
    filters.from &&
    filters.to &&
    filters.from > filters.to
  );
  const sorted = [...admins].sort(
    (a, b) =>
      (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "") ||
      a.name.localeCompare(b.name),
  );

  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <div>
          <h2>Assistant activity</h2>
          <p>Choose an administrator to review their conversations.</p>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={reload}
          disabled={refreshing}
          aria-label="Reload activity"
          title="Reload activity"
        >
          <RotateCw size={17} />
        </button>
      </div>
      <div className={styles.filters}>
        <label>
          From (UTC)
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </label>
        <label>
          Through (UTC)
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </label>
        <label>
          Search messages
          <input
            type="search"
            value={filters.search}
            maxLength={200}
            placeholder="Enter a word or phrase"
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
      </div>
      <MessageOptions
        value={filters}
        onChange={(value) => setFilters({ ...filters, ...value })}
      />
      {invalidDates && (
        <p role="alert" className={styles.error}>
          The start date must come before or match the end date.
        </p>
      )}
      <ul className={styles.staffList}>
        {sorted.map((admin) => (
          <li key={admin.id}>
            <button
              type="button"
              className={styles.staffButton}
              disabled={invalidDates}
              onClick={() => setOpen({ admin, filters })}
            >
              <span>
                <strong>{admin.name}</strong>
                <small>{admin.role}</small>
              </span>
              <small>
                {admin.lastActivity
                  ? dateTime(admin.lastActivity)
                  : "No activity yet"}
              </small>
            </button>
          </li>
        ))}
      </ul>
      {!sorted.length && (
        <p className={styles.empty}>No administrators have access yet.</p>
      )}
      {open && (
        <Transcript
          admin={open.admin}
          filters={open.filters}
          close={() => setOpen(null)}
        />
      )}
    </section>
  );
}
