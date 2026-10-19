"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  SupportCasePriority,
  SupportCaseType,
  adminUsersResponseSchema,
  supportCaseCategoriesResponseSchema,
  supportCaseCreateSchema,
  supportCaseDetailSchema,
  supportCasePriorityValues,
  type SupportCaseDetail,
} from "@purposemint/contracts";
import { Dialog } from "@/components/common/dialog";
import { formatEnum } from "@/lib/admin-format";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useAdminQuery } from "@/lib/use-admin-query";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./support-cases.module.css";
import { useStaffOptions } from "./shared";

export function CreateCaseDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (created: SupportCaseDetail) => void;
}) {
  return (
    <Dialog open={open} title="New case" onClose={onClose}>
      <CreateCaseForm onClose={onClose} onCreated={onCreated} />
    </Dialog>
  );
}

function CreateCaseForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (created: SupportCaseDetail) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [type, setType] = useState<string>(SupportCaseType.SUPPORT);
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<string>(SupportCasePriority.NORMAL);
  const [assigneeId, setAssigneeId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usersPath = useMemo(
    () => `/admin/users?pageSize=10&search=${encodeURIComponent(search)}`,
    [search],
  );
  const users = useAdminQuery(usersPath, adminUsersResponseSchema);
  const categories = useAdminQuery(
    "/admin/support-cases/categories",
    supportCaseCategoriesResponseSchema,
  );
  const { staff } = useStaffOptions();
  const activeCategories = (categories.data?.items ?? []).filter(
    (category) => category.active,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = supportCaseCreateSchema.safeParse({
      userId,
      type,
      categoryId,
      priority,
      subject,
      description,
      ...(assigneeId ? { assigneeId } : {}),
    });
    if (!parsed.success) {
      setError(
        !userId
          ? "Choose a customer."
          : !categoryId
            ? "Choose a category."
            : (parsed.error.issues[0]?.message ??
              "Check the form and try again."),
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await apiRequest(
        "/admin/support-cases",
        { method: "POST", body: JSON.stringify(parsed.data) },
        getToken(),
        supportCaseDetailSchema,
      );
      onCreated(created);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The case could not be created.",
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
      <div className={styles["form-pair"]}>
        <label>
          Find customer
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setUserId("");
                setSearch(searchInput.trim());
              }
            }}
            placeholder="Name or email, then press Enter"
          />
        </label>
        <label>
          Customer
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={users.loading}
          >
            <option value="">
              {users.loading ? "Searching…" : "Select a customer"}
            </option>
            {(users.data?.items ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} · {user.email}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles["form-pair"]}>
        <label>
          Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value={SupportCaseType.SUPPORT}>Support request</option>
            <option value={SupportCaseType.COMPLAINT}>Complaint</option>
          </select>
        </label>
        <label>
          Category
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">
              {categories.loading
                ? "Loading categories…"
                : activeCategories.length
                  ? "Select a category"
                  : "No categories available"}
            </option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles["form-pair"]}>
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
        <label>
          Assign to
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Subject
        <input
          value={subject}
          maxLength={200}
          onChange={(event) => setSubject(event.target.value)}
        />
      </label>
      <label>
        Description
        <textarea
          className={styles["form-textarea"]}
          value={description}
          maxLength={5000}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {categories.error ? (
        <div className={base["inline-error"]} role="alert">
          Categories could not be loaded: {categories.error}
        </div>
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
          {saving ? "Creating…" : "Create case"}
        </button>
      </div>
    </form>
  );
}
