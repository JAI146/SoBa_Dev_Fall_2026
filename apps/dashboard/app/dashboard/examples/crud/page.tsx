"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ConfirmModal } from "@/components/common/confirm-modal";
import { Dialog } from "@/components/common/dialog";
import { ListToolbar } from "@/components/common/list-toolbar";
import {
  EditIcon,
  EyeIcon,
  TrashIcon,
} from "@/components/common/table-action-icons";
import { PlusIcon, SearchIcon } from "@/components/dashboard/action-icons";
import { downloadCsv } from "@/lib/export-csv";
import styles from "../../dashboard.module.css";

type MemberStatus = "Active" | "Invited" | "Inactive";
type Member = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
  joined: string;
};

type EditorMode = "create" | "edit" | "view";
type MemberForm = Omit<Member, "id">;

const initialMembers: Member[] = [
  {
    id: 1,
    name: "Aisha Khan",
    email: "aisha@example.com",
    role: "Owner",
    status: "Active",
    joined: "2026-06-18",
  },
  {
    id: 2,
    name: "Omar Siddiqui",
    email: "omar@example.com",
    role: "Editor",
    status: "Active",
    joined: "2026-06-21",
  },
  {
    id: 3,
    name: "Sara Ahmed",
    email: "sara@example.com",
    role: "Viewer",
    status: "Invited",
    joined: "2026-06-24",
  },
  {
    id: 4,
    name: "Bilal Noor",
    email: "bilal@example.com",
    role: "Editor",
    status: "Inactive",
    joined: "2026-06-29",
  },
  {
    id: 5,
    name: "Hira Malik",
    email: "hira@example.com",
    role: "Viewer",
    status: "Active",
    joined: "2026-07-02",
  },
  {
    id: 6,
    name: "Zain Ali",
    email: "zain@example.com",
    role: "Editor",
    status: "Active",
    joined: "2026-07-05",
  },
  {
    id: 7,
    name: "Mariam Raza",
    email: "mariam@example.com",
    role: "Viewer",
    status: "Invited",
    joined: "2026-07-08",
  },
  {
    id: 8,
    name: "Hamza Iqbal",
    email: "hamza@example.com",
    role: "Viewer",
    status: "Active",
    joined: "2026-07-11",
  },
];

const emptyForm: MemberForm = {
  name: "",
  email: "",
  role: "Viewer",
  status: "Invited",
  joined: new Date().toISOString().slice(0, 10),
};

const PAGE_SIZE = 5;

