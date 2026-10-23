"use client";

import { useState, type FormEvent } from "react";
import {
  supportCaseAssignSchema,
  supportCaseCategoriesResponseSchema,
  supportCaseEscalateSchema,
  supportCaseMessageSchema,
  supportCaseNoteSchema,
  supportCasePriorityValues,
  supportCaseResolveSchema,
  supportCaseTypeValues,
  supportCaseUpdateSchema,
  type SupportCaseDetail,
} from "@purposemint/contracts";
import { Dialog } from "@/components/common/dialog";
import { formatEnum } from "@/lib/admin-format";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useAdminQuery } from "@/lib/use-admin-query";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./support-cases.module.css";
import { postCaseAction, useStaffOptions } from "./shared";

export type CaseDialogKind =
  "assign" | "classify" | "note" | "escalate" | "resolve" | "message";

const TITLES: Record<CaseDialogKind, string> = {
  assign: "Assign case",
  classify: "Type, category, and priority",
  note: "Add internal note",
  escalate: "Escalate case",
  resolve: "Record resolution",
  message: "Email customer",
};

export function CaseDialog({
  kind,
  caseItem,
  onClose,
  onDone,
}: {
  kind: CaseDialogKind | null;
  caseItem: SupportCaseDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Dialog
      open={kind !== null}
      title={kind ? TITLES[kind] : ""}
      onClose={onClose}
    >
      {kind ? (
        <CaseDialogForm
          kind={kind}
          caseItem={caseItem}
          onClose={onClose}
          onDone={onDone}
        />
      ) : null}
    </Dialog>
  );
}

function CaseDialogForm({
  kind,
  caseItem,
  onClose,
  onDone,
}: {
  kind: CaseDialogKind;
  caseItem: SupportCaseDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [subject, setSubject] = useState(
    `Re: ${caseItem.subject}`.slice(0, 150),
  );
  const [assigneeId, setAssigneeId] = useState(caseItem.assignee?.id ?? "");
  const [type, setType] = useState<string>(caseItem.type);
  const [categoryId, setCategoryId] = useState(caseItem.category.id);
  const [priority, setPriority] = useState<string>(caseItem.priority);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { staff } = useStaffOptions();
  const categories = useAdminQuery(
    "/admin/support-cases/categories",
    supportCaseCategoriesResponseSchema,
  );

  const needsText =
    kind === "note" ||
    kind === "escalate" ||
    kind === "resolve" ||
    kind === "message";
  const textLabel =
    kind === "escalate"
      ? "Reason for escalation"
      : kind === "resolve"
        ? "Resolution"
        : kind === "message"
          ? "Message"
          : "Note";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const id = caseItem.id;
    const nextAssignee = assigneeId || null;
    let run: (() => Promise<unknown>) | null = null;
    let failure: string | undefined;

    if (kind === "assign") {
      const parsed = supportCaseAssignSchema.safeParse({
        assigneeId: nextAssignee,
      });
      if (parsed.success) run = () => postCaseAction(id, "assign", parsed.data);
    } else if (kind === "note") {
      const parsed = supportCaseNoteSchema.safeParse({ body: text });
      if (parsed.success) run = () => postCaseAction(id, "notes", parsed.data);
      else failure = "Write a note before saving.";
    } else if (kind === "escalate") {
      const parsed = supportCaseEscalateSchema.safeParse({
        reason: text,
        ...(assigneeId && assigneeId !== caseItem.assignee?.id
          ? { assigneeId }
          : {}),
      });
      if (parsed.success)
        run = () => postCaseAction(id, "escalate", parsed.data);
      else failure = "Explain why this case is being escalated.";
    } else if (kind === "resolve") {
      const parsed = supportCaseResolveSchema.safeParse({ resolution: text });
      if (parsed.success)
        run = () => postCaseAction(id, "resolve", parsed.data);
      else failure = "Describe how the case was resolved.";
    } else if (kind === "message") {
      const parsed = supportCaseMessageSchema.safeParse({
        subject,
        body: text,
      });
      if (parsed.success)
        run = () => postCaseAction(id, "messages", parsed.data);
      else failure = "Enter a subject and a message.";
    } else {
      const changes = {
        ...(type !== caseItem.type ? { type } : {}),
        ...(categoryId !== caseItem.category.id ? { categoryId } : {}),
        ...(priority !== caseItem.priority ? { priority } : {}),
      };
      const parsed = supportCaseUpdateSchema.safeParse(changes);
      if (parsed.success) {
        run = () =>
          apiRequest(
            `/admin/support-cases/${id}`,
            { method: "PATCH", body: JSON.stringify(parsed.data) },
            getToken(),
          );
      } else failure = "Change at least one field.";
    }

    if (!run) {
      setError(failure ?? "Check the form and try again.");
      return;
    }
    setSaving(true);
    try {
      await run();
      onDone();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "That could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={`${base["editor-form"]} ${styles["dialog-form"]}`}
      onSubmit={submit}
      noValidate
    >
      {kind === "message" ? (
        <>
          <p className={styles.muted}>
            Sent to {caseItem.customer.email} and recorded in the case history.
          </p>
          <label>
            Subject
            <input
              value={subject}
              maxLength={150}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
        </>
      ) : null}
      {kind === "assign" || kind === "escalate" ? (
        <label>
          {kind === "escalate" ? "Reassign to (optional)" : "Assignee"}
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            <option value="">
              {kind === "escalate" ? "Keep current assignee" : "Unassigned"}
            </option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {kind === "classify" ? (
        <>
          <div className={styles["form-pair"]}>
            <label>
              Type
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {supportCaseTypeValues.map((value) => (
                  <option key={value} value={value}>
                    {formatEnum(value)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {supportCasePriorityValues.map((value) => (
                  <option key={value} value={value}>
                    {formatEnum(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Category
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {(categories.data?.items ?? [])
                .filter(
                  (category) =>
                    category.active || category.id === caseItem.category.id,
                )
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
            </select>
          </label>
        </>
      ) : null}
      {needsText ? (
        <label>
          {textLabel}
          <textarea
            className={styles["form-textarea"]}
            value={text}
            maxLength={5000}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
      ) : null}
      {error ? (
        <div className={base["inline-error"]} role="alert">
          {error}
        </div>
      ) : null}
      <div className={base["modal-actions"]}>
        <button
          type="button"
          className={base["modal-btn-cancel"]}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={base["modal-btn-confirm"]}
          disabled={saving}
        >
          {saving ? "Saving…" : kind === "message" ? "Send email" : "Save"}
        </button>
      </div>
    </form>
  );
}
