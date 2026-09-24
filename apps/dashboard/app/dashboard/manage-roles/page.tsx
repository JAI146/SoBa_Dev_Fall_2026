"use client";

import {
  AdminRole,
  adminCustomRolesResponseSchema,
  adminPermissionValues,
  adminUsersResponseSchema,
  type AdminRoleValue,
} from "@purposemint/contracts";
import { type FormEvent, useMemo, useState } from "react";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { formatAdminDate, formatEnum } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "../dashboard.module.css";

const roleLabels: Record<AdminRoleValue, string> = {
  [AdminRole.SUPER_ADMIN]: "Super Admin",
  [AdminRole.MANAGER]: "Manager",
  [AdminRole.AUDITOR]: "Auditor",
  [AdminRole.EDITOR]: "Editor",
  [AdminRole.SUPPORT]: "Support",
};

const roleOrder: AdminRoleValue[] = [
  AdminRole.SUPER_ADMIN,
  AdminRole.MANAGER,
  AdminRole.AUDITOR,
  AdminRole.EDITOR,
  AdminRole.SUPPORT,
];

function formatPermission(permission: string) {
  return permission
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" · ");
}

export default function ManageRolesPage() {
  const [page, setPage] = useState(1);
  const [assignments, setAssignments] = useState<
    Record<string, { role: AdminRoleValue | "customer" }>
  >({});
  const path = useMemo(
    () => `/admin/users?page=${page}&pageSize=20`,
    [page],
  );
  const query = useAdminQuery(path, adminUsersResponseSchema);
  const customRolesQuery = useAdminQuery(
    "/admin/roles",
    adminCustomRolesResponseSchema,
  );
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);

  async function createCustomRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleSaving(true);
    setRoleMessage(null);
    try {
      await apiRequest(
        "/admin/roles",
        {
          method: "POST",
          body: JSON.stringify({
            name: roleName,
            description: roleDescription,
            permissions: selectedPermissions,
          }),
        },
        getToken(),
      );
      setRoleName("");
      setRoleDescription("");
      setSelectedPermissions([]);
      setRoleMessage("Custom role created.");
      void customRolesQuery.reload();
    } catch (cause) {
      setRoleMessage(
        cause instanceof Error ? cause.message : "The role could not be created.",
      );
    } finally {
      setRoleSaving(false);
    }
  }

  function updateAssignment(
    userId: string,
    role: AdminRoleValue | "customer",
  ) {
    setAssignments((current) => ({
      ...current,
      [userId]: {
        role,
      },
    }));
  }

  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading users and role assignments…" />;

  const data = query.data;

  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Administration</p>
          <h1>Manage roles</h1>
          <p>Assign a draft role to each user. Access is determined by the role.</p>
        </div>
      </div>

      <div className={styles["notice-banner"]} role="status">
        Role selections are currently a local preview. Each role has its own
        access permissions.
      </div>

      <section className={styles["crud-card"]}>
        <div className={styles["card-heading"]}>
          <div>
            <p className={styles.eyebrow}>Custom access</p>
            <h2>Create custom role</h2>
          </div>
        </div>
        <form className={styles["role-form"]} onSubmit={createCustomRole}>
          <label>
            <span>Role name</span>
            <input
              required
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              placeholder="For example, Financial Reviewer"
            />
          </label>
          <label>
            <span>Description</span>
            <textarea
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
              placeholder="Describe what this role is for"
              rows={2}
            />
          </label>
          <fieldset className={styles["permission-options"]}>
            <legend>Permissions</legend>
            {adminPermissionValues.map((permission) => (
              <label key={permission}>
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission)}
                  onChange={(event) =>
                    setSelectedPermissions((current) =>
                      event.target.checked
                        ? [...current, permission]
                        : current.filter((item) => item !== permission),
                    )
                  }
                />
                {formatPermission(permission)}
              </label>
            ))}
          </fieldset>
          <div className={styles["form-actions"]}>
            <button
              type="submit"
              disabled={roleSaving || selectedPermissions.length === 0}
            >
              {roleSaving ? "Creating…" : "Create role"}
            </button>
            {roleMessage ? <span>{roleMessage}</span> : null}
          </div>
        </form>
      </section>

      <section className={styles["crud-card"]}>
        <div className={styles["table-wrap"]}>
          <table className={styles["data-table"]}>
            <thead>
              <tr>
                <th>User</th>
                <th>Current status</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => {
                const assignment = assignments[user.id] ?? {
                  role: "customer" as const,
                };
                return (
                  <tr key={user.id}>
                    <td>
                      <strong>
                        {user.displayName ?? `${user.firstName} ${user.lastName}`}
                      </strong>
                      <span>{user.email}</span>
                    </td>
                    <td>
                      <span className={styles.badge}>{formatEnum(user.status)}</span>
                      <span>{formatAdminDate(user.createdAt, user.timeZone)}</span>
                    </td>
                    <td>
                      <label className={styles["table-select-label"]}>
                        <span className="sr-only">Role for {user.email}</span>
                        <select
                          value={assignment.role}
                          onChange={(event) =>
                            updateAssignment(
                              user.id,
                              event.target.value as AdminRoleValue | "customer",
                            )
                          }
                        >
                          <option value="customer">Customer</option>
                          {roleOrder.map((role) => (
                            <option value={role} key={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <span>{data.total.toLocaleString()} users</span>
          <div>
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {customRolesQuery.data?.items.length ? (
        <section className={styles["crud-card"]}>
          <div className={styles["card-heading"]}>
            <div>
              <p className={styles.eyebrow}>Saved roles</p>
              <h2>Custom roles</h2>
            </div>
          </div>
          <div className={styles["permission-list"]}>
            {customRolesQuery.data.items.map((role) => (
              <div className={styles["custom-role-card"]} key={role.id}>
                <strong>{role.name}</strong>
                <span>{role.description || "No description"}</span>
                <small>{role.permissions.map(formatPermission).join(", ")}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

    </main>
  );
}