export default function CrudReferencePage() {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"All" | MemberStatus>("All");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{
    mode: EditorMode;
    memberId?: number;
  } | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => {
      const matchesStatus = status === "All" || member.status === status;
      const matchesSearch =
        !term ||
        [member.name, member.email, member.role].some((value) =>
          value.toLowerCase().includes(term),
        );
      return matchesStatus && matchesSearch;
    });
  }, [members, search, status]);

  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageMembers = filteredMembers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedMember = editor?.memberId
    ? members.find((member) => member.id === editor.memberId)
    : undefined;

  function openCreate() {
    setForm({ ...emptyForm, joined: new Date().toISOString().slice(0, 10) });
    setEditor({ mode: "create" });
  }

  function openMember(member: Member, mode: "view" | "edit") {
    setForm({
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      joined: member.joined,
    });
    setEditor({ mode, memberId: member.id });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editor?.mode === "create") {
      const nextId = Math.max(0, ...members.map((member) => member.id)) + 1;
      setMembers((current) => [{ id: nextId, ...form }, ...current]);
      setPage(1);
    } else if (editor?.mode === "edit" && editor.memberId) {
      setMembers((current) =>
        current.map((member) =>
          member.id === editor.memberId ? { id: member.id, ...form } : member,
        ),
      );
    }
    setEditor(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setMembers((current) =>
      current.filter((member) => member.id !== deleteTarget.id),
    );
    setDeleteTarget(null);
  }

  function resetDemo() {
    setMembers(initialMembers);
    setSearch("");
    setStatus("All");
    setPage(1);
  }

  function exportMembers() {
    downloadCsv(
      "purposemint-members.csv",
      ["Name", "Email", "Role", "Status", "Joined"],
      filteredMembers.map((member) => [
        member.name,
        member.email,
        member.role,
        member.status,
        member.joined,
      ]),
    );
  }

  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Example</p>
          <h1>CRUD Reference</h1>
          <p>
            A local-only implementation showing reusable list and record
            patterns.
          </p>
        </div>
        <div className={styles["page-actions-group"]}>
          <button
            type="button"
            className={styles["btn-primary"]}
            onClick={openCreate}
          >
            <PlusIcon /> Add member
          </button>
          <ListToolbar
            onRefresh={resetDemo}
            onExport={exportMembers}
            exportDisabled={!filteredMembers.length}
          />
        </div>
      </div>

      <section className={styles["crud-card"]}>
        <div className={styles.filters}>
          <label className={styles["search-field"]}>
            <span className="sr-only">Search members</span>
            <SearchIcon />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, or role"
            />
          </label>
          <label className={styles["filter-field"]}>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "All" | MemberStatus);
                setPage(1);
              }}
            >
              <option>All</option>
              <option>Active</option>
              <option>Invited</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>

        <div className={styles["table-wrap"]}>
          <table className={styles["data-table"]}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                  </td>
                  <td>{member.role}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${styles[`badge-${member.status.toLowerCase()}`]}`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                    }).format(new Date(`${member.joined}T00:00:00`))}
                  </td>
                  <td>
                    <div className={styles["row-actions"]}>
                      <button
                        type="button"
                        onClick={() => openMember(member, "view")}
                        aria-label={`View ${member.name}`}
                      >
                        <EyeIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => openMember(member, "edit")}
                        aria-label={`Edit ${member.name}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() => setDeleteTarget(member)}
                        aria-label={`Delete ${member.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pageMembers.length && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No members match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>
            {filteredMembers.length} record
            {filteredMembers.length === 1 ? "" : "s"}
          </span>
          <div>
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span>
              Page {safePage} of {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage === pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <Dialog
        open={Boolean(editor)}
        title={
          editor?.mode === "create"
            ? "Add member"
            : editor?.mode === "edit"
              ? "Edit member"
              : "Member details"
        }
        onClose={() => setEditor(null)}
      >
        {editor?.mode === "view" && selectedMember ? (
          <div className={styles["detail-grid"]}>
            <div>
              <span>Name</span>
              <strong>{selectedMember.name}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{selectedMember.email}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{selectedMember.role}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{selectedMember.status}</strong>
            </div>
            <div>
              <span>Joined</span>
              <strong>{selectedMember.joined}</strong>
            </div>
            <div className={styles["modal-actions"]}>
              <button
                type="button"
                className={styles["modal-btn-confirm"]}
                onClick={() => openMember(selectedMember, "edit")}
              >
                Edit member
              </button>
            </div>
          </div>
        ) : editor ? (
          <form onSubmit={handleSubmit} className={styles["editor-form"]}>
            <label>
              <span>Name</span>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label>
              <span>Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>
            <div className={styles["form-row"]}>
              <label>
                <span>Role</span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value })
                  }
                >
                  <option>Owner</option>
                  <option>Editor</option>
                  <option>Viewer</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as MemberStatus,
                    })
                  }
                >
                  <option>Active</option>
                  <option>Invited</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>
            <label>
              <span>Joined</span>
              <input
                required
                type="date"
                value={form.joined}
                onChange={(event) =>
                  setForm({ ...form, joined: event.target.value })
                }
              />
            </label>
            <div className={styles["modal-actions"]}>
              <button
                type="button"
                className={styles["modal-btn-cancel"]}
                onClick={() => setEditor(null)}
              >
                Cancel
              </button>
              <button type="submit" className={styles["modal-btn-confirm"]}>
                {editor.mode === "create" ? "Add member" : "Save changes"}
              </button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete member?"
        message={`${deleteTarget?.name ?? "This member"} will be removed from the local demo data.`}
        confirmLabel="Delete member"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
